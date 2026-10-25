import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

interface WorkerEvent {
  data?: { type: string };
  request?: { method: string; url: string; mode: string };
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith: (promise: Promise<Response>) => void;
}

function worker() {
  const listeners: Record<string, (event: WorkerEvent) => void> = {};
  const addAll = vi.fn().mockResolvedValue(undefined);
  const deleteCache = vi.fn().mockResolvedValue(true);
  const match = vi.fn().mockResolvedValue(new Response("offline recovery"));
  const fetchRequest = vi.fn().mockResolvedValue(new Response("network"));
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  runInNewContext(readFileSync(resolve("public/sw.js"), "utf8"), {
    self: {
      location: { origin: "https://permitpilot.example" },
      clients: { claim: vi.fn().mockResolvedValue(undefined) },
      skipWaiting,
      addEventListener: (type: string, callback: (event: WorkerEvent) => void) => { listeners[type] = callback; },
    },
    caches: {
      open: vi.fn().mockResolvedValue({ addAll }),
      keys: vi.fn().mockResolvedValue(["permitpilot-v2", "another-app-cache", "permitpilot-public-v3", "permitpilot-public-v4"]),
      delete: deleteCache,
      match,
    },
    fetch: fetchRequest,
    URL,
    Response,
  });
  function dispatch(type: string, request?: WorkerEvent["request"], data?: WorkerEvent["data"]) {
    const promises: Promise<unknown>[] = [];
    const respondWith = vi.fn((promise: Promise<Response>) => { promises.push(promise); });
    listeners[type]({ request, data, respondWith, waitUntil: (promise) => { promises.push(promise); } });
    return { respondWith, done: Promise.all(promises) };
  }
  return { addAll, deleteCache, match, fetchRequest, dispatch, skipWaiting };
}

describe("service worker public cache policy", () => {
  it("does not activate a waiting update without an explicit supported message", async () => {
    const instance = worker();
    await instance.dispatch("install").done;
    await instance.dispatch("message", undefined, { type: "OTHER" }).done;
    expect(instance.skipWaiting).not.toHaveBeenCalled();
    await instance.dispatch("message", undefined, { type: "PERMITPILOT_ACTIVATE_UPDATE" }).done;
    expect(instance.skipWaiting).toHaveBeenCalledTimes(1);
  });
  it("precaches existing public assets, excluding app pages and personal data", async () => {
    const instance = worker();
    await instance.dispatch("install").done;
    const assets = instance.addAll.mock.calls[0][0] as string[];
    expect(assets).toContain("/offline.html");
    expect(assets).not.toContain("/");
    for (const asset of assets) expect(readFileSync(resolve("public", `.${asset}`)).length).toBeGreaterThan(0);
  });

  it("cleans up old PermitPilot caches without deleting other apps' caches", async () => {
    const instance = worker();
    await instance.dispatch("activate").done;
    expect(instance.deleteCache.mock.calls).toEqual([["permitpilot-v2"], ["permitpilot-public-v3"]]);
  });

  it("uses the network for navigation and falls back to recovery on failure", async () => {
    const instance = worker();
    const request = { method: "GET", url: "https://permitpilot.example/dashboard/private-project", mode: "navigate" };
    const [online] = await instance.dispatch("fetch", request).done as Response[];
    expect(await online.text()).toBe("network");
    expect(instance.match).not.toHaveBeenCalled();
    instance.fetchRequest.mockRejectedValueOnce(new Error("offline"));
    const [offline] = await instance.dispatch("fetch", request).done as Response[];
    expect(await offline.text()).toBe("offline recovery");
    expect(instance.match).toHaveBeenCalledWith("/offline.html");
  });

  it("does not intercept auth, API, documents, framework payloads, mutations or cross-origin traffic", () => {
    const instance = worker();
    for (const [method, url] of [
      ["GET", "https://permitpilot.example/api/project"],
      ["GET", "https://permitpilot.example/document.pdf"],
      ["GET", "https://permitpilot.example/dashboard?_rsc=payload"],
      ["POST", "https://permitpilot.example/api/project"],
      ["GET", "https://auth.supabase.co/token"],
    ]) {
      expect(instance.dispatch("fetch", { method, url, mode: "cors" }).respondWith).not.toHaveBeenCalled();
    }
  });
});
