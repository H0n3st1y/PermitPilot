// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProjectHeader, ProjectPriorities } from "@/components/project/ProjectSummary";
import { getDashboardSummary } from "@/lib/dashboardSummary";
import { detectBottlenecks } from "@/lib/engine/bottlenecks";
import { sampleProject } from "@/lib/store";
import { translate } from "@/lib/i18n";
import type { Project } from "@/lib/types";

vi.mock("@/lib/a11y", () => ({ useA11y: () => ({ t: (key: string) => translate("en", key) }) }));
vi.mock("@/lib/supabase", () => ({ getCurrentUser: () => null, getSupabaseClient: () => null }));

// fixed date so the estimated finish does not move
const now = new Date("2026-10-24T12:00:00Z");

beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

// render the header and the priority cards together
function renderSummary(project: Project) {
  const summary = getDashboardSummary(project, detectBottlenecks(project.roadmap.steps, now));
  const onOpenStep = vi.fn();
  const onOpenDocuments = vi.fn();
  const onOpenTimeline = vi.fn();
  render(React.createElement(React.Fragment, null,
    React.createElement(ProjectHeader, { project, summary, saveState: "local" }),
    React.createElement(ProjectPriorities, { project, summary, onOpenStep, onOpenDocuments, onOpenTimeline }),
  ));
  return { summary, onOpenStep, onOpenDocuments, onOpenTimeline };
}

// no steps should not say everything is approved
it("shows an empty roadmap without claiming all steps are approved", () => {
  const project = sampleProject(now);
  project.roadmap.steps = [];
  project.documents = [];
  renderSummary(project);
  expect(screen.getByText("No permit steps")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Your roadmap has no permit steps yet" })).toBeTruthy();
  expect(screen.queryByText("All steps marked approved")).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.getByRole("link", { name: "Start a new project" }).getAttribute("href")).toBe("/intake");
  expect(screen.getByText("No schedule yet")).toBeTruthy();
});

// all approved still means recorded status, and missing files stay visible
it("qualifies all approvals as recorded checklist status and still reports missing attachments", () => {
  const project = sampleProject(now);
  // mark every step approved for this case
  project.roadmap.steps = project.roadmap.steps.map((step) => ({ ...step, status: "approved" }));
  project.documents = [];
  const { summary, onOpenDocuments } = renderSummary(project);
  expect(screen.getByText("All steps marked approved")).toBeTruthy();
  expect(screen.getByText("Recorded in your planning checklist.")).toBeTruthy();
  expect(screen.getByText("Keep your documents and approval records together. Confirm final requirements with your municipality.")).toBeTruthy();
  expect(summary.missingRequired).toBeGreaterThan(0);
  expect(screen.getByText(`${summary.missingRequired} missing attachments`)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Review document records" }));
  expect(onOpenDocuments).toHaveBeenCalledOnce();
});

// the sample health step, missing files, blocked step, and finish date all open
it("opens the recommended health review, real missing attachments, blocked step and estimated timeline", () => {
  const project = sampleProject(now);
  const { summary, onOpenStep, onOpenDocuments, onOpenTimeline } = renderSummary(project);
  expect(summary.recommendedStep?.id).toBe("health-permit");
  expect(screen.getByRole("heading", { name: "Check on Health permit" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Review Health permit" }));
  expect(onOpenStep).toHaveBeenLastCalledWith(summary.recommendedStep);
  fireEvent.click(screen.getByRole("button", { name: `Review ${summary.missingRequired} missing required attachments` }));
  expect(onOpenDocuments).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Review blocked steps" }));
  expect(onOpenStep).toHaveBeenLastCalledWith(summary.blockedSteps[0]);
  fireEvent.click(screen.getByRole("button", { name: "View estimated project timeline" }));
  expect(onOpenTimeline).toHaveBeenCalledOnce();
  expect(screen.getByText("Planning estimate, not a deadline")).toBeTruthy();
  expect(screen.getByText(/Estimated finish ·/)).toBeTruthy();
  expect(screen.queryByText(/overdue|deadline missed/i)).toBeNull();
  expect(screen.queryByRole("heading", { name: "Prepare Health permit" })).toBeNull();
});

// a not-started first step does not pretend earlier approvals exist
it("explains the first eligible step without implying approvals already exist", () => {
  const project = sampleProject(now);
  // every step is still not started
  project.roadmap.steps = project.roadmap.steps.map((step) => ({ ...step, status: "not_started" }));
  const { summary, onOpenStep } = renderSummary(project);
  expect(summary.recommendedStep?.dependencies).toEqual([]);
  expect(screen.getByText("This step does not depend on earlier approvals. Review this step’s requirements before you apply.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: `Review ${summary.recommendedStep?.shortTitle}` }));
  expect(onOpenStep).toHaveBeenCalledWith(summary.recommendedStep);
});
