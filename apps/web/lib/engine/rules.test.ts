import { describe, expect, it } from "vitest";
import { CITATIONS } from "@/fixtures/citations";
import { RULES } from "@/fixtures/rules";
import { STEP_DEFINITIONS } from "@/fixtures/steps";
import { evaluateCondition } from "@/lib/engine/conditions";
import { evaluateRules } from "@/lib/engine/rules";
import { scheduleSteps } from "@/lib/engine/timeline";
import { baseConfig, idsOf, makeStep } from "@/lib/engine/testUtils";

describe("evaluateRules", () => {
  it("selects a deterministic home food-business roadmap", () => {
    const first = evaluateRules(baseConfig);
    const second = evaluateRules(baseConfig);
    expect(first.steps.map((step) => step.id)).toEqual(second.steps.map((step) => step.id));
    expect(first.steps.map((step) => step.dependencies)).toEqual(second.steps.map((step) => step.dependencies));
    expect(new Set(idsOf())).toEqual(new Set(["zoning-review", "health-permit", "fire-review", "business-license"]));
    expect(first.traces[0]?.ruleId).toBe("home-food-business");
    expect(first.warnings.some((warning) => warning.includes("Home-based"))).toBe(true);
  });

  it("records a trace for every selected step", () => {
    const result = evaluateRules({ ...baseConfig, trades: ["gas"], zone: "waterfront" });
    expect(result.traces.map((trace) => trace.stepId).sort()).toEqual(result.steps.map((step) => step.id).sort());
    const gas = result.traces.find((trace) => trace.stepId === "gas-permit");
    expect(gas?.matchedConditions).toContain("trades contains gas");
  });

  it("adds trade permits and waterfront conservation when those inputs match", () => {
    const ids = idsOf({ trades: ["electrical", "plumbing"], zone: "waterfront" });
    expect(ids).toEqual(expect.arrayContaining(["electrical-permit", "plumbing-permit", "conservation-review"]));
    expect(ids).not.toContain("mechanical-permit");
  });

  it("builds a construction roadmap with occupancy close-out", () => {
    const ids = idsOf({ projectType: "room_addition", homeBased: false, foodPreparation: false });
    expect(ids).toEqual(
      expect.arrayContaining([
        "zoning-review",
        "building-permit",
        "plan-review",
        "fire-review",
        "final-inspection",
        "occupancy-certificate",
      ]),
    );
    expect(ids).not.toContain("health-permit");
  });

  it("adds health review only when a public event serves food", () => {
    const event = {
      projectType: "public_event" as const,
      homeBased: false,
      publicAttendance: true,
      visitorCount: 120,
      occupancy: "assembly" as const,
    };
    expect(idsOf({ ...event, foodPreparation: true })).toEqual(
      expect.arrayContaining(["event-permit", "fire-review", "public-works", "event-approval", "health-permit"]),
    );
    expect(idsOf({ ...event, foodPreparation: false })).not.toContain("health-permit");
  });

  it("triggers fire review from occupant load alone", () => {
    const small = idsOf({ projectType: "room_addition", occupancy: "storage", squareFootage: 600, foodPreparation: false, homeBased: false });
    expect(small).toContain("fire-review"); // room additions always include fire review
    const shop = evaluateRules({ ...baseConfig, projectType: "room_addition", occupancy: "mercantile", squareFootage: 3000 });
    expect(shop.occupantLoad).toBe(50);
    expect(shop.warnings.some((warning) => warning.includes("Occupant load of 50"))).toBe(true);
  });

  it("drops dependencies that are not on the roadmap and falls back to zoning", () => {
    const steps = evaluateRules({ ...baseConfig, trades: ["electrical"] }).steps;
    const electrical = steps.find((step) => step.id === "electrical-permit");
    expect(electrical?.dependencies).toEqual(["zoning-review"]);
    for (const step of steps) {
      for (const dep of step.dependencies) expect(steps.some((other) => other.id === dep)).toBe(true);
    }
  });

  it("orders steps so prerequisites always come first", () => {
    const steps = evaluateRules({ ...baseConfig, projectType: "room_addition", trades: ["electrical", "gas"], zone: "waterfront" }).steps;
    const position = new Map(steps.map((step, index) => [step.id, index]));
    for (const step of steps) {
      expect(step.sequence).toBe((position.get(step.id) ?? 0) + 1);
      for (const dep of step.dependencies) expect(position.get(dep)!).toBeLessThan(position.get(step.id)!);
    }
  });

  it("schedules parallel health and fire after zoning", () => {
    const result = evaluateRules(baseConfig, new Date("2026-09-14T12:00:00Z"));
    const byId = Object.fromEntries(result.steps.map((step) => [step.id, step]));
    expect(byId["health-permit"].estimatedStartDate).toBe(byId["fire-review"].estimatedStartDate);
    expect(byId["health-permit"].estimatedStartDate).toBe(byId["zoning-review"].estimatedEndDate);
    expect(byId["business-license"].dependencies).toEqual(expect.arrayContaining(["health-permit", "fire-review"]));
  });

  it("honours the desired start date", () => {
    const result = evaluateRules({ ...baseConfig, desiredStartDate: "2027-01-04" }, new Date("2026-09-14T12:00:00Z"));
    expect(result.steps[0].estimatedStartDate).toBe("2027-01-04");
  });
});

