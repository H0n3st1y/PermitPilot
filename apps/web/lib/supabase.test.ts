// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const cloud = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: cloud }) }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("authentication truthfulness", () => {
  it("returns cloud sign-up errors without creating a local account", async () => {
    cloud.signUp.mockResolvedValue({ data: {}, error: { message: "Signups disabled" } });
    const auth = await import("@/lib/supabase");
    expect((await auth.signUpWithEmail("Test", "test@example.com", "password")).error).toBe("Signups disabled");
    expect(localStorage.getItem("permitpilot:auth:accounts")).toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
  });

  it("asks for email confirmation without claiming a signed-in session", async () => {
    cloud.signUp.mockResolvedValue({ data: { user: { id: "user", email: "test@example.com" }, session: null }, error: null });
    const auth = await import("@/lib/supabase");
    const result = await auth.signUpWithEmail("Test", "test@example.com", "password");
    expect(result.message).toContain("Check your email");
    expect(result.user).toBeNull(); expect(auth.getCurrentUser()).toBeNull();
  });

  it("requires a password to access an existing local account", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const auth = await import("@/lib/supabase");
    const first = await auth.signUpWithEmail("Test", "test@example.com", "password");
    expect(first.user?.mode).toBe("local");
    await auth.signOutPermitPilot();
    const result = await auth.signUpWithEmail("Test", "test@example.com", "different-password");
    expect(result.error).toContain("Sign in with your password");
    expect(auth.getCurrentUser()).toBeNull();
  });

  it("keeps a failed sign-out recoverable without silently clearing the session", async () => {
    localStorage.setItem("permitpilot:auth:user", JSON.stringify({ id: "user", mode: "supabase" }));
    cloud.signOut.mockResolvedValue({ error: { message: "Network unavailable" } });
    const auth = await import("@/lib/supabase");
    await expect(auth.signOutPermitPilot()).rejects.toThrow("Network unavailable");
    expect(auth.getCurrentUser()?.id).toBe("user");
  });

  it("labels the sample fallback as local when cloud authentication fails", async () => {
    cloud.signInWithPassword.mockResolvedValue({ data: {}, error: { message: "Not found" } });
    const auth = await import("@/lib/supabase");
    expect((await auth.signInAsDemoJudge()).mode).toBe("local");
    expect(cloud.signInWithPassword).not.toHaveBeenCalled();
  });

  it("does not create a browser password account in an unconfigured production installation", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const auth = await import("@/lib/supabase");
    const result = await auth.signUpWithEmail("Test", "test@example.com", "password");
    expect(auth.getAccountAuthMode()).toBe("unavailable");
    expect(result.error).toBe(auth.ACCOUNT_UNAVAILABLE_MESSAGE);
    expect(localStorage.getItem("permitpilot:auth:accounts")).toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
  });

  it("rejects legacy local password login and sessions in production while keeping the sample usable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    localStorage.setItem("permitpilot:auth:accounts", JSON.stringify([
      { id: "legacy", email: "test@example.com", name: "Test", password: "password" },
    ]));
    localStorage.setItem("permitpilot:auth:user", JSON.stringify({ id: "legacy", mode: "local" }));
    const auth = await import("@/lib/supabase");
    expect(auth.getCurrentUser()).toBeNull();
    expect((await auth.signInWithEmail("test@example.com", "password")).error).toBe(auth.ACCOUNT_UNAVAILABLE_MESSAGE);
    const sample = await auth.signInAsDemoJudge();
    expect(sample.isDemoJudge).toBe(true);
    expect(sample.mode).toBe("local");
    expect(auth.getCurrentUser()?.id).toBe(sample.id);
  });

  it("continues to authenticate configured production accounts through Supabase", async () => {
    vi.stubEnv("NODE_ENV", "production");
    cloud.signInWithPassword.mockResolvedValue({ data: { user: { id: "real", email: "test@example.com" } }, error: null });
    const auth = await import("@/lib/supabase");
    expect(auth.getAccountAuthMode()).toBe("cloud");
    expect((await auth.signInWithEmail("test@example.com", "password")).user?.mode).toBe("supabase");
    expect(localStorage.getItem("permitpilot:auth:accounts")).toBeNull();
  });

  it("treats malformed and insecure production cloud configuration as unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a URL");
    let auth = await import("@/lib/supabase");
    expect(auth.getAccountAuthMode()).toBe("unavailable");
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://production.example.com");
    auth = await import("@/lib/supabase");
    expect(auth.getAccountAuthMode()).toBe("unavailable");
  });
});
