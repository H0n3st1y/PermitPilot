"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Smartphone } from "lucide-react";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// install prompt and a manual update that does not reload a form by itself
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

  // watch install prompts, display mode, and a waiting service worker
  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    // standalone means it is already running as an installed app
    const checkDisplayMode = () => setStandalone(displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const offerInstall = (event: Event) => {
      // keep the browser from showing its own bar so we can offer the button
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
    // remember a registration and notice when an update is waiting
    function watchRegistration(registration?: ServiceWorkerRegistration) {
      if (!active || !registration || watched.has(registration)) return;
      watched.add(registration);
      const checkWaiting = () => { if (active) setWaiting(registration.waiting); };
      const watchInstalling = () => {
        const worker = registration.installing;
        if (worker) {
          worker.addEventListener("statechange", checkWaiting);
          // drop this listener when the effect cleans up
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
    // only browsers with a service worker can offer an update
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistration().then(watchRegistration).catch(() => undefined);
      void navigator.serviceWorker.ready.then(watchRegistration).catch(() => undefined);
      navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
    }
    // remove listeners and timers when this control unmounts
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

  // open the browser install prompt once
  async function install() {
    if (!installPrompt || pendingAction.current) return;
    pendingAction.current = true;
    const prompt = installPrompt;
    setBusy(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      // different message if they accepted or dismissed
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

  // tell the waiting worker to activate, unless they are mid-form
  function update() {
    if (!waiting || pendingAction.current) return;
    // don't reload intake or a busy action out from under them
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
      // if nothing happens in 10 seconds, stop waiting
      updateTimer.current = setTimeout(() => {
        requestedUpdate.current = false;
        pendingAction.current = false;
        setBusy(false);
        setMessage("The update is not ready yet. Try again, or reopen PermitPilot after saving your work.");
      }, 10000);
    } catch {
      // posting the message failed, so unlock the button
      requestedUpdate.current = false;
      pendingAction.current = false;
      setBusy(false);
      setMessage("The update could not start. Save your work and reopen PermitPilot to try again.");
    }
  }

  return (
    <details className="pwa-controls" ref={details} onKeyDown={(event) => {
      // escape closes the panel and focuses the summary
      if (event.key !== "Escape" || !details.current?.open) return;
      event.stopPropagation();
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    }}>
      <summary className="a11y-toggle">
        <Smartphone size={15} aria-hidden />
        {/* label changes once the app is already installed */}
        <span>{standalone ? "App options" : "Install app"}</span>
        {/* update badge when a worker is waiting */}
        {waiting ? <span className="pwa-update-label">Update available</span> : null}
      </summary>
      <div className="pwa-help">
        <h2>{standalone ? "Home Screen app" : "Keep PermitPilot handy"}</h2>
        {/* installed window, a prompt button, or the manual instructions */}
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
        {/* update section only when a worker is waiting */}
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
