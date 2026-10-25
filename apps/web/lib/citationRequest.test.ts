import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { citationRequestHeaders } from "@/lib/citationRequest";
import { getCurrentUser, getSupabaseClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ getCurrentUser: vi.fn(), getSupabaseClient: vi.fn() }));
const getSession = vi.fn();
beforeEach(() => {
  vi.mocked(getSupabaseClient).mockReturnValue({ auth: { getSession } } as unknown as ReturnType<typeof getSupabaseClient>);
  vi.mocked(getCurrentUser).mockReturnValue(null);
  getSession.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("citation request authentication", () => {
  it("does not attach a cloud token for anonymous or local sample sessions", async () => {
    expect(await citationRequestHeaders()).toEqual({ "content-type": "application/json" });
    vi.mocked(getCurrentUser).mockReturnValue({ id: "sample", email: "demo@example.com", name: "Demo", mode: "local", isDemoJudge: true });
    expect(await citationRequestHeaders()).toEqual({ "content-type": "application/json" });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("takes the token from Supabase's session rather than the cached display profile", async () => {
    vi.mocked(getCurrentUser).mockReturnValue({ id: "user", email: "owner@example.com", name: "Owner", mode: "supabase" });
    getSession.mockResolvedValue({ data: { session: { access_token: "actual-session-token" } }, error: null });
    expect(await citationRequestHeaders()).toEqual({ "content-type": "application/json", authorization: "Bearer actual-session-token" });
  });

  it("leaves local guidance available after a failed session refresh", async () => {
    vi.mocked(getCurrentUser).mockReturnValue({ id: "user", email: "owner@example.com", name: "Owner", mode: "supabase" });
    getSession.mockRejectedValue(new Error("Offline"));
    expect(await citationRequestHeaders()).toEqual({ "content-type": "application/json" });
  });
});
