import { differenceInCalendarDays, parseISODate } from "@/lib/dates";
import { calculateFees } from "@/lib/engine/fees";
import { inspectionsFor } from "@/lib/engine/inspections";
import { evaluateRules, estimateOccupantLoad } from "@/lib/engine/rules";
import type { PermitStep, Project, ProjectConfig } from "@/lib/types";

// build the whole project off the intake answers
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

// first start to last end so the banner can say how long it looks
function scheduledSpanDays(steps: PermitStep[]): number {
  // empty plan is zero days
  if (steps.length === 0) return 0;
  // earliest start among the steps
  const start = steps.reduce(
    (earliest, step) => (step.estimatedStartDate < earliest ? step.estimatedStartDate : earliest),
    steps[0].estimatedStartDate,
  );
  // latest end among the steps
  const end = steps.reduce(
    (latest, step) => (step.estimatedEndDate > latest ? step.estimatedEndDate : latest),
    steps[0].estimatedEndDate,
  );
  // at least one day even if start and end land on the same date
  return Math.max(1, differenceInCalendarDays(parseISODate(end), parseISODate(start)));
}

export { estimateOccupantLoad };
