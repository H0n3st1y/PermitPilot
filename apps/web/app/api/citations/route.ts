import { NextResponse } from "next/server";
import { loadJurisdictionExcerpts } from "@/lib/legalSources";
import type { ProjectConfig } from "@/lib/types";

export const runtime = "nodejs";

interface MatchRequest {
  action?: "match" | "explain";
  config: ProjectConfig;
  stepIds: string[];
  stepTitle?: string;
  citationQuote?: string;
}

const CLAUDE_MODELS = ["claude-sonnet-4-5", "claude-haiku-4-5"];

function resolveWorkspaceId(): string | null {
  return process.env.ANTHROPIC_WORKSPACE_ID?.trim() || null;
}

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

function publicClaudeError(message: string): string {
  if (message === "NO_KEY") {
    return "No Anthropic API key is configured on the server.";
  }
  if (message.includes("CLAUDE_401") || message.includes("CLAUDE_403")) {
    return "Claude rejected the API key. Use a Console key from platform.claude.com/settings/keys, then restart the app.";
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
  for (const model of CLAUDE_MODELS) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
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
  let payload: MatchRequest;
  try {
    payload = (await request.json()) as MatchRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = payload.config;
  if (!config) {
    return NextResponse.json({ error: "Missing config" }, { status: 400 });
  }

  const state = (config.state ?? "NH").toUpperCase();
  const excerpts = loadJurisdictionExcerpts(state);
  const action = payload.action === "explain" ? "explain" : "match";

  try {
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
      return NextResponse.json({ explanation: text.trim(), modelUsed: true });
    }

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
    return NextResponse.json({
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
      modelUsed: true,
      note: "Citations are matched from downloaded source files. They are not an official determination.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[citations]", message);
    const note =
      message === "NO_KEY"
        ? "No API key is configured. Fixture citations are shown instead."
        : publicClaudeError(message);
    if (action === "explain") {
      return NextResponse.json({
        explanation: localExplanation(payload, state),
        modelUsed: false,
        note,
      });
    }
    return NextResponse.json({
      citations: [],
      followUps: [],
      modelUsed: false,
      note,
    });
  }
}
