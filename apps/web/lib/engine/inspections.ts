import { inspectionTemplates } from "@/fixtures/inspections";
import { evaluateCondition } from "@/lib/engine/conditions";
import { buildEvaluationContext } from "@/lib/engine/rules";
import type { InspectionItem, InspectionType, PermitStep, ProjectConfig } from "@/lib/types";

/** Roadmap steps that lead to each kind of inspection. */
const TRIGGER_STEPS: Record<InspectionType, string[]> = {
  building: [
    "building-permit",
    "plan-review",
    "final-inspection",
    "occupancy-certificate",
    "electrical-permit",
    "plumbing-permit",
    "mechanical-permit",
    "gas-permit",
  ],
  fire: ["fire-review"],
  health: ["health-permit"],
};

const ORDER: InspectionType[] = ["building", "fire", "health"];

/**
 * Deterministic inspection checklist: an inspection type applies when a triggering
 * step is on the roadmap, and each item applies when its condition matches the project.
 */
export function inspectionsFor(
  config: ProjectConfig,
  steps: Pick<PermitStep, "id">[],
  progress: Record<string, boolean> = {},
): InspectionItem[] {
  const ids = new Set(steps.map((step) => step.id));
  const context = { ...buildEvaluationContext(config), stepIds: [...ids] };

  return ORDER.flatMap((type) => {
    const stepIds = TRIGGER_STEPS[type].filter((id) => ids.has(id));
    if (stepIds.length === 0) return [];
    return inspectionTemplates(type)
      .filter((template) => !template.appliesWhen || evaluateCondition(template.appliesWhen, context)[0])
      .map(({ appliesWhen: _appliesWhen, ...item }) => ({
        ...item,
        stepIds,
        completed: Boolean(progress[item.id]),
      }));
  });
}
