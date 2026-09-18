import { describe, expect, it } from "vitest";
import {
  classifySteps,
  dependencyStages,
  detectBottlenecks,
  displayStates,
  nextActions,
  projectProgress,
  stepDocumentProgress,
  type StepState,
} from "@/lib/engine/progress";
import { evaluateRules } from "@/lib/engine/rules";
import { forecastTimeline } from "@/lib/engine/timeline";
import { baseConfig, makeStep, withStatus } from "@/lib/engine/testUtils";
import type { PermitStep } from "@/lib/types";

const NOW = new Date("2026-09-14T12:00:00.000Z");

function roadmap(update: (step: PermitStep) => PermitStep = (step) => step): PermitStep[] {
  return evaluateRules(baseConfig, new Date("2026-08-01T12:00:00Z")).steps.map(update);
}

describe("forecastTimeline", () => {
  it("projects remaining work from today with min/max ranges", () => {
    const steps = roadmap();
    const forecast = forecastTimeline(steps, NOW);
    const zoning = forecast.steps.get("zoning-review")!;
    expect(zoning.start).toBe("2026-09-14");
    expect(zoning.earliestEnd).toBe("2026-09-21"); // 5 business days
    expect(zoning.latestEnd).toBe("2026-09-28"); // 10 business days
    const health = forecast.steps.get("health-permit")!;
    expect(health.start).toBe(zoning.earliestEnd);
    expect(forecast.earliestFinish < forecast.latestFinish).toBe(true);
  });

  it("uses the actual approval date for approved steps", () => {
    const steps = roadmap((step) =>
      step.id === "zoning-review" ? withStatus(step, "approved", "2026-09-10T15:00:00Z", "2026-09-01T15:00:00Z") : step,
    );
    const forecast = forecastTimeline(steps, NOW);
    const zoning = forecast.steps.get("zoning-review")!;
    expect(zoning).toMatchObject({ start: "2026-09-01", earliestEnd: "2026-09-10", latestEnd: "2026-09-10", actual: true });
    // Dependents cannot start in the past.
    expect(forecast.steps.get("health-permit")!.start).toBe("2026-09-14");
  });

  it("flags submitted reviews that exceed their maximum duration", () => {
    const steps = roadmap((step) => {
      if (step.id === "zoning-review") return withStatus(step, "approved", "2026-08-10T12:00:00Z");
      if (step.id === "health-permit") return withStatus(step, "in_review", "2026-08-12T12:00:00Z", "2026-08-11T12:00:00Z");
      return step;
    });
    const forecast = forecastTimeline(steps, NOW);
    expect(forecast.steps.get("health-permit")!.overdue).toBe(true);
    expect(forecast.steps.get("health-permit")!.latestEnd > "2026-09-14").toBe(true);
  });
});

describe("classifySteps", () => {
  it("marks completed, current, upcoming, and blocked steps", () => {
    const steps = [
      withStatus(makeStep("a"), "approved", "2026-09-01T00:00:00Z"),
      makeStep("b", ["a"]),
      makeStep("c", ["b"]),
      withStatus(makeStep("d"), "needs_changes", "2026-09-10T00:00:00Z"),
      makeStep("e", ["d"]),
    ];
    const states = classifySteps(steps, forecastTimeline(steps, NOW));
    expect(Object.fromEntries(states)).toEqual({
      a: "completed",
      b: "current",
      c: "upcoming",
      d: "current",
      e: "blocked",
    });
  });
});

