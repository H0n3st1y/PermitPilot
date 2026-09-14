import { describe, expect, it } from "vitest";
import { detectBottlenecks } from "@/lib/engine/bottlenecks";
import { calculateFees } from "@/lib/engine/fees";
import { evaluateRules } from "@/lib/engine/rules";
import { scheduleSteps } from "@/lib/engine/timeline";
import type { PermitStep, ProjectConfig } from "@/lib/types";

const baseConfig: ProjectConfig = {
  name: "Test Kitchen",
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

function idsOf(config: Partial<ProjectConfig> = {}): string[] {
  return evaluateRules({ ...baseConfig, ...config }).steps.map((step) => step.id);
}

describe("evaluateRules", () => {
  it("selects a deterministic home food-business roadmap", () => {
    const first = evaluateRules(baseConfig);
    const second = evaluateRules(baseConfig);
    expect(first.steps.map((step) => step.id)).toEqual(second.steps.map((step) => step.id));
    expect(new Set(idsOf())).toEqual(
      new Set(["zoning-review", "health-permit", "fire-review", "business-license"]),
    );
    expect(first.traces[0]?.ruleId).toBe("home-food-business");
    expect(first.warnings.some((warning) => warning.includes("Home-based"))).toBe(true);
  });

  it("adds trade permits and waterfront conservation when those inputs match", () => {
    const ids = idsOf({
      trades: ["electrical", "plumbing"],
      zone: "waterfront",
    });
    expect(ids).toContain("electrical-permit");
    expect(ids).toContain("plumbing-permit");
    expect(ids).toContain("conservation-review");
  });

  it("builds a construction roadmap with occupancy close-out", () => {
    const ids = idsOf({
      projectType: "room_addition",
      homeBased: false,
      foodPreparation: false,
      occupancy: "residential",
    });
    expect(ids).toEqual(expect.arrayContaining([
      "zoning-review",
      "building-permit",
      "plan-review",
      "fire-review",
      "final-inspection",
      "occupancy-certificate",
    ]));
    expect(ids).not.toContain("health-permit");
  });

  it("adds health review when a public event serves food", () => {
    const ids = idsOf({
      projectType: "public_event",
      homeBased: false,
      foodPreparation: true,
      publicAttendance: true,
      visitorCount: 120,
      occupancy: "assembly",
    });
    expect(ids).toEqual(expect.arrayContaining([
      "event-permit",
      "fire-review",
      "public-works",
      "event-approval",
      "health-permit",
    ]));
  });

  it("schedules parallel health and fire after zoning", () => {
    const result = evaluateRules(baseConfig, new Date("2026-09-14T12:00:00Z"));
    const byId = Object.fromEntries(result.steps.map((step) => [step.id, step]));
    expect(byId["health-permit"].estimatedStartDate).toBe(byId["fire-review"].estimatedStartDate);
    expect(byId["health-permit"].estimatedStartDate).toBe(byId["zoning-review"].estimatedEndDate);
    expect(byId["business-license"].dependencies).toEqual(
      expect.arrayContaining(["health-permit", "fire-review"]),
    );
  });
});

describe("scheduleSteps", () => {
  it("rejects circular dependencies", () => {
    const circular: PermitStep[] = [
      {
        id: "one",
        title: "One",
        shortTitle: "One",
        department: "Building",
        description: "",
        plainLanguage: "",
        whyRequired: "",
        status: "not_started",
        statusChangedAt: "2026-09-14T00:00:00.000Z",
        dependencies: ["two"],
        parallelWith: [],
        documents: [],
        citations: [],
        estimatedMinDays: 1,
        estimatedMaxDays: 2,
        estimatedStartDate: "2026-09-14",
        estimatedEndDate: "2026-09-16",
        sequence: 1,
      },
      {
        id: "two",
        title: "Two",
        shortTitle: "Two",
        department: "Building",
        description: "",
        plainLanguage: "",
        whyRequired: "",
        status: "not_started",
        statusChangedAt: "2026-09-14T00:00:00.000Z",
        dependencies: ["one"],
        parallelWith: [],
        documents: [],
        citations: [],
        estimatedMinDays: 1,
        estimatedMaxDays: 2,
        estimatedStartDate: "2026-09-14",
        estimatedEndDate: "2026-09-16",
        sequence: 2,
      },
    ];
    expect(() => scheduleSteps(circular)).toThrow(/Circular/);
  });
});

describe("calculateFees", () => {
  it("itemizes base fees and surcharges from project metadata", () => {
    const steps = evaluateRules({
      ...baseConfig,
      trades: ["electrical"],
    }).steps;
    const fees = calculateFees({ ...baseConfig, trades: ["electrical"] }, steps);
    expect(fees.total).toBeGreaterThan(fees.baseFees);
    expect(fees.lineItems.some((item) => item.id === "fee-health")).toBe(true);
    expect(fees.lineItems.some((item) => item.id === "fee-health-home")).toBe(true);
    expect(fees.lineItems.some((item) => item.id === "fee-electrical")).toBe(true);
    expect(fees.lineItems.some((item) => item.id === "fee-tech")).toBe(true);
    expect(fees.baseFees + fees.surcharges).toBeCloseTo(fees.total, 2);
  });

  it("scales the building permit with valuation", () => {
    const construction: ProjectConfig = {
      ...baseConfig,
      projectType: "room_addition",
      homeBased: false,
      foodPreparation: false,
      estimatedValuation: 10000,
    };
    const low = calculateFees(construction, evaluateRules(construction).steps);
    const high = calculateFees(
      { ...construction, estimatedValuation: 80000 },
      evaluateRules({ ...construction, estimatedValuation: 80000 }).steps,
    );
    const lowBuilding = low.lineItems.find((item) => item.id === "fee-building")?.amount ?? 0;
    const highBuilding = high.lineItems.find((item) => item.id === "fee-building")?.amount ?? 0;
    expect(highBuilding).toBeGreaterThan(lowBuilding);
  });
});

describe("detectBottlenecks", () => {
  it("flags stale in-review steps and blocked dependents", () => {
    const evaluated = evaluateRules(baseConfig, new Date("2026-09-14T12:00:00Z"));
    const steps = evaluated.steps.map((step) => {
      if (step.id === "health-permit") {
        return {
          ...step,
          status: "in_review" as const,
          statusChangedAt: "2026-09-01T12:00:00.000Z",
        };
      }
      if (step.id === "zoning-review") {
        return { ...step, status: "approved" as const };
      }
      return step;
    });
    const bottlenecks = detectBottlenecks(steps, new Date("2026-09-14T12:00:00.000Z"));
    expect(bottlenecks.some((item) => item.kind === "stale_review" && item.stepId === "health-permit")).toBe(true);
    expect(bottlenecks.some((item) => item.kind === "blocked_dependency" && item.stepId === "business-license")).toBe(true);
  });
});
