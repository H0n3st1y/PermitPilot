// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectDashboard } from "@/components/project/ProjectDashboard";
import { getProject, sampleProject, saveProject } from "@/lib/store";
import { translate } from "@/lib/i18n";

vi.mock("@/components/layout/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/tour/ProductTour", () => ({ ProductTour: () => null }));
vi.mock("@/lib/a11y", () => ({ useA11y: () => ({ plainLanguage: false, t: (key: string, vars?: Record<string, string | number>) => translate("en", key, vars) }) }));
vi.mock("@/lib/supabase", () => ({ getCurrentUser: () => null, getSupabaseClient: () => null }));

// empty storage and a clean url before each dashboard render
beforeEach(() => { vi.stubGlobal("React", React); localStorage.clear(); window.history.replaceState(null, "", "/"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// blocked storage shows an error, and retry loads the saved project
it("offers recovery when storage is blocked and loads the project after retry", async () => {
  const project = sampleProject();
  saveProject(project);
  // every storage read throws until we restore it
  const blocked = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Storage denied", "SecurityError"); });
  render(React.createElement(ProjectDashboard, { id: project.id }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("allow browser storage"));
  expect(screen.queryByRole("heading", { name: "Project not found" })).toBeNull();
  blocked.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(project.config.name));
  expect(screen.queryByRole("alert")).toBeNull();
});

// the created flag shows the welcome card, and dismissing it keeps the tab
it("orients a newly generated roadmap, then dismisses it without losing the selected section", async () => {
  const project = sampleProject();
  saveProject(project);
  window.history.replaceState(null, "", `/projects/${project.id}?tab=overview&created=1`);
  render(React.createElement(ProjectDashboard, { id: project.id, initialTab: "overview", initialCreated: true }));
  const heading = await screen.findByRole("heading", { name: "Your roadmap is ready" });
  expect(document.activeElement).toBe(heading);
  expect(screen.getByText(/Timeline shows which steps depend on earlier approvals/)).toBeTruthy();
  expect(screen.getByText(/Start with/).textContent).toContain("Health permit");
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(screen.queryByRole("heading", { name: "Your roadmap is ready" })).toBeNull();
  expect(new URL(window.location.href).searchParams.has("created")).toBe(false);
  expect(new URL(window.location.href).searchParams.get("tab")).toBe("overview");
  expect(document.activeElement?.id).toBe("next-action-title");
});

// a normal visit does not show the welcome card
it("does not show new-roadmap orientation on an ordinary project visit", async () => {
  const project = sampleProject();
  saveProject(project);
  render(React.createElement(ProjectDashboard, { id: project.id, initialTab: "overview" }));
  await screen.findByRole("heading", { level: 1 });
  expect(screen.queryByRole("heading", { name: "Your roadmap is ready" })).toBeNull();
});

// two overlapping reads both stick, even if the second finishes first
it("retains both concurrent document attachments when file reads finish out of order in one batch", async () => {
  const project = { ...sampleProject(), documents: [] };
  saveProject(project);
  const readers: FileReader[] = [];
  vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) { readers.push(this); });
  render(React.createElement(ProjectDashboard, { id: project.id, initialTab: "documents" }));
  await screen.findByRole("heading", { level: 1 });
  const inputs = screen.getAllByLabelText(/Choose a file for/);
  fireEvent.change(inputs[0], { target: { files: [new File(["first"], "first-plan.pdf", { type: "application/pdf" })] } });
  fireEvent.change(inputs[1], { target: { files: [new File(["second"], "second-plan.pdf", { type: "application/pdf" })] } });
  expect(readers).toHaveLength(2);
  await act(async () => {
    // finish the second file before the first
    for (const reader of [readers[1], readers[0]]) {
      Object.defineProperty(reader, "result", { value: "data:application/pdf;base64,AA==" });
      reader.dispatchEvent(new ProgressEvent("load"));
    }
  });
  expect(screen.getByRole("button", { name: "Remove first-plan.pdf" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Remove second-plan.pdf" })).toBeTruthy();
  expect(getProject(project.id)?.documents.map((doc) => doc.name).sort()).toEqual(["first-plan.pdf", "second-plan.pdf"]);
});
