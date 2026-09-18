import { describe, expect, it } from "vitest";
import { deriveProjectView } from "@/lib/engine/project";
import { derivePermitState, downstreamSteps, graphNodeState } from "@/lib/engine/permitState";
import { makeStep } from "@/lib/engine/testUtils";
import { sampleProject } from "@/lib/sample";
import type { PermitStepStatus, Project } from "@/lib/types";

/** Builds the shared state for a project exactly as the dashboard does. */
function stateFor(project: Project, now: Date) {
  return derivePermitState(project, deriveProjectView(project, now).forecast, now);
}

function setStatus(project: Project, stepId: string, status: PermitStepStatus, at: string): Project {
  return {
    ...project,
    roadmap: {
      ...project.roadmap,
      steps: project.roadmap.steps.map((step) =>
        step.id === stepId
          ? { ...step, status, statusChangedAt: at, history: [...step.history, { status, at }] }
          : step,
      ),
    },
  };
}

describe("downstreamSteps", () => {
  it("collects transitive dependents, nearest first", () => {
    const steps = [
      makeStep("a"),
      makeStep("b", ["a"]),
      makeStep("c", ["b"]),
      makeStep("unrelated"),
    ];
    expect(downstreamSteps("a", steps).map((step) => step.id)).toEqual(["b", "c"]);
    expect(downstreamSteps("c", steps)).toEqual([]);
  });

  it("does not loop forever on a diamond", () => {
    const steps = [makeStep("a"), makeStep("b", ["a"]), makeStep("c", ["a"]), makeStep("d", ["b", "c"])];
    expect(downstreamSteps("a", steps).map((step) => step.id).sort()).toEqual(["b", "c", "d"]);
  });
});

describe("graphNodeState", () => {
  it("maps engine classification onto the five node states", () => {
    expect(graphNodeState(makeStep("x", [], { status: "approved" }), "completed")).toBe("approved");
    expect(graphNodeState(makeStep("x", [], { status: "in_review" }), "current")).toBe("in_review");
    expect(graphNodeState(makeStep("x", [], { status: "submitted" }), "current")).toBe("in_review");
    expect(graphNodeState(makeStep("x", [], { status: "preparing" }), "current")).toBe("ready");
    expect(graphNodeState(makeStep("x", [], { status: "not_started" }), "blocked")).toBe("blocked");
    expect(graphNodeState(makeStep("x", [], { status: "not_started" }), "upcoming")).toBe("not_started");
  });
});

describe("the Harbor Kitchen walkthrough", () => {
  const now = new Date("2026-09-18T12:00:00.000Z");

  it("names the stalled health permit as the bottleneck, not the step it blocks", () => {
    const state = stateFor(sampleProject(now), now);
    expect(state.radar).not.toBeNull();
    // Business licence is the *symptom*; the health permit is the root cause.
    expect(state.radar!.step.id).toBe("health-permit");
    expect(state.radar!.step.department).toBe("Public Health");
  });

  it("reports what the bottleneck is holding up", () => {
    const state = stateFor(sampleProject(now), now);
    expect(state.radar!.blocked.map((step) => step.id)).toContain("business-license");
  });

  it("recommends contacting the department for a stalled review", () => {
    const state = stateFor(sampleProject(now), now);
    expect(state.radar!.bottleneck.kind).toBe("stale_review");
    expect(state.radar!.action.kind).toBe("contact_department");
    // The department comes from seed data; nothing is invented.
    expect(state.radar!.action.department).toBe("Public Health");
  });

  it("shows the blocked dependant as blocked on the graph", () => {
    const state = stateFor(sampleProject(now), now);
    expect(state.graphStates.get("health-permit")).toBe("in_review");
    expect(state.graphStates.get("business-license")).toBe("blocked");
  });

  /**
   * The demo's payoff: one approval has to ripple through every view at once.
   * Because they all read this object, asserting it here covers the graph, the
   * roadmap, the timeline, and the radar together.
   */
  it("unlocks the next step when health is approved", () => {
    const before = stateFor(sampleProject(now), now);
    expect(before.graphStates.get("business-license")).toBe("blocked");

    const after = stateFor(
      setStatus(sampleProject(now), "health-permit", "approved", now.toISOString()),
      now,
    );

    expect(after.graphStates.get("health-permit")).toBe("approved");
    // Fire review is already approved, so the licence is now fully unblocked.
    expect(after.graphStates.get("business-license")).toBe("ready");
    expect(after.pendingFor("business-license")).toEqual([]);
    // The old bottleneck is gone rather than merely restyled.
    expect(after.radar?.step.id).not.toBe("health-permit");
    expect(after.progress.approved).toBe(before.progress.approved + 1);
  });

  it("keeps every view reading one object", () => {
    const state = stateFor(sampleProject(now), now);
    for (const step of state.steps) {
      // Every step is classified exactly once, for all consumers.
      expect(state.display.has(step.id)).toBe(true);
      expect(state.graphStates.has(step.id)).toBe(true);
    }
    expect(state.stages.flat()).toHaveLength(state.steps.length);
  });
});

describe("primaryBottleneck", () => {
  const now = new Date("2026-09-18T12:00:00.000Z");

  it("returns null when nothing is stuck", () => {
    const project = sampleProject(now);
    const cleared = project.roadmap.steps.reduce(
      (acc, step) => setStatus(acc, step.id, "approved", now.toISOString()),
      project,
    );
    expect(stateFor(cleared, now).radar).toBeNull();
  });

  it("prefers requested changes over a missing document when impact ties", () => {
    const project = sampleProject(now);
    const withChanges = setStatus(project, "health-permit", "needs_changes", now.toISOString());
    const state = stateFor(withChanges, now);
    expect(state.radar!.step.id).toBe("health-permit");
    expect(state.radar!.action.kind).toBe("resubmit");
  });
});
