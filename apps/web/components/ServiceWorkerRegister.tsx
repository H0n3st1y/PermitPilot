"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("PermitPilot service worker registration failed", error);
    });
  }, []);

  return null;
}
