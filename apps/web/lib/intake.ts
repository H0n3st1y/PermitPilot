import type { PhraseKey } from "@/lib/i18n/phrases";
import type { OccupancyGroup, ProjectConfig, ProjectType } from "@/lib/types";

export const INTAKE_STEP_KEYS = ["intake.step.project", "intake.step.space", "intake.step.details"] as const satisfies readonly PhraseKey[];

export type IntakeErrorKey =
  | "intake.error.projectType"
  | "intake.error.squareFootageMin"
  | "intake.error.squareFootageMax"
  | "intake.error.valuationMin"
  | "intake.error.valuationMax"
  | "intake.error.name"
  | "intake.error.visitorCount"
  | "intake.error.targetDate";

/** Valuation only changes the result (the building permit fee) for construction projects. */
export function usesValuation(type: ProjectType): boolean {
  return type === "room_addition" || type === "commercial_renovation";
}

export type IntakeErrors = Partial<Record<keyof ProjectConfig, IntakeErrorKey>>;

export const EMPTY_CONFIG: ProjectConfig = {
  name: "",
  projectType: "food_business",
  squareFootage: 400,
  occupancy: "residential",
  zone: "residential",
  estimatedValuation: 15000,
  trades: [],
  homeBased: false,
  foodPreparation: true,
  publicAttendance: false,
  visitorCount: 0,
  desiredStartDate: "",
  targetDate: "",
};

/** Sensible defaults applied when the project type changes. The user can still override occupancy. */
export function defaultsForType(type: ProjectType): Pick<ProjectConfig, "occupancy" | "foodPreparation" | "publicAttendance"> {
  const occupancy: Record<ProjectType, OccupancyGroup> = {
    food_business: "residential",
    room_addition: "residential",
    commercial_renovation: "business",
    public_event: "assembly",
  };
  return {
    occupancy: occupancy[type],
    foodPreparation: type === "food_business",
    publicAttendance: type === "public_event",
  };
}

/** Validates the fields shown on a given intake page (0-based), or all pages when omitted. */
export function validateIntake(config: ProjectConfig, page?: number): IntakeErrors {
  const errors: IntakeErrors = {};
  const check = (target: number) => page === undefined || page === target;

  if (check(1)) {
    if (!Number.isFinite(config.squareFootage) || config.squareFootage < 1) {
      errors.squareFootage = "intake.error.squareFootageMin";
    } else if (config.squareFootage > 1_000_000) {
      errors.squareFootage = "intake.error.squareFootageMax";
    }
    if (!usesValuation(config.projectType)) {
      // Not asked for this project type; the stored default is not used by the rules.
    } else if (!Number.isFinite(config.estimatedValuation) || config.estimatedValuation < 0) {
      errors.estimatedValuation = "intake.error.valuationMin";
    } else if (config.estimatedValuation > 100_000_000) {
      errors.estimatedValuation = "intake.error.valuationMax";
    }
  }
  if (check(2)) {
    if (!config.name.trim()) errors.name = "intake.error.name";
    if (config.projectType === "public_event") {
      const visitors = config.visitorCount ?? 0;
      if (!Number.isFinite(visitors) || visitors < 0) errors.visitorCount = "intake.error.visitorCount";
    }
    if (config.desiredStartDate && config.targetDate && config.targetDate < config.desiredStartDate) {
      errors.targetDate = "intake.error.targetDate";
    }
  }
  return errors;
}

/** Cleans a draft into the config the rules engine evaluates. */
export function finalizeConfig(draft: ProjectConfig): ProjectConfig {
  return {
    ...draft,
    name: draft.name.trim(),
    homeBased: draft.projectType === "food_business" ? draft.homeBased : false,
    foodPreparation: draft.projectType === "food_business" ? true : draft.foodPreparation,
    publicAttendance: draft.projectType === "public_event" ? draft.publicAttendance : false,
    visitorCount: draft.projectType === "public_event" ? draft.visitorCount ?? 0 : undefined,
    desiredStartDate: draft.desiredStartDate || undefined,
    targetDate: draft.targetDate || undefined,
  };
}
