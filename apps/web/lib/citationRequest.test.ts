import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { citationRequestHeaders } from "@/lib/citationRequest";
import { getCurrentUser, getSupabaseClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ getCurrentUser: vi.fn(), getSupabaseClient: vi.fn() }));
const getSession = vi.fn();
// start each test with no user and a fresh session mock
beforeEach(() => {
  vi.mocked(getSupabaseClient).mockReturnValue({ auth: { getSession } } as unknown as ReturnType<typeof getSupabaseClient>);
  vi.mocked(getCurrentUser).mockReturnValue(null);
  getSession.mockReset();
});
// wipe mocks so they don't leak into the next test
afterEach(() => vi.clearAllMocks());

// who gets a bearer token on citation requests
describe("citation request authentication", () => {
  // signed-out and local demo sessions stay on the plain json header
  it("does not attach a cloud token for anonymous or local sample sessions", async () => {
    expect(await citationRequestHeaders()).toEqual({ "content-type": "application/json" });
    vi.mocked(getCurrentUser).mockReturnValue({ id: "sample", email: "demo@example.com", name: "Demo", mode: "local", isDemoJudge: true });
    expect(await citationRequestHeaders()).toEqual({ "content-type": "application/json" });
    expect(getSession).not.toHaveBeenCalled();
  });

  // a cloud session's access token is copied onto the request
  it("takes the token from Supabase's session rather than the cached display profile", async () => {
    vi.mocked(getCurrentUser).mockReturnValue({ id: "user", email: "owner@example.com", name: "Owner", mode: "supabase" });
    getSession.mockResolvedValue({ data: { session: { access_token: "actual-session-token" } }, error: null });
    expect(await citationRequestHeaders()).toEqual({ "content-type": "application/json", authorization: "Bearer actual-session-token" });
  });

  // a failed refresh still returns headers, just without a token
  it("leaves local guidance available after a failed session refresh", async () => {
    vi.mocked(getCurrentUser).mockReturnValue({ id: "user", email: "owner@example.com", name: "Owner", mode: "supabase" });
    getSession.mockRejectedValue(new Error("Offline"));
    expect(await citationRequestHeaders()).toEqual({ "content-type": "application/json" });
  });
});