describe("configuration integrity", () => {
  it("only references known steps, citations, and dependencies", () => {
    for (const rule of RULES) {
      for (const stepId of rule.actions.addSteps) expect(STEP_DEFINITIONS[stepId], `${rule.id} -> ${stepId}`).toBeDefined();
    }
    for (const definition of Object.values(STEP_DEFINITIONS)) {
      for (const dep of definition.dependencies) expect(STEP_DEFINITIONS[dep], `${definition.id} -> ${dep}`).toBeDefined();
      for (const id of definition.citationIds) expect(CITATIONS[id], `${definition.id} -> ${id}`).toBeDefined();
      expect(definition.estimatedMinDays).toBeLessThanOrEqual(definition.estimatedMaxDays);
    }
  });

  it("never marks a citation verified without a URL and check date", () => {
    for (const citation of Object.values(CITATIONS)) {
      if (citation.verificationStatus === "verified") {
        expect(citation.url, citation.id).toMatch(/^https:\/\//);
        expect(citation.verifiedOn, citation.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (citation.sourceType === "demo_ordinance") {
        expect(citation.url, citation.id).toBeNull();
        expect(citation.verificationStatus, citation.id).toBe("demo");
      }
    }
  });
});

describe("evaluateCondition", () => {
  it("supports nested all/any/none groups", () => {
    const node = {
      all: [
        { field: "count", operator: "greater_than_or_equal" as const, value: 5 },
        { any: [{ field: "kind", operator: "equals" as const, value: "food" }, { field: "temp", operator: "equals" as const, value: true }] },
        { none: [{ field: "blocked", operator: "equals" as const, value: true }] },
      ],
    };
    expect(evaluateCondition(node, { count: 5, kind: "food", temp: false, blocked: false })[0]).toBe(true);
    expect(evaluateCondition(node, { count: 5, kind: "food", temp: false, blocked: true })[0]).toBe(false);
    expect(evaluateCondition(node, { count: 4, kind: "food", temp: true, blocked: false })[0]).toBe(false);
  });

  it("rejects unknown operators instead of guessing", () => {
    expect(() => evaluateCondition({ field: "x", operator: "like" as never, value: 1 }, { x: 1 })).toThrow(/Unsupported/);
  });
});

describe("scheduleSteps", () => {
  it("rejects circular dependencies", () => {
    expect(() => scheduleSteps([makeStep("one", ["two"]), makeStep("two", ["one"])])).toThrow(/Circular/);
  });
});
