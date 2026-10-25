import { inspectionTemplates } from "@/fixtures/inspections";
import type { InspectionItem, InspectionType, PermitStep, ProjectConfig } from "@/lib/types";

export function inspectionsFor(config: ProjectConfig, steps: PermitStep[]): InspectionItem[] {
  // pick building / fire / health lists from whats on the map
  const ids = new Set(steps.map((step) => step.id));
  const types: InspectionType[] = [];

  // building checklist if any construction-ish permit is on the roadmap
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
  // fire checklist only when fire review is in the plan
  if (ids.has("fire-review")) {
    types.push("fire");
  }
  // health checklist for a health permit or any food prep
  if (ids.has("health-permit") || config.foodPreparation) {
    types.push("health");
  }

  return inspectionTemplates(types);
}
