// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import IntakePage from "@/app/intake/page";
import { translate } from "@/lib/i18n";
import { createProjectFromConfig } from "@/lib/engine/project";
import type { ProjectConfig } from "@/lib/types";

// router and store mocks the intake page calls
const mocks = vi.hoisted(() => ({ push: vi.fn(), saveProject: vi.fn(), createProject: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/layout/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/a11y", () => ({ useA11y: () => ({ t: (key: string, values?: Record<string, string | number>) => translate("en", key, values) }) }));
vi.mock("@/lib/supabase", () => ({ useAuth: () => ({ user: null }), getCurrentUser: () => null, getSupabaseClient: () => null }));
vi.mock("@/lib/store", async (original) => {
  const actual = await original<typeof import("@/lib/store")>();
  mocks.createProject.mockImplementation(actual.createProject);
  return { ...actual, createProject: mocks.createProject, saveProject: mocks.saveProject };
});

// a public-event draft we can drop into storage
const config: ProjectConfig = {
  name: "Neighborhood plans", projectType: "public_event", state: "NH", useCase: "neighborhood-event",
  squareFootage: 850, estimatedValuation: 2000, occupancy: "assembly", zone: "commercial",
  trades: ["electrical"], homeBased: false, foodPreparation: true, publicAttendance: true, visitorCount: 75,
};

// write a version 2 draft at a given step
function restore(step: number, overrides: Partial<ProjectConfig> = {}) {
  localStorage.setItem("permitpilot:draft", JSON.stringify({ version: 2, step, config: { ...config, ...overrides } }));
}
// grab a field, submit the form, or click back
function input(id: string) { return document.getElementById(id) as HTMLInputElement; }
function submit() { fireEvent.submit(document.querySelector("form")!); }
function back() { fireEvent.click(screen.getByRole("button", { name: "Back" })); }

// real project builder, empty storage, and a clean save mock
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); mocks.createProject.mockImplementation(createProjectFromConfig); mocks.saveProject.mockReset(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("intake draft and recovery", () => {
  // an old flat draft still restores the project type and numbers
  it("migrates a legacy flat draft without losing its known project choice or entered values", () => {
    localStorage.setItem("permitpilot:draft", JSON.stringify(config));
    render(React.createElement(IntakePage));
    expect(screen.getByRole("button", { name: /Neighborhood event A block/ }).getAttribute("aria-pressed")).toBe("true");
    submit();
    expect(input("sqft").value).toBe("850");
    expect(input("valuation").value).toBe("2000");
    back();
    submit(); submit();
    expect(input("name").value).toBe(config.name);
    const migrated = JSON.parse(localStorage.getItem("permitpilot:draft")!);
    expect(migrated.version).toBe(2);
    expect(migrated.step).toBe(3);
    expect(migrated.config).toMatchObject(config);
  });

  // a full disk keeps the answers, and a later save can still leave
  it("retains answers and focuses a failed Save & exit warning, then exits after storage recovers", async () => {
    restore(3);
    render(React.createElement(IntakePage));
    fireEvent.change(input("name"), { target: { value: "Plans to keep" } });
    // the next write fails
    const storageWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
    fireEvent.click(screen.getByRole("button", { name: "Save & exit" }));
    const warning = await screen.findByText(/Your draft could not be saved/);
    await waitFor(() => expect(document.activeElement).toBe(warning.closest('[role="status"]')));
    expect(input("name").value).toBe("Plans to keep");
    expect(mocks.push).not.toHaveBeenCalled();
    storageWrite.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Save & exit" }));
    expect(mocks.push).toHaveBeenCalledWith("/");
    expect(JSON.parse(localStorage.getItem("permitpilot:draft")!).config.name).toBe("Plans to keep");
    expect(mocks.createProject).not.toHaveBeenCalled();
  });

  // the error link focuses the field, and fixing it clears the error
  it("links actionable errors to fields without moving focus while the user corrects them", () => {
    restore(2);
    render(React.createElement(IntakePage));
    fireEvent.change(input("sqft"), { target: { value: "" } });
    submit();
    expect(document.activeElement).toBe(screen.getByRole("alert"));
    expect(input("sqft").getAttribute("aria-invalid")).toBe("true");
    const descriptions = input("sqft").getAttribute("aria-describedby")!.split(" ");
    expect(descriptions).toContain("squareFootage-error");
    expect(document.getElementById("squareFootage-error")?.textContent).toContain("greater than 0");
    fireEvent.click(screen.getByRole("link", { name: /Enter an area/ }));
    expect(document.activeElement).toBe(input("sqft"));
    fireEvent.change(input("sqft"), { target: { value: "650" } });
    expect(document.activeElement).toBe(input("sqft"));
    expect(input("sqft").getAttribute("aria-invalid")).toBe("false");
    expect(input("sqft").getAttribute("aria-describedby")).toBe("sqft-hint");
  });

  // a blank cost stays blank instead of becoming zero
  it("preserves an empty cost control and asks for an explicit estimate instead of converting it to zero", () => {
    restore(2);
    render(React.createElement(IntakePage));
    fireEvent.change(input("valuation"), { target: { value: "" } });
    submit();
    expect(input("valuation").value).toBe("");
    expect(input("valuation").getAttribute("aria-invalid")).toBe("true");
    expect(input("valuation").getAttribute("aria-describedby")).toContain("estimatedValuation-error");
    expect(mocks.createProject).not.toHaveBeenCalled();
  });

  // back and continue keep the name, numbers, and trade checks
  it("resumes a versioned draft and preserves names, numbers and trade choices across Back and Continue", () => {
    restore(3);
    render(React.createElement(IntakePage));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Review and name");
    expect(input("name").value).toBe(config.name);
    fireEvent.change(input("name"), { target: { value: "Revised neighborhood plans" } });
    back();
    fireEvent.change(input("sqft"), { target: { value: "925" } });
    fireEvent.change(input("valuation"), { target: { value: "3800" } });
    const gas = screen.getByRole("checkbox", { name: "Fuel gas" });
    fireEvent.click(gas);
    back();
    expect(screen.getByRole("button", { name: /Neighborhood event A block/ }).getAttribute("aria-pressed")).toBe("true");
    submit();
    expect(input("sqft").value).toBe("925");
    expect(input("valuation").value).toBe("3800");
    expect((screen.getByRole("checkbox", { name: "Fuel gas" }) as HTMLInputElement).checked).toBe(true);
    submit();
    expect(input("name").value).toBe("Revised neighborhood plans");
    const saved = JSON.parse(localStorage.getItem("permitpilot:draft")!);
    expect(saved.step).toBe(3);
    expect(saved.config.trades).toContain("gas");
  });

  // hiding attendance keeps the number they already typed
  it("shows attendance only when relevant and retains the entered estimate when toggled", () => {
    restore(3);
    render(React.createElement(IntakePage));
    const attendance = screen.getByRole("checkbox", { name: "The public will attend" });
    fireEvent.change(input("visitors"), { target: { value: "140" } });
    fireEvent.click(attendance);
    expect(document.getElementById("visitors")).toBeNull();
    fireEvent.click(attendance);
    expect(input("visitors").value).toBe("140");
  });

  // a failed save keeps the answers and retries the same project
  it("keeps answers after a failed save, blocks duplicate submits and reuses the generated project on retry", async () => {
    restore(3);
    // the first save throws
    mocks.saveProject.mockImplementationOnce(() => { throw new Error("Storage full"); });
    render(React.createElement(IntakePage));
    submit(); submit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("couldn't be saved"));
    expect(input("name").value).toBe(config.name);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.createProject).toHaveBeenCalledTimes(1);
    const generatedId = mocks.saveProject.mock.calls[0][0].id;
    submit(); submit();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/projects/${generatedId}?tab=overview&created=1`));
    expect(mocks.createProject).toHaveBeenCalledTimes(1);
    expect(mocks.saveProject).toHaveBeenCalledTimes(2);
    expect(mocks.saveProject.mock.calls[1][0].id).toBe(generatedId);
    expect(mocks.push).toHaveBeenCalledTimes(1);
  });

  // failing to delete the draft still opens the saved roadmap
  it("opens the saved roadmap even when draft cleanup fails", async () => {
    restore(3);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Cleanup unavailable"); });
    render(React.createElement(IntakePage));
    submit(); submit();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
    expect(mocks.saveProject).toHaveBeenCalledTimes(1);
    expect(mocks.createProject).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mocks.push.mock.calls[0][0]).toContain("?tab=overview&created=1");
  });
});
