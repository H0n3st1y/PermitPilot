import { describe, expect, it } from "vitest";
import { getDashboardSummary } from "@/lib/dashboardSummary";
import { sampleProject } from "@/lib/store";
import type { Bottleneck, DocumentRequirement, PermitStep, UploadedDocument } from "@/lib/types";

// a sample project with the steps and files we pass in
function fixture(steps: PermitStep[] = []) {
  const project = sampleProject(new Date("2026-10-24T12:00:00Z"));
  return { ...project, roadmap: { ...project.roadmap, steps }, documents: [] as UploadedDocument[] };
}

// one step copied from the sample, with the id and status we want
function step(id: string, status: PermitStep["status"] = "not_started"): PermitStep {
  const source = sampleProject(new Date("2026-10-24T12:00:00Z")).roadmap.steps[0];
  return { ...source, id, status, dependencies: [], documents: [] };
}

// a document requirement, required unless we say otherwise
function requirement(id: string, required = true): DocumentRequirement {
  return { id, title: id, category: "application_form", description: "", acceptedTypes: [], required };
}

// a fake upload tied to one step and one requirement
function attachment(stepId: string, requirementId: string): UploadedDocument {
  return { id: `${stepId}-${requirementId}`, stepId, requirementId, name: "plan.pdf", size: 12, mimeType: "application/pdf", uploadedAt: "2026-10-24T12:00:00Z", verified: false };
}

// a bottleneck flag with the kind we're testing
function flag(stepId: string, kind: Bottleneck["kind"]): Bottleneck {
  return { stepId, kind, message: "Recorded issue", plainLanguage: "Recorded issue" };
}

// counts, missing docs, and the recommended next step
describe("dashboard summary", () => {
  // an empty roadmap stays all zeros
  it("handles an empty roadmap without inventing a next step or completion", () => {
    const summary = getDashboardSummary(fixture(), []);
    expect(summary).toEqual({ approved: 0, total: 0, submitted: 0, inReview: 0, notStarted: 0, missingRequired: 0, requiredTotal: 0, attachedRequired: 0, blockedSteps: [], reviewSteps: [], recommendedStep: undefined });
  });

  // an approved step can still be missing its required file
  it("keeps recorded approvals independent from missing attachments", () => {
    const approved = { ...step("approved", "approved"), documents: [requirement("plan")] };
    const summary = getDashboardSummary(fixture([approved]), []);
    expect(summary.approved).toBe(1);
    expect(summary.total).toBe(1);
    expect(summary.missingRequired).toBe(1);
    expect(summary.recommendedStep).toBeUndefined();
  });

  // only a required file on the matching step counts
  it("matches required attachments by step and requirement, ignoring optional and orphan records", () => {
    const a = { ...step("a"), documents: [requirement("shared"), requirement("optional", false)] };
    const b = { ...step("b"), documents: [requirement("shared")] };
    const project = fixture([a, b]);
    project.documents = [attachment("a", "shared"), attachment("a", "shared"), attachment("a", "optional"), attachment("orphan", "shared"), attachment("b", "wrong")];
    const summary = getDashboardSummary(project, []);
    expect(summary.requiredTotal).toBe(2);
    expect(summary.attachedRequired).toBe(1);
    expect(summary.missingRequired).toBe(1);
  });

  // duplicate flags collapse, and flags for missing steps are ignored
  it("deduplicates matching flags, preserves flag order and ignores orphan flags", () => {
    const a = step("a", "in_review");
    const b = step("b", "in_review");
    const summary = getDashboardSummary(fixture([a, b]), [flag("orphan", "stale_review"), flag("b", "stale_review"), flag("b", "stale_review"), flag("a", "stale_review"), flag("a", "blocked_dependency"), flag("a", "critical_path_delay"), flag("a", "blocked_dependency"), flag("orphan", "blocked_dependency")]);
    expect(summary.reviewSteps.map((item) => item.id)).toEqual(["b", "a"]);
    expect(summary.blockedSteps.map((item) => item.id)).toEqual(["a"]);
    expect(summary.recommendedStep).toBe(b);
  });

  // the next action can be a submitted step, and a blocked one is skipped
  it("retains submitted next-action status and excludes steps with unmet prerequisites", () => {
    const blocked = { ...step("blocked"), dependencies: ["submitted"] };
    const submitted = step("submitted", "submitted");
    const review = step("review", "in_review");
    const approved = step("approved", "approved");
    const summary = getDashboardSummary(fixture([blocked, submitted, review, approved]), []);
    expect(summary.recommendedStep).toBe(submitted);
    expect(summary.recommendedStep?.status).toBe("submitted");
    expect([summary.notStarted, summary.submitted, summary.inReview, summary.approved]).toEqual([1, 1, 1, 1]);
  });
});
