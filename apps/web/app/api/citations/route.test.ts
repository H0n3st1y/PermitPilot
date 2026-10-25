import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// supabase client mock we can steer from each test
const cloud = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: cloud.createClient }));
vi.mock("@/lib/legalSources", () => ({ loadJurisdictionExcerpts: () => "Published fixture excerpt" }));

// a normal explain request for the health permit
const payload = {
  action: "explain", config: { projectType: "food_business", state: "NH", squareFootage: 420 },
  stepIds: ["health-permit"], stepTitle: "Health permit", citationQuote: "Provide a handwashing sink.",
};
// post helper, with an optional bearer token
const request = (body: unknown = payload, token?: string) => new Request("http://localhost/api/citations", {
  method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
const fetchMock = vi.fn();

// fresh module, no api key, and a signed-in cloud user
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
  cloud.createClient.mockReturnValue({ auth: { getUser: cloud.getUser } });
  cloud.getUser.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
  fetchMock.mockImplementation(async () => Response.json({ content: [{ type: "text", text: "Explanation from published fixture." }] }));
  vi.stubGlobal("fetch", fetchMock);
});
// put envs, globals, and mocks back
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("citation service access and request bounds", () => {
  // no key stays local and never calls cloud auth or the model
  it("keeps no-key local guidance available without cloud authentication or a paid request", async () => {
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ modelUsed: false, explanation: expect.stringContaining("Health permit") });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cloud.getUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // a missing or bad token must not spend the model key
  it("does not spend a configured model key for missing or invalid cloud tokens", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "server-secret");
    const { POST } = await import("./route");
    expect(await (await POST(request())).json()).toMatchObject({ modelUsed: false, note: expect.stringContaining("Sign in") });
    cloud.getUser.mockResolvedValue({ data: { user: null }, error: { message: "Invalid token" } });
    expect(await (await POST(request(payload, "invalid"))).json()).toMatchObject({ modelUsed: false });
    expect(cloud.getUser).toHaveBeenCalledWith("invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // a real token is checked, then the model call is bounded
  it("validates the actual cloud token before a bounded model request", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "server-secret");
    const { POST } = await import("./route");
    const response = await POST(request(payload, "valid-session"));
    expect(await response.json()).toMatchObject({ modelUsed: true });
    expect(cloud.getUser).toHaveBeenCalledWith("valid-session");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(JSON.parse(options.body).max_tokens).toBe(1200);
    expect(options.headers["x-api-key"]).toBe("server-secret");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  // ten calls succeed, the next waits, and the window can recover
  it("limits verified users per process and allows recovery after the quota window", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "server-secret");
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
    const { POST } = await import("./route");
    // the first ten requests in the window are allowed
    for (let count = 0; count < 10; count++) expect((await POST(request(payload, "valid-session"))).status).toBe(200);
    const limited = await POST(request(payload, "valid-session"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    expect(fetchMock).toHaveBeenCalledTimes(10);
    now.mockReturnValue(160_001);
    expect((await POST(request(payload, "valid-session"))).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  // a huge body is rejected even when content-length is missing
  it("rejects an oversized actual body even without a Content-Length header", async () => {
    const { POST } = await import("./route");
    const oversized = request({ ...payload, extra: "x".repeat(33_000) });
    expect(oversized.headers.has("content-length")).toBe(false);
    expect((await POST(oversized)).status).toBe(413);
    expect(cloud.getUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // bad json, too many steps, and a path-like state never reach the model
  it("rejects malformed JSON, oversized collections and invalid state paths before filesystem or model work", async () => {
    const { POST } = await import("./route");
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request({ ...payload, stepIds: Array(61).fill("step") }))).status).toBe(400);
    expect((await POST(request({ ...payload, config: { ...payload.config, state: "../../private" } }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // keep only citations for requested steps and safe http links
  it("drops model citations outside the requested steps and unsafe source links", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "server-secret");
    const valid = { stepId: "health-permit", code: "Test", title: "Published code", quote: "Excerpt", url: "https://example.gov/code" };
    fetchMock.mockImplementation(async () => Response.json({ content: [{ type: "text", text: JSON.stringify({ citations: [valid, { ...valid, url: "javascript:alert(1)" }, { ...valid, stepId: "unrequested" }], followUps: [{ title: "Confirm", detail: "Ask the permit office." }, { title: 123 }] }) }] }));
    const { POST } = await import("./route");
    const body = await (await POST(request({ ...payload, action: "match" }, "valid-session"))).json();
    expect(body.citations).toEqual([valid]);
    expect(body.followUps).toEqual([{ title: "Confirm", detail: "Ask the permit office." }]);
  });
});
