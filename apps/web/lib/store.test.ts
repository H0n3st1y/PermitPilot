// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DB_SYNC_EVENT, fetchProjectFromDb, getLastProjectId, getProject, isProjectStorageReadable, listLocalProjectsForCurrentUser, listUserProjects, sampleProject, saveProject, syncProjectToSupabase } from "@/lib/store";
import { getCurrentUser, getSupabaseClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ getCurrentUser: vi.fn(() => null), getSupabaseClient: vi.fn(() => null) }));
const cloudUser = { id: "real-user", email: "owner@example.com", name: "Owner", mode: "supabase" as const };

function cloudRead(row: unknown) {
  const eq = vi.fn();
  const query = { eq, maybeSingle: async () => ({ data: row, error: null }) };
  eq.mockReturnValue(query);
  return { from: () => ({ select: () => query }), eq };
}

describe("project persistence feedback", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getSupabaseClient).mockReset().mockReturnValue(null);
    vi.mocked(getCurrentUser).mockReset().mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("keeps unavailable browser storage distinct from a missing project without crashing readers", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Storage denied", "SecurityError"); });
    expect(isProjectStorageReadable()).toBe(false);
    expect(getProject("any-project")).toBeNull();
    expect(getLastProjectId()).toBeNull();
    expect(listLocalProjectsForCurrentUser()).toEqual([]);
  });

  it("preserves write failures so actions cannot claim they were saved", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Storage full", "QuotaExceededError"); });
    expect(() => saveProject(sampleProject())).toThrow("Storage full");
  });

  it("loads a cloud project even when browser storage and caching are denied", async () => {
    const project = sampleProject(new Date("2026-10-24"));
    const row = { id: project.id, config: project.config, roadmap: project.roadmap, documents: project.documents, inspections: project.inspections, fees: project.fees, created_at: project.createdAt, updated_at: project.updatedAt };
    vi.mocked(getCurrentUser).mockReturnValue(cloudUser);
    const cloud = cloudRead(row);
    vi.mocked(getSupabaseClient).mockReturnValue(cloud as unknown as ReturnType<typeof getSupabaseClient>);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Storage denied", "SecurityError"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Storage denied", "SecurityError"); });
    expect(await fetchProjectFromDb(project.id)).toEqual(project);
    expect(cloud.eq).toHaveBeenCalledWith("user_id", cloudUser.id);
  });

  it("reports browser storage when no cloud service is configured", async () => {
    const project = sampleProject();
    const listener = vi.fn();
    window.addEventListener(DB_SYNC_EVENT, listener);
    saveProject(project);
    expect(getProject(project.id)).toEqual(project);
    expect(listener.mock.calls[0][0].detail).toMatchObject({ projectId: project.id, source: "local", updatedAt: project.updatedAt });
    window.removeEventListener(DB_SYNC_EVENT, listener);
  });

  it("reports a rejected cloud write without losing the browser copy", async () => {
    const project = sampleProject();
    saveProject(project);
    vi.mocked(getCurrentUser).mockReturnValue(cloudUser);
    vi.mocked(getSupabaseClient).mockReturnValue({ from: () => ({ upsert: () => Promise.reject(new Error("offline")) }) } as unknown as ReturnType<typeof getSupabaseClient>);
    const states: string[] = [];
    const listener = (event: Event) => states.push((event as CustomEvent).detail.source);
    window.addEventListener(DB_SYNC_EVENT, listener);
    expect(await syncProjectToSupabase(project)).toBe(false);
    expect(states).toEqual(["syncing", "error"]);
    expect(getProject(project.id)).toEqual(project);
    window.removeEventListener(DB_SYNC_EVENT, listener);
  });

  it("does not replace a newer browser project with an older cloud version", async () => {
    const project = sampleProject(new Date("2026-10-24"));
    saveProject(project);
    const older = { id: project.id, config: { ...project.config, name: "Old name" }, roadmap: project.roadmap, documents: [], inspections: [], fees: project.fees, created_at: project.createdAt, updated_at: "2026-10-23T00:00:00.000Z" };
    vi.mocked(getCurrentUser).mockReturnValue(cloudUser);
    vi.mocked(getSupabaseClient).mockReturnValue(cloudRead(older) as unknown as ReturnType<typeof getSupabaseClient>);
    expect(await fetchProjectFromDb(project.id)).toEqual(project);
    expect(getProject(project.id)?.config.name).toBe(project.config.name);
  });

  it("never reads or writes cloud rows for anonymous or demonstration sessions", async () => {
    const project = sampleProject();
    const from = vi.fn();
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseClient>);
    expect(await syncProjectToSupabase(project)).toBe(false);
    expect(await fetchProjectFromDb(project.id)).toBeNull();
    expect(await listUserProjects()).toEqual([]);
    vi.mocked(getCurrentUser).mockReturnValue({ id: "demo", email: "demo@example.com", name: "Demo", mode: "local", isDemoJudge: true });
    expect(await syncProjectToSupabase(project)).toBe(false);
    expect(await fetchProjectFromDb(project.id)).toBeNull();
    expect(await listUserProjects()).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
