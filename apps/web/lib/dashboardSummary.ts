import { nextAction } from "@/lib/engine/bottlenecks";
import type { Bottleneck, PermitStep, Project } from "@/lib/types";

export interface DashboardSummary {
  approved: number;
  total: number;
  submitted: number;
  inReview: number;
  notStarted: number;
  missingRequired: number;
  requiredTotal: number;
  attachedRequired: number;
  blockedSteps: PermitStep[];
  reviewSteps: PermitStep[];
  recommendedStep: PermitStep | undefined;
}

// count progress, missing docs, and which step to work on next
export function getDashboardSummary(project: Project, bottlenecks: Bottleneck[]): DashboardSummary {
  const steps = project.roadmap.steps;
  const byId = new Map(steps.map((step) => [step.id, step]));
  const attachments = new Map<string, Set<string>>();
  // group uploaded requirement ids by step
  for (const document of project.documents) {
    const requirements = attachments.get(document.stepId) ?? new Set<string>();
    requirements.add(document.requirementId);
    attachments.set(document.stepId, requirements);
  }

  let requiredTotal = 0;
  let attachedRequired = 0;
  // count required docs, and how many of those are actually attached
  for (const step of steps) {
    for (const requirement of step.documents) {
      // optional docs don't count
      if (!requirement.required) continue;
      requiredTotal += 1;
      // this step already has a file for this requirement
      if (attachments.get(step.id)?.has(requirement.id)) attachedRequired += 1;
    }
  }

  // steps that have a given bottleneck, the first time we see each step
  function flaggedSteps(kind: Bottleneck["kind"]): PermitStep[] {
    const seen = new Set<string>();
    const result: PermitStep[] = [];
    for (const flag of bottlenecks) {
      // wrong kind, or we already listed this step
      if (flag.kind !== kind || seen.has(flag.stepId)) continue;
      const step = byId.get(flag.stepId);
      // flag points at a step that isn't in this project
      if (!step) continue;
      seen.add(step.id);
      result.push(step);
    }
    return result;
  }

  const reviewSteps = flaggedSteps("stale_review");
  return {
    // how many steps are in each status
    approved: steps.filter((step) => step.status === "approved").length,
    total: steps.length,
    submitted: steps.filter((step) => step.status === "submitted").length,
    inReview: steps.filter((step) => step.status === "in_review").length,
    notStarted: steps.filter((step) => step.status === "not_started").length,
    // required docs that still don't have a file
    missingRequired: requiredTotal - attachedRequired,
    requiredTotal,
    attachedRequired,
    blockedSteps: flaggedSteps("blocked_dependency"),
    reviewSteps,
    // a stale review comes first, otherwise the next step they can start
    recommendedStep: reviewSteps[0] ?? nextAction(steps),
  };
}
