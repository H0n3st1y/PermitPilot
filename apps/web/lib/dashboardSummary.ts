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

/** Summarizes recorded progress; attachments and estimates do not imply official approval. */
export function getDashboardSummary(project: Project, bottlenecks: Bottleneck[]): DashboardSummary {
  const steps = project.roadmap.steps;
  const byId = new Map(steps.map((step) => [step.id, step]));
  const attachments = new Map<string, Set<string>>();
  for (const document of project.documents) {
    const requirements = attachments.get(document.stepId) ?? new Set<string>();
    requirements.add(document.requirementId);
    attachments.set(document.stepId, requirements);
  }

  let requiredTotal = 0;
  let attachedRequired = 0;
  for (const step of steps) {
    for (const requirement of step.documents) {
      if (!requirement.required) continue;
      requiredTotal += 1;
      if (attachments.get(step.id)?.has(requirement.id)) attachedRequired += 1;
    }
  }

  function flaggedSteps(kind: Bottleneck["kind"]): PermitStep[] {
    const seen = new Set<string>();
    const result: PermitStep[] = [];
    for (const flag of bottlenecks) {
      if (flag.kind !== kind || seen.has(flag.stepId)) continue;
      const step = byId.get(flag.stepId);
      if (!step) continue;
      seen.add(step.id);
      result.push(step);
    }
    return result;
  }

  const reviewSteps = flaggedSteps("stale_review");
  return {
    approved: steps.filter((step) => step.status === "approved").length,
    total: steps.length,
    submitted: steps.filter((step) => step.status === "submitted").length,
    inReview: steps.filter((step) => step.status === "in_review").length,
    notStarted: steps.filter((step) => step.status === "not_started").length,
    missingRequired: requiredTotal - attachedRequired,
    requiredTotal,
    attachedRequired,
    blockedSteps: flaggedSteps("blocked_dependency"),
    reviewSteps,
    recommendedStep: reviewSteps[0] ?? nextAction(steps),
  };
}
