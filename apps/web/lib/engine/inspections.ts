import { inspectionTemplates } from "@/fixtures/inspections";
import type { InspectionItem, InspectionType, PermitStep, ProjectConfig } from "@/lib/types";

export function inspectionsFor(config: ProjectConfig, steps: PermitStep[]): InspectionItem[] {
  const ids = new Set(steps.map((step) => step.id));
  const types: InspectionType[] = [];

  if (
    ids.has("building-permit") ||
    ids.has("plan-review") ||
    ids.has("final-inspection") ||
    ids.has("occupancy-certificate") ||
    ids.has("electrical-permit") ||
    ids.has("plumbing-permit") ||
    ids.has("mechanical-permit") ||
    ids.has("gas-permit")
  ) {
    types.push("building");
  }
  if (ids.has("fire-review")) {
    types.push("fire");
  }
  if (ids.has("health-permit") || config.foodPreparation) {
    types.push("health");
  }

  return inspectionTemplates(types);
}
