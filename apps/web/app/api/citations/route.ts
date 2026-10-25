import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadJurisdictionExcerpts } from "@/lib/legalSources";

export const runtime = "nodejs";

// what the graph sends us when they click explain or when it first loads
const requestSchema = z.object({
  action: z.enum(["match", "explain"]).optional(),
  config: z.object({
    projectType: z.enum(["food_business", "room_addition", "public_event", "commercial_renovation", "storefront_business"]),
    state: z.string().regex(/^[a-zA-Z]{2}$/).optional(),
    useCase: z.string().max(160).optional(),
    squareFootage: z.number().finite().nonnegative().max(1e10),
    homeBased: z.boolean().optional(),
    foodPreparation: z.boolean().optional(),
    personalCare: z.boolean().optional(),
    changingSpace: z.boolean().optional(),
    publicAttendance: z.boolean().optional(),
  }),
  stepIds: z.array(z.string().min(1).max(100)).max(60),
  stepTitle: z.string().max(300).optional(),
  citationQuote: z.string().max(6000).optional(),
});
type MatchRequest = z.infer<typeof requestSchema>;
const citationSchema = z.object({
  stepId: z.string().max(100), code: z.string().max(300), title: z.string().max(500),
  quote: z.string().max(6000),
  url: z.string().url().max(2048).refine((url) => /^https?:\/\//i.test(url)).nullable(),
});
const followUpSchema = z.object({ title: z.string().max(300), detail: z.string().max(2000) });

const MAX_REQUEST_BYTES = 32_768;
const quotas = new Map<string, { count: number; resetAt: number }>();
const QUOTA_WINDOW_MS = 60_000;
const QUOTA_REQUESTS = 10;
const MAX_QUOTA_USERS = 2048;

async function readBoundedBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(body));
}

async function verifiedCloudUser(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!token || token.length > 8192 || !url || !key) return null;
  try {
    const client = createClient(url.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, ""), key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    // getUser validates the token with Supabase; decoding a supplied JWT is insufficient.
    const { data, error } = await client.auth.getUser(token);
    return !error && data.user ? data.user.id : null;
  } catch { return null; }
}

function takeQuota(userId: string): number {
  const now = Date.now();
  for (const [id, quota] of quotas) if (quota.resetAt <= now) quotas.delete(id);
  let quota = quotas.get(userId);
  if (!quota) {
    // Do not evict live quotas and accidentally allow a requester to reset limits.
    if (quotas.size >= MAX_QUOTA_USERS) return 60;
    quota = { count: 0, resetAt: now + QUOTA_WINDOW_MS };
    quotas.set(userId, quota);
  }
  if (quota.count >= QUOTA_REQUESTS) return Math.max(1, Math.ceil((quota.resetAt - now) / 1000));
  quota.count += 1;
  return 0;
}

function localResponse(payload: MatchRequest, state: string, note: string) {
  return NextResponse.json(payload.action === "explain"
    ? { explanation: localExplanation(payload, state), modelUsed: false, note }
    : { citations: [], followUps: [], modelUsed: false, note },
  { headers: { "Cache-Control": "no-store" } });
}

const CLAUDE_MODELS = ["claude-sonnet-4-5", "claude-haiku-4-5"];

function resolveWorkspaceId(): string | null {
  // they have to paste a wrkspc_ id or claude gets mad
  return process.env.ANTHROPIC_WORKSPACE_ID?.trim() || null;
}

// backup text if claude is down
function localExplanation(payload: MatchRequest, state: string): string {
  const quote = payload.citationQuote?.trim();
  const step = payload.stepTitle ?? "this permit step";
  const kind = payload.config.useCase ?? payload.config.projectType;
  return [
    `${step} is on the map for a ${kind} in ${state}.`,
    quote
      ? `The cited language says: "${quote}"`
      : "No specific quote was attached, so this uses the checklist reason for the step.",
    "In plain English: you typically cannot skip this review. Confirm the current requirement with the town or state agency before you spend money on it.",
    "This is a planning pointer from downloaded source files, not official legal advice, and it does not add new permits.",
  ].join("\n\n");
}

// turn the ugly api error into something we can show
function publicClaudeError(message: string): string {
  if (message === "NO_KEY") {
    return "No Anthropic API key is configured on the server.";
  }
  if (message.includes("CLAUDE_401") || message.includes("CLAUDE_403")) {
    return "Assisted explanations are unavailable on this installation. Showing local checklist guidance.";
  }
  if (message.includes("workspace")) {
    return "Claude is not connected for this key yet, so this is a local summary. It is not official legal advice.";
  }
  if (message.includes("CLAUDE_404")) {
    return "Claude could not find the requested model.";
  }
  if (message.includes("CLAUDE_429")) {
    return "Claude is rate-limited. Try again in a moment.";
  }
  return "Claude is unavailable right now. Showing a local plain-language summary instead.";
}