describe("detectBottlenecks", () => {
  it("flags stale reviews, blocked dependents, and requested changes", () => {
    const steps = roadmap((step) => {
      if (step.id === "zoning-review") return withStatus(step, "approved", "2026-08-10T12:00:00Z");
      if (step.id === "health-permit") return withStatus(step, "in_review", "2026-08-12T12:00:00Z", "2026-08-11T12:00:00Z");
      if (step.id === "fire-review") return withStatus(step, "needs_changes", "2026-09-10T12:00:00Z");
      return step;
    });
    const bottlenecks = detectBottlenecks(steps, [], forecastTimeline(steps, NOW), NOW);
    const kinds = bottlenecks.map((item) => `${item.stepId}:${item.kind}`);
    expect(kinds).toContain("health-permit:stale_review");
    expect(kinds).toContain("fire-review:changes_requested");
    expect(kinds).toContain("fire-review:missing_documents");
    expect(kinds).toContain("business-license:blocked_dependency");
  });

  it("warns when a step is submitted before its prerequisites are approved", () => {
    const steps = roadmap((step) =>
      step.id === "fire-review" ? withStatus(step, "submitted", "2026-09-12T12:00:00Z", "2026-09-12T12:00:00Z") : step,
    );
    const bottlenecks = detectBottlenecks(steps, [], forecastTimeline(steps, NOW), NOW);
    expect(bottlenecks.find((item) => item.stepId === "fire-review")?.message).toMatch(/Submitted before Zoning review/);
  });

  it("does not flag missing documents once they are uploaded", () => {
    const steps = roadmap((step) => (step.id === "zoning-review" ? withStatus(step, "preparing", "2026-09-12T12:00:00Z") : step));
    const doc = {
      id: "d1",
      requirementId: "site-plan",
      stepId: "zoning-review",
      name: "plan.pdf",
      size: 10,
      mimeType: "application/pdf",
      uploadedAt: "",
      stored: true,
    };
    const forecast = forecastTimeline(steps, NOW);
    expect(detectBottlenecks(steps, [], forecast, NOW).some((item) => item.kind === "missing_documents")).toBe(true);
    expect(detectBottlenecks(steps, [doc], forecast, NOW).some((item) => item.kind === "missing_documents")).toBe(false);
  });
});

describe("nextActions and progress", () => {
  it("puts requested changes first and never suggests blocked steps", () => {
    const steps = roadmap((step) => {
      if (step.id === "zoning-review") return withStatus(step, "approved", "2026-09-01T12:00:00Z");
      if (step.id === "fire-review") return withStatus(step, "needs_changes", "2026-09-10T12:00:00Z");
      return step;
    });
    const actions = nextActions(steps, forecastTimeline(steps, NOW)).map((step) => step.id);
    expect(actions[0]).toBe("fire-review");
    expect(actions).toContain("health-permit");
    expect(actions).not.toContain("business-license");
  });

  it("reports completion", () => {
    const steps = roadmap((step) => withStatus(step, "approved", "2026-09-01T12:00:00Z"));
    expect(projectProgress(steps)).toMatchObject({ approved: 4, total: 4, percent: 100, complete: true });
    expect(nextActions(steps, forecastTimeline(steps, NOW))).toEqual([]);
  });

  it("counts only required documents", () => {
    const step = roadmap().find((item) => item.id === "business-license")!;
    expect(stepDocumentProgress([], step)).toMatchObject({ required: 1, complete: 0, done: false });
  });
});

describe("dependencyStages", () => {
  it("groups parallel steps and orders stages by dependency depth", () => {
    const stages = dependencyStages(roadmap()).map((stage) => stage.map((step) => step.id));
    expect(stages).toHaveLength(3);
    expect(stages[0]).toEqual(["zoning-review"]);
    expect([...stages[1]].sort()).toEqual(["fire-review", "health-permit"]);
    expect(stages[2]).toEqual(["business-license"]);
  });

  it("puts independent chains side by side", () => {
    const steps = [makeStep("a"), makeStep("b", ["a"]), makeStep("c"), makeStep("d", ["b", "c"])];
    expect(dependencyStages(steps).map((stage) => stage.map((step) => step.id))).toEqual([["a", "c"], ["b"], ["d"]]);
  });
});

describe("displayStates", () => {
  it("marks current steps with open problems as needing attention, leaving others unchanged", () => {
    const states = new Map<string, StepState>([["a", "current"], ["b", "current"], ["c", "blocked"]]);
    const result = displayStates(states, [
      { stepId: "a", kind: "missing_documents", message: "", plainLanguage: "" },
      { stepId: "b", kind: "critical_path_delay", message: "", plainLanguage: "" },
      { stepId: "c", kind: "blocked_dependency", message: "", plainLanguage: "" },
    ]);
    expect(Object.fromEntries(result)).toEqual({ a: "attention", b: "current", c: "blocked" });
  });
});
