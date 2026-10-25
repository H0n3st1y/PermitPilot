// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PwaControls } from "./PwaControls";

// a fake service worker registration, with an optional waiting worker
function registration(waiting: { postMessage: ReturnType<typeof vi.fn> } | null = null) {
  return Object.assign(new EventTarget(), { waiting, installing: null });
}

// not installed, and sitting on the home path
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  window.history.replaceState(null, "", "/");
});
// drop the fake service worker and any stubbed timers
afterEach(() => { cleanup(); Reflect.deleteProperty(navigator, "serviceWorker"); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("optional PWA controls", () => {
  // without a prompt, the panel shows manual install steps
  it("offers honest manual instructions without inventing installation support", () => {
    render(React.createElement(PwaControls));
    expect(screen.getByText(/open this page in Safari/)).toBeTruthy();
    expect(screen.getByText(/Installation does not sync projects/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Install PermitPilot" })).toBeNull();
    const summary = screen.getByText("Install app").closest("summary")!;
    const details = summary.closest("details")!;
    details.open = true;
    fireEvent.keyDown(summary, { key: "Escape" });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  // the browser prompt can be used once, including a dismissal
  it("uses a provided prompt once and keeps dismissal recoverable", async () => {
    render(React.createElement(PwaControls));
    const prompt = vi.fn().mockResolvedValue(undefined);
    let decide!: (result: { outcome: string }) => void;
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt,
      userChoice: new Promise((resolve) => { decide = resolve; }),
    });
    act(() => { window.dispatchEvent(event); });
    const details = screen.getByText("Install app").closest("details")!;
    details.open = true;
    const button = screen.getByRole("button", { name: "Install PermitPilot" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    await act(async () => { decide({ outcome: "dismissed" }); });
    expect(screen.getByRole("status").textContent).toContain("Installation dismissed");
    expect(screen.queryByRole("button", { name: "Install PermitPilot" })).toBeNull();
  });

  // a standalone display mode is treated as already installed
  it("recognizes standalone presentation without offering installation again", () => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: true }));
    render(React.createElement(PwaControls));
    expect(screen.getByText("App options")).toBeTruthy();
    expect(screen.getByText("PermitPilot is running in its own app window.")).toBeTruthy();
    expect(screen.queryByText(/open this page in Safari/)).toBeNull();
  });

  // appinstalled in a normal tab is not the same as a standalone window
  it("does not call an installed browser tab a standalone app window", () => {
    render(React.createElement(PwaControls));
    act(() => { window.dispatchEvent(new Event("appinstalled")); });
    expect(screen.getByText("Install app")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Open it from your Home Screen");
    expect(screen.queryByText("PermitPilot is running in its own app window.")).toBeNull();
  });

  // an update waits during intake and only posts once they leave
  it("keeps an update waiting in intake and applies it only after a safe explicit action", async () => {
    const postMessage = vi.fn();
    const registered = registration({ postMessage });
    const serviceWorker = Object.assign(new EventTarget(), {
      getRegistration: vi.fn().mockResolvedValue(registered), ready: Promise.resolve(registered),
    });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
    window.history.replaceState(null, "", "/intake");
    render(React.createElement(PwaControls));
    await waitFor(() => expect(screen.getByText("Update available")).toBeTruthy());
    expect(postMessage).not.toHaveBeenCalled();
    screen.getByText("Install app").closest("details")!.open = true;
    fireEvent.click(screen.getByRole("button", { name: "Update and reload" }));
    expect(screen.getByRole("status").textContent).toContain("Save & exit");
    expect(postMessage).not.toHaveBeenCalled();
    window.history.replaceState(null, "", "/");
    fireEvent.click(screen.getByRole("button", { name: "Update and reload" }));
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: "PERMITPILOT_ACTIVATE_UPDATE" });
    expect(screen.getByRole("button", { name: "Updating…" }).hasAttribute("disabled")).toBe(true);
  });
});
