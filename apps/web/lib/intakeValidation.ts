import { US_STATES } from "@/fixtures/states";
import { findUseCase } from "@/fixtures/useCases";
import type { ProjectConfig } from "@/lib/types";

// Keep empty controls as empty strings while editing; convert only after validation.
export type IntakeDraft = Omit<ProjectConfig, "squareFootage" | "estimatedValuation" | "visitorCount"> & {
  squareFootage: number | string;
  estimatedValuation: number | string;
  visitorCount?: number | string;
};

export type IntakeField = "state" | "useCase" | "squareFootage" | "estimatedValuation" | "name" | "visitorCount" | "desiredStartDate";
export type IntakeErrors = Partial<Record<IntakeField, string>>;

function numericValue(value: number | string | undefined): number {
  return value === undefined || (typeof value === "string" && !value.trim()) ? NaN : Number(value);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function validateIntakeStep(step: number, draft: IntakeDraft, useCaseChosen: boolean): IntakeErrors {
  const errors: IntakeErrors = {};
  if (step === 1) {
    if (!US_STATES.some((state) => state.code === draft.state)) errors.state = "Choose the state where this project will take place.";
    if (!useCaseChosen || !findUseCase(draft.useCase)) errors.useCase = "Choose the project type that best matches your plans.";
  }
  if (step === 2) {
    const area = numericValue(draft.squareFootage);
    const cost = numericValue(draft.estimatedValuation);
    if (!Number.isFinite(area) || area <= 0 || area > 1000000) errors.squareFootage = "Enter an area greater than 0 and up to 1,000,000 square feet.";
    if (!Number.isFinite(cost) || cost < 0 || cost > 10000000) errors.estimatedValuation = "Enter an estimated cost from $0 to $10,000,000. Use 0 if no work is planned.";
  }
  if (step === 3) {
    if (!draft.name.trim()) errors.name = "Give your project a name so you can find it later.";
    if (draft.projectType === "public_event" && draft.publicAttendance) {
      const visitors = numericValue(draft.visitorCount);
      if (!Number.isSafeInteger(visitors) || visitors < 0) errors.visitorCount = "Enter the expected number of visitors as a whole number, zero or more.";
    }
    if (draft.desiredStartDate && !isCalendarDate(draft.desiredStartDate)) errors.desiredStartDate = "Enter a valid date, or leave the planning start date blank.";
  }
  return errors;
}
