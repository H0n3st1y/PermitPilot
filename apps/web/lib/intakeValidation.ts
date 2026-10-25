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

// blank or missing numbers should not sneak through as zero
function numericValue(value: number | string | undefined): number {
  // undefined and whitespace count as not-a-number
  return value === undefined || (typeof value === "string" && !value.trim()) ? NaN : Number(value);
}

// make sure the string is a real calendar day
function isCalendarDate(value: string): boolean {
  // needs the yyyy-mm-dd shape first
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  // year 0 is not a usable date
  if (year < 1) return false;
  // Date rolls overflow days forward, so compare the parts back
  const parsed = new Date(`${value}T12:00:00Z`);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

// gather the errors for the intake step the user is on
export function validateIntakeStep(step: number, draft: IntakeDraft, useCaseChosen: boolean): IntakeErrors {
  const errors: IntakeErrors = {};
  // first step is state plus project type
  if (step === 1) {
    // state has to be one we actually know
    if (!US_STATES.some((state) => state.code === draft.state)) errors.state = "Choose the state where this project will take place.";
    // use case has to be picked on purpose and still exist
    if (!useCaseChosen || !findUseCase(draft.useCase)) errors.useCase = "Choose the project type that best matches your plans.";
  }
  // second step is size and cost
  if (step === 2) {
    const area = numericValue(draft.squareFootage);
    const cost = numericValue(draft.estimatedValuation);
    // area has to be a real number above 0 and up to 1,000,000
    if (!Number.isFinite(area) || area <= 0 || area > 1000000) errors.squareFootage = "Enter an area greater than 0 and up to 1,000,000 square feet.";
    // cost can be zero, but not negative, huge, or non-numeric
    if (!Number.isFinite(cost) || cost < 0 || cost > 10000000) errors.estimatedValuation = "Enter an estimated cost from $0 to $10,000,000. Use 0 if no work is planned.";
  }
  // last step is the name, visitors, and optional start date
  if (step === 3) {
    // a blank name won't be findable later
    if (!draft.name.trim()) errors.name = "Give your project a name so you can find it later.";
    // visitors only matter for a public event that expects people
    if (draft.projectType === "public_event" && draft.publicAttendance) {
      const visitors = numericValue(draft.visitorCount);
      // whole numbers, zero or more
      if (!Number.isSafeInteger(visitors) || visitors < 0) errors.visitorCount = "Enter the expected number of visitors as a whole number, zero or more.";
    }
    // a filled-in start date has to be a real day
    if (draft.desiredStartDate && !isCalendarDate(draft.desiredStartDate)) errors.desiredStartDate = "Enter a valid date, or leave the planning start date blank.";
  }
  return errors;
}
