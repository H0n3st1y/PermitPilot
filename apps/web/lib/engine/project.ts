import { differenceInCalendarDays, parseISODate } from "@/lib/dates";
import { calculateFees } from "@/lib/engine/fees";
import { inspectionsFor } from "@/lib/engine/inspections";
import { evaluateRules, estimateOccupantLoad } from "@/lib/engine/rules";
import type { PermitStep, Project, ProjectConfig } from "@/lib/types";

export function createProjectFromConfig(config: ProjectConfig, now = new Date()): Project {
  const evaluation = evaluateRules(config, now);
  const id = crypto.randomUUID();
  const createdAt = now.toISOString();

  return {
    id,
    config,
    roadmap: {
      id: `roadmap-${id}`,
      projectId: id,
      steps: evaluation.steps,
      warnings: evaluation.warnings,
      traces: evaluation.traces,
      estimatedTotalMinDays: scheduledSpanDays(evaluation.steps),
      estimatedTotalMaxDays: scheduledSpanDays(evaluation.steps),
    },
    documents: [],
    inspections: inspectionsFor(config, evaluation.steps),
    fees: calculateFees(config, evaluation.steps),
    createdAt,
    updatedAt: createdAt,
  };
}

function scheduledSpanDays(steps: PermitStep[]): number {
  if (steps.length === 0) return 0;
  const start = steps.reduce(
    (earliest, step) => (step.estimatedStartDate < earliest ? step.estimatedStartDate : earliest),
    steps[0].estimatedStartDate,
  );
  const end = steps.reduce(
    (latest, step) => (step.estimatedEndDate > latest ? step.estimatedEndDate : latest),
    steps[0].estimatedEndDate,
  );
  return Math.max(1, differenceInCalendarDays(parseISODate(end), parseISODate(start)));
}

export { estimateOccupantLoad };
