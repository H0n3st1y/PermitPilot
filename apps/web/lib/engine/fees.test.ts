import { describe, expect, it } from "vitest";
import { calculateFees, feesForStep } from "@/lib/engine/fees";
import { inspectionsFor } from "@/lib/engine/inspections";
import { evaluateRules } from "@/lib/engine/rules";
import { baseConfig } from "@/lib/engine/testUtils";
import type { ProjectConfig } from "@/lib/types";

function feesFor(config: ProjectConfig) {
  return calculateFees(config, evaluateRules(config).steps);
}

const construction: ProjectConfig = {
  ...baseConfig,
  projectType: "room_addition",
  homeBased: false,
  foodPreparation: false,
  estimatedValuation: 10000,
};

describe("calculateFees", () => {
  it("itemizes known fees, ties them to steps, and totals them", () => {
    const fees = feesFor({ ...baseConfig, trades: ["electrical"] });
    const ids = fees.lineItems.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(["fee-health", "fee-health-home", "fee-electrical", "fee-tech"]));
    expect(fees.lineItems.find((item) => item.id === "fee-electrical")?.stepId).toBe("electrical-permit");
    expect(fees.baseFees + fees.surcharges).toBeCloseTo(fees.total, 2);
    expect(fees.total).toBeGreaterThan(fees.baseFees);
  });

  it("labels every line with a basis and never labels demo rates as official", () => {
    const fees = feesFor({ ...construction, trades: ["electrical", "plumbing", "gas"] });
    for (const item of fees.lineItems) {
      expect(["calculated", "estimated", "unknown"]).toContain(item.basisType);
    }
    expect(fees.lineItems.find((item) => item.id === "fee-building")?.basisType).toBe("calculated");
    expect(fees.lineItems.find((item) => item.id === "fee-zoning")?.basisType).toBe("estimated");
  });

  it("keeps unknown fees out of the total", () => {
    const fees = feesFor(construction);
    const unknown = fees.lineItems.filter((item) => item.basisType === "unknown");
    expect(unknown.length).toBe(fees.unknownCount);
    expect(fees.unknownCount).toBeGreaterThan(0);
    expect(unknown.every((item) => item.amount === null)).toBe(true);
    const known = fees.lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0);
    expect(fees.total).toBeCloseTo(known, 2);
  });

  it("scales the building and plan review fees with valuation", () => {
    const low = feesFor(construction);
    const high = feesFor({ ...construction, estimatedValuation: 80000 });
    const amount = (fees: ReturnType<typeof feesFor>, id: string) => fees.lineItems.find((item) => item.id === id)?.amount ?? 0;
    expect(amount(low, "fee-building")).toBe(75 + 12 * 10);
    expect(amount(high, "fee-building")).toBe(75 + 12 * 80);
    expect(amount(high, "fee-plan-review")).toBeCloseTo((75 + 12 * 80) * 0.65, 2);
  });

  it("charges event attendance only above 50 people", () => {
    const event: ProjectConfig = { ...baseConfig, projectType: "public_event", homeBased: false, foodPreparation: false, publicAttendance: true };
    expect(feesFor({ ...event, visitorCount: 40 }).lineItems.find((item) => item.id === "fee-event")?.amount).toBe(75);
    expect(feesFor({ ...event, visitorCount: 120 }).lineItems.find((item) => item.id === "fee-event")?.amount).toBe(145);
  });

  it("returns step-specific fees", () => {
    const fees = feesFor(baseConfig);
    expect(feesForStep(fees, "health-permit").map((item) => item.id)).toEqual(["fee-health", "fee-health-home"]);
    expect(feesForStep(fees, "no-such-step")).toEqual([]);
  });
});

describe("inspectionsFor", () => {
  it("includes only inspection types triggered by roadmap steps", () => {
    const items = inspectionsFor(baseConfig, evaluateRules(baseConfig).steps);
    const types = new Set(items.map((item) => item.inspectionType));
    expect(types).toEqual(new Set(["fire", "health"]));
    expect(items.every((item) => item.stepIds.length > 0)).toBe(true);
  });

  it("filters items by project facts", () => {
    const addition = inspectionsFor(construction, evaluateRules(construction).steps).map((item) => item.id);
    expect(addition).not.toContain("fire-cooking");
    expect(addition).not.toContain("bldg-trades");
    expect(addition).not.toContain("fire-layout");
    const withTrades = { ...construction, trades: ["electrical" as const] };
    expect(inspectionsFor(withTrades, evaluateRules(withTrades).steps).map((item) => item.id)).toContain("bldg-trades");
  });

  it("applies saved progress", () => {
    const items = inspectionsFor(baseConfig, evaluateRules(baseConfig).steps, { "health-cfp": true });
    expect(items.find((item) => item.id === "health-cfp")?.completed).toBe(true);
    expect(items.find((item) => item.id === "health-handwash")?.completed).toBe(false);
  });
});
