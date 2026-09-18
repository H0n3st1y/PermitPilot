import { evaluateRules } from "@/lib/engine/rules";
import type { PermitStep, PermitStepStatus, ProjectConfig } from "@/lib/types";

/** Shared fixtures for engine tests. */
export const baseConfig: ProjectConfig = {
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

export function idsOf(config: Partial<ProjectConfig> = {}): string[] {
  return evaluateRules({ ...baseConfig, ...config }).steps.map((step) => step.id);
}

export function makeStep(id: string, dependencies: string[] = [], overrides: Partial<PermitStep> = {}): PermitStep {
  return {
    id,
    title: id,
    shortTitle: id,
    department: "Building",
    description: "",
    plainLanguage: "",
    whyRequired: "",
    status: "not_started",
    statusChangedAt: "2026-09-14T00:00:00.000Z",
    history: [],
    dependencies,
    parallelWith: [],
    documents: [],
    citations: [],
    estimatedMinDays: 2,
    estimatedMaxDays: 5,
    estimatedStartDate: "2026-09-14",
    estimatedEndDate: "2026-09-21",
    sequence: 1,
    ...overrides,
  };
}

/** Puts a step into `status` with a history entry at `at`. */
export function withStatus(step: PermitStep, status: PermitStepStatus, at: string, submittedAt?: string): PermitStep {
  const history = [
    ...(submittedAt ? [{ status: "submitted" as const, at: submittedAt }] : []),
    { status, at },
  ];
  return { ...step, status, statusChangedAt: at, history };
}
