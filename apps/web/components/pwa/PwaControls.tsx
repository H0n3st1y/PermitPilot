"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Smartphone } from "lucide-react";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Installation is optional; updates never reload an open form automatically. */
export function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const requestedUpdate = useRef(false);
  const pendingAction = useRef(false);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const checkDisplayMode = () => setStandalone(displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const offerInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const installed = () => { setInstallPrompt(null); checkDisplayMode(); setMessage("PermitPilot was added. Open it from your Home Screen or app launcher."); };
    checkDisplayMode();
    displayMode.addEventListener("change", checkDisplayMode);
    window.addEventListener("beforeinstallprompt", offerInstall);
    window.addEventListener("appinstalled", installed);

    let active = true;
    const cleanups: (() => void)[] = [];
    const watched = new Set<ServiceWorkerRegistration>();
    function watchRegistration(registration?: ServiceWorkerRegistration) {
      if (!active || !registration || watched.has(registration)) return;
      watched.add(registration);
      const checkWaiting = () => { if (active) setWaiting(registration.waiting); };
      const watchInstalling = () => {
        const worker = registration.installing;
        if (worker) {
          worker.addEventListener("statechange", checkWaiting);
          cleanups.push(() => worker.removeEventListener("statechange", checkWaiting));
        }
        checkWaiting();
      };
      registration.addEventListener("updatefound", watchInstalling);
      cleanups.push(() => registration.removeEventListener("updatefound", watchInstalling));
      watchInstalling();
    }
    const controllerChanged = () => {
      // Another tab or a first installation must never refresh this tab's work.
      if (requestedUpdate.current) window.location.reload();
    };
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistration().then(watchRegistration).catch(() => undefined);
      void navigator.serviceWorker.ready.then(watchRegistration).catch(() => undefined);
      navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
    }
    return () => {
      active = false;
      displayMode.removeEventListener("change", checkDisplayMode);
      window.removeEventListener("beforeinstallprompt", offerInstall);
      window.removeEventListener("appinstalled", installed);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
      cleanups.forEach((cleanup) => cleanup());
      clearTimeout(updateTimer.current);
    };
  }, []);

  async function install() {
    if (!installPrompt || pendingAction.current) return;
    pendingAction.current = true;
    const prompt = installPrompt;
    setBusy(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === "accepted" ? "Installation requested. Your browser will confirm when it is ready." : "Installation dismissed. You can keep using PermitPilot in this browser.");
    } catch {
      setMessage("Installation could not open. Use your browser's Install app or Add to Home Screen option.");
    } finally {
      // A browser-provided prompt can only be used once.
      setInstallPrompt(null);
      pendingAction.current = false;
      setBusy(false);
    }
  }

  function update() {
    if (!waiting || pendingAction.current) return;
    if (window.location.pathname === "/intake" || document.querySelector('[aria-busy="true"]')) {
      setMessage("Finish the current action first. In intake, use Save & exit before updating, then return here.");
      return;
    }
    setBusy(true);
    pendingAction.current = true;
    setMessage("Applying update…");
    requestedUpdate.current = true;
    try {
      waiting.postMessage({ type: "PERMITPILOT_ACTIVATE_UPDATE" });
      updateTimer.current = setTimeout(() => {
        requestedUpdate.current = false;
        pendingAction.current = false;
        setBusy(false);
        setMessage("The update is not ready yet. Try again, or reopen PermitPilot after saving your work.");
      }, 10000);
    } catch {
      requestedUpdate.current = false;
      pendingAction.current = false;
      setBusy(false);
      setMessage("The update could not start. Save your work and reopen PermitPilot to try again.");
    }
  }

  return (
    <details className="pwa-controls" ref={details} onKeyDown={(event) => {
      if (event.key !== "Escape" || !details.current?.open) return;
      event.stopPropagation();
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    }}>
      <summary className="a11y-toggle">
        <Smartphone size={15} aria-hidden />
        <span>{standalone ? "App options" : "Install app"}</span>
        {waiting ? <span className="pwa-update-label">Update available</span> : null}
      </summary>
      <div className="pwa-help">
        <h2>{standalone ? "Home Screen app" : "Keep PermitPilot handy"}</h2>
        {standalone ? <p>PermitPilot is running in its own app window.</p> : installPrompt ? (
          <>
            <p>Add PermitPilot to your Home Screen or app launcher for quicker access.</p>
            <button className="button primary" type="button" disabled={busy} aria-busy={busy} onClick={() => void install()}><Download size={16} aria-hidden />{busy ? "Opening installation…" : "Install PermitPilot"}</button>
          </>
        ) : (
          <>
            <p><strong>iPhone or iPad:</strong> open this page in Safari, open Share, then choose Add to Home Screen. Turn on Open as Web App if shown.</p>
            <p><strong>Android or desktop:</strong> look for Install app or Add to Home Screen in your browser menu. Availability depends on your browser.</p>
          </>
        )}
        <p className="pwa-storage-note">Installation does not sync projects between devices. Reconnect to load pages; offline editing is not available.</p>
        {waiting ? <section className="pwa-update" aria-label="App update">
          <h3>Update ready</h3>
          <p>Save your work first. Updating reloads this page. If you are in intake, use Save &amp; exit before returning here.</p>
          <button type="button" className="button secondary" disabled={busy} aria-busy={busy} onClick={update}>{busy ? "Updating…" : "Update and reload"}</button>
        </section> : null}
        <p className={message ? "pwa-feedback" : "sr-only"} role="status">{message}</p>
      </div>
    </details>
  );
}