async function callClaude(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("NO_KEY");
  }

  // workspace header only if we actually have one
  const workspaceId = resolveWorkspaceId();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
  };
  if (workspaceId) {
    headers["anthropic-workspace-id"] = workspaceId;
  }

  let lastError = "CLAUDE_UNKNOWN";
  // try sonnet first then haiku if that one flops
  for (const model of CLAUDE_MODELS) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        content?: { type: string; text?: string }[];
      };
      const text = body.content?.find((part) => part.type === "text")?.text ?? "";
      if (text.trim()) return text;
      lastError = `CLAUDE_EMPTY:${model}`;
      continue;
    }
    const detail = await response.text();
    lastError = `CLAUDE_${response.status}:${detail.slice(0, 240)}`;
    if (response.status === 401 || response.status === 403) {
      break;
    }
  }
  throw new Error(lastError);
}

// claude sometimes wraps json in extra words so just take the object part
function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send this request as JSON." }, { status: 415 });
  }
  let payload: MatchRequest;
  try {
    const parsed = requestSchema.safeParse(await readBoundedBody(request));
    if (!parsed.success) return NextResponse.json({ error: "Check the project details and citation, then try again." }, { status: 400 });
    payload = parsed.data;
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "BODY_TOO_LARGE";
    return NextResponse.json({ error: tooLarge ? "This request is too large. Choose a shorter citation and try again." : "Send valid project details as JSON." }, { status: tooLarge ? 413 : 400 });
  }

  const config = payload.config;
  const state = (config.state ?? "NH").toUpperCase();
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return localResponse(payload, state, "Assisted explanations are not enabled here. Showing local checklist guidance.");
  }
  const userId = await verifiedCloudUser(request);
  if (!userId) {
    return localResponse(payload, state, "Sign in to use assisted explanations. Showing local checklist guidance.");
  }
  const retryAfter = takeQuota(userId);
  if (retryAfter) {
    return NextResponse.json({ error: "You've requested several explanations. Wait a minute and try again." }, {
      status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
    });
  }
  const excerpts = loadJurisdictionExcerpts(state);
  const action = payload.action === "explain" ? "explain" : "match";

  try {
    // they asked to explain one citation
    if (action === "explain") {
      const text = await callClaude(
        [
          "Explain this planning citation in plain English for a small-business owner.",
          "Do not add new permits. Do not invent a statute number that is not in the quote.",
          "Say this is a planning pointer, not official legal advice.",
          `Business: ${config.useCase ?? config.projectType} in ${state}`,
          `Step: ${payload.stepTitle ?? "permit step"}`,
          `Citation: ${payload.citationQuote ?? ""}`,
          excerpts ? `Source excerpts:\n${excerpts.slice(0, 4000)}` : "",
        ].join("\n\n"),
      );
      return NextResponse.json({ explanation: text.trim(), modelUsed: true }, { headers: { "Cache-Control": "no-store" } });
    }

    // match quotes onto the steps we already picked. dont add new permits
    const text = await callClaude(
      [
        "You match published law excerpts to permit steps. You cannot add or remove permits.",
        "Return JSON only with this shape:",
        '{"citations":[{"stepId":"","code":"","title":"","quote":"","url":""}],"followUps":[{"title":"","detail":""}]}',
        "Each citation.stepId MUST be one of the provided step ids.",
        "Quotes must come from the excerpts. If you cannot find a match, omit that step.",
        "followUps are optional extras the checklist might have missed. They are suggestions only.",
        `State: ${state}`,
        `Use case: ${config.useCase ?? "(none)"}`,
        `Project type: ${config.projectType}`,
        `Food preparation: ${Boolean(config.foodPreparation)}`,
        `Home based: ${Boolean(config.homeBased)}`,
        `Personal care: ${Boolean(config.personalCare)}`,
        `Changing space: ${Boolean(config.changingSpace)}`,
        `Public attendance: ${Boolean(config.publicAttendance)}`,
        `Square feet: ${config.squareFootage}`,
        `Steps: ${JSON.stringify(payload.stepIds ?? [])}`,
        excerpts ? `Excerpts:\n${excerpts}` : "No excerpts are available for this state.",
      ].join("\n\n"),
    );
    const parsed = parseJsonObject(text);
    const citations = (Array.isArray(parsed.citations) ? parsed.citations.slice(0, 60) : []).flatMap((item) => {
      const citation = citationSchema.safeParse(item);
      return citation.success && payload.stepIds.includes(citation.data.stepId) ? [citation.data] : [];
    });
    const followUps = (Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 10) : []).flatMap((item) => {
      const followUp = followUpSchema.safeParse(item);
      return followUp.success ? [followUp.data] : [];
    });
    return NextResponse.json({
      citations,
      followUps,
      modelUsed: true,
      note: "Citations are matched from downloaded source files. They are not an official determination.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // if claude fails we still show something so the button isnt empty
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[citations]", message.split(":")[0]);
    const note =
      message === "NO_KEY"
        ? "No API key is configured. Fixture citations are shown instead."
        : publicClaudeError(message);
    return localResponse(payload, state, note);
  }
}
