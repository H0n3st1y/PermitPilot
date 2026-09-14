import { OCCUPANT_LOAD_FACTORS } from "@/fixtures/fees";
import { RULES } from "@/fixtures/rules";
import { hydrateStep, STEP_DEFINITIONS } from "@/fixtures/steps";
import { evaluateCondition } from "@/lib/engine/conditions";
import { scheduleSteps } from "@/lib/engine/timeline";
import type {
  EvaluationTrace,
  OccupancyGroup,
  PermitStep,
  ProjectConfig,
} from "@/lib/types";

export interface RuleEvaluation {
  steps: PermitStep[];
  traces: EvaluationTrace[];
  warnings: string[];
  occupantLoad: number;
}

export function estimateOccupantLoad(
  squareFootage: number,
  occupancy: OccupancyGroup,
): number {
  const factor = OCCUPANT_LOAD_FACTORS[occupancy]?.factor ?? 150;
  if (squareFootage <= 0) return 0;
  return Math.max(1, Math.ceil(squareFootage / factor));
}

export function buildEvaluationContext(config: ProjectConfig): Record<string, unknown> {
  return {
    ...config,
    occupantLoad: estimateOccupantLoad(config.squareFootage, config.occupancy),
  };
}

export function evaluateRules(
  config: ProjectConfig,
  now = new Date(),
): RuleEvaluation {
  const context = buildEvaluationContext(config);
  const occupantLoad = context.occupantLoad as number;
  const selected = new Map<string, ReturnType<typeof hydrateStep>>();
  const traces: EvaluationTrace[] = [];
  const warnings: string[] = [];
  const timestamp = now.toISOString();

  const orderedRules = [...RULES].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });

  for (const rule of orderedRules) {
    const [matched, conditions] = evaluateCondition(rule.conditions, context);
    if (!matched) continue;

    for (const warning of rule.actions.addWarnings) {
      if (!warnings.includes(warning)) warnings.push(warning);
    }

    for (const stepId of rule.actions.addSteps) {
      const definition = STEP_DEFINITIONS[stepId];
      if (!definition) {
        throw new Error(`Unknown step id in rule ${rule.id}: ${stepId}`);
      }
      if (!selected.has(stepId)) {
        selected.set(stepId, hydrateStep(definition, timestamp));
        traces.push({
          stepId,
          ruleId: rule.id,
          reason: rule.reason,
          matchedConditions: conditions,
        });
      }
    }
  }

  const selectedIds = new Set(selected.keys());
  const rawSteps = [...selected.values()].map((step) => {
    const definition = STEP_DEFINITIONS[step.id];
    const presentDependencies = step.dependencies.filter((id) => selectedIds.has(id));
    const dependencies =
      presentDependencies.length > 0
        ? presentDependencies
        : definition.dependencies.length > 0 &&
            selectedIds.has("zoning-review") &&
            step.id !== "zoning-review"
          ? ["zoning-review"]
          : presentDependencies;
    return {
      ...step,
      dependencies,
      parallelWith: step.parallelWith.filter((id) => selectedIds.has(id)),
    };
  });

  return {
    steps: scheduleSteps(rawSteps, config.desiredStartDate, now),
    traces,
    warnings,
    occupantLoad,
  };
}
