"use client";

import { useEffect } from "react";

// register the worker in production so the installed app can update
export function ServiceWorkerRegister() {
  useEffect(() => {
    // Development assets change on every refresh; keep them outside the worker.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;
    // look for an update when the tab is visible again
    const checkUpdate = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", checkUpdate);
    // register sw.js and keep the registration for later checks
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then((registered) => { registration = registered; })
      .catch((error: unknown) => {
        console.error("PermitPilot service worker registration failed", error);
      });
    // drop the listener when this component goes away
    return () => document.removeEventListener("visibilitychange", checkUpdate);
  }, []);

  return null;
}
