import { describe, expect, it } from "vitest";
import {
  dependencyEdges,
  GRAPH_NODE_WIDTH,
  layoutStages,
} from "@/lib/engine/graphLayout";
import { dependencyStages } from "@/lib/engine/progress";
import { makeStep } from "@/lib/engine/testUtils";

describe("layoutStages", () => {
  it("puts each dependency depth in its own column, left to right", () => {
    const steps = [makeStep("a"), makeStep("b", ["a"]), makeStep("c", ["b"])];
    const positions = layoutStages(dependencyStages(steps));
    expect(positions.get("a")!.x).toBe(0);
    expect(positions.get("b")!.x).toBeGreaterThan(positions.get("a")!.x);
    expect(positions.get("c")!.x).toBeGreaterThan(positions.get("b")!.x);
    expect(positions.get("b")!.x - positions.get("a")!.x).toBeGreaterThanOrEqual(GRAPH_NODE_WIDTH);
  });

  it("stacks parallel steps in one column", () => {
    const steps = [
      makeStep("root"),
      makeStep("left", ["root"], { sequence: 1 }),
      makeStep("right", ["root"], { sequence: 2 }),
    ];
    const positions = layoutStages(dependencyStages(steps));
    expect(positions.get("left")!.x).toBe(positions.get("right")!.x);
    expect(positions.get("left")!.y).not.toBe(positions.get("right")!.y);
  });

  it("centres short columns against the tallest one", () => {
    const steps = [
      makeStep("root"),
      makeStep("a", ["root"], { sequence: 1 }),
      makeStep("b", ["root"], { sequence: 2 }),
      makeStep("c", ["root"], { sequence: 3 }),
    ];
    const positions = layoutStages(dependencyStages(steps));
    const column = [positions.get("a")!.y, positions.get("b")!.y, positions.get("c")!.y];
    const middle = (Math.min(...column) + Math.max(...column)) / 2;
    expect(positions.get("root")!.y).toBeCloseTo(middle, 5);
  });

  it("is deterministic", () => {
    const steps = [makeStep("a"), makeStep("b", ["a"])];
    const stages = dependencyStages(steps);
    expect([...layoutStages(stages)]).toEqual([...layoutStages(stages)]);
  });
});

describe("dependencyEdges", () => {
  it("draws one edge per prerequisite", () => {
    const steps = [makeStep("a"), makeStep("b"), makeStep("c", ["a", "b"])];
    expect(dependencyEdges(steps).map((edge) => edge.id).sort()).toEqual(["a->c", "b->c"]);
  });

  it("skips prerequisites that are not on this roadmap", () => {
    // Rules can reference a catalog step that was never selected for this project.
    const steps = [makeStep("c", ["not-selected"])];
    expect(dependencyEdges(steps)).toEqual([]);
  });
});
