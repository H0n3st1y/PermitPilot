import { describe, expect, it } from "vitest";
import { validateIntakeStep, type IntakeDraft } from "@/lib/intakeValidation";

const draft: IntakeDraft = {
  name: "Community gathering", state: "NH", useCase: "neighborhood-event",
  projectType: "public_event", squareFootage: 400, estimatedValuation: 0,
  occupancy: "assembly", zone: "commercial", trades: [], homeBased: false,
  foodPreparation: false, publicAttendance: true, visitorCount: 25,
};

describe("intake validation", () => {
  it("requires a known state and an explicitly selected, known project type", () => {
    expect(validateIntakeStep(1, draft, true)).toEqual({});
    expect(validateIntakeStep(1, { ...draft, state: "XX", useCase: "old-option" }, true)).toHaveProperty("state");
    expect(validateIntakeStep(1, { ...draft, useCase: "old-option" }, true)).toHaveProperty("useCase");
    expect(validateIntakeStep(1, draft, false)).toHaveProperty("useCase");
  });

  it("does not silently turn an empty numeric input into zero", () => {
    const errors = validateIntakeStep(2, { ...draft, squareFootage: "", estimatedValuation: " " }, true);
    expect(Object.keys(errors)).toEqual(["squareFootage", "estimatedValuation"]);
    expect(validateIntakeStep(2, { ...draft, squareFootage: "400", estimatedValuation: "0" }, true)).toEqual({});
  });

  it.each([0, -1, 1000001, Infinity, NaN, "bad"])("rejects invalid area %s", (squareFootage) => {
    expect(validateIntakeStep(2, { ...draft, squareFootage }, true)).toHaveProperty("squareFootage");
  });

  it("accepts boundary estimates and rejects out-of-range or nonfinite cost", () => {
    expect(validateIntakeStep(2, { ...draft, squareFootage: 1000000, estimatedValuation: 10000000 }, true)).toEqual({});
    for (const estimatedValuation of [-1, 10000001, NaN, Infinity]) {
      expect(validateIntakeStep(2, { ...draft, estimatedValuation }, true)).toHaveProperty("estimatedValuation");
    }
  });

  it("requires a usable project name only on the final step", () => {
    expect(validateIntakeStep(3, { ...draft, name: "   " }, true)).toHaveProperty("name");
    expect(validateIntakeStep(2, { ...draft, name: "" }, true)).toEqual({});
  });

  it("requires a nonnegative whole visitor count only when public event attendance is enabled", () => {
    for (const visitorCount of [undefined, "", -1, 1.5, Infinity, NaN]) {
      expect(validateIntakeStep(3, { ...draft, visitorCount }, true)).toHaveProperty("visitorCount");
    }
    expect(validateIntakeStep(3, { ...draft, visitorCount: "0" }, true)).toEqual({});
    expect(validateIntakeStep(3, { ...draft, publicAttendance: false, visitorCount: "" }, true)).toEqual({});
    expect(validateIntakeStep(3, { ...draft, projectType: "food_business", visitorCount: -1 }, true)).toEqual({});
  });

  it("accepts optional and real past planning dates without inventing a filing deadline", () => {
    for (const desiredStartDate of [undefined, "", "2024-02-29", "2020-01-01"]) {
      expect(validateIntakeStep(3, { ...draft, desiredStartDate }, true)).toEqual({});
    }
    for (const desiredStartDate of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-1-1", "0000-01-01", "invalid"]) {
      expect(validateIntakeStep(3, { ...draft, desiredStartDate }, true)).toHaveProperty("desiredStartDate");
    }
  });
});
