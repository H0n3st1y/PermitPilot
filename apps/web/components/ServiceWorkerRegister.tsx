"use client";

import { useEffect } from "react";

/** Offline shell caching is production-only; in development it would serve stale bundles. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("PermitPilot service worker registration failed", error);
    });
  }, []);

  return null;
}
