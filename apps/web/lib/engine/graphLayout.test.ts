import { describe, expect, it } from "vitest";
import { layoutPermitGraph, rankSteps } from "@/lib/engine/graphLayout";
import { evaluateRules } from "@/lib/engine/rules";
import type { ProjectConfig } from "@/lib/types";

const config: ProjectConfig = {
  name: "Harbor Kitchen",
  projectType: "food_business",
  squareFootage: 420,
  occupancy: "residential",
  zone: "residential",
  estimatedValuation: 18000,
  trades: [],
  homeBased: true,
  foodPreparation: true,
  publicAttendance: false,
};

describe("graphLayout", () => {
  it("places zoning before later food-business steps", () => {
    const steps = evaluateRules(config).steps;
    const ranks = rankSteps(steps);
    expect(ranks.get("zoning-review")).toBe(0);
    expect(ranks.get("health-permit")).toBeGreaterThan(ranks.get("zoning-review") ?? 0);
    expect(ranks.get("business-license")).toBeGreaterThan(ranks.get("health-permit") ?? 0);
  });

  it("assigns unique coordinates for every step", () => {
    const steps = evaluateRules(config).steps;
    const positions = layoutPermitGraph(steps);
    expect(positions.size).toBe(steps.length);
    const keys = [...positions.values()].map((point) => `${point.x},${point.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
