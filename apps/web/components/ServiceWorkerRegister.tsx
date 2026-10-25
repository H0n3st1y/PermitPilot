"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Development assets change on every refresh; keep them outside the worker.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;
    const checkUpdate = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", checkUpdate);
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then((registered) => { registration = registered; })
      .catch((error: unknown) => {
        console.error("PermitPilot service worker registration failed", error);
      });
    return () => document.removeEventListener("visibilitychange", checkUpdate);
  }, []);

  return null;
}
