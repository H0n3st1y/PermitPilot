import { differenceInCalendarDays } from "@/lib/dates";
import { criticalPathIds } from "@/lib/engine/timeline";
import type { Bottleneck, PermitStep } from "@/lib/types";

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function detectBottlenecks(steps: PermitStep[], now = new Date()): Bottleneck[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const critical = criticalPathIds(steps);
  const bottlenecks: Bottleneck[] = [];

  for (const step of steps) {
    const blocking = step.dependencies.filter((id) => {
      const dependency = byId.get(id);
      return dependency && dependency.status !== "approved";
    });

    if (step.status === "not_started" && blocking.length > 0) {
      const names = joinNames(blocking.map((id) => byId.get(id)?.shortTitle ?? id));
      bottlenecks.push({
        stepId: step.id,
        kind: "blocked_dependency",
        message: `Blocked until ${names} ${blocking.length === 1 ? "is" : "are"} approved.`,
        plainLanguage: `This step cannot start until earlier steps are marked approved: ${names}.`,
      });
    }

    if (step.status === "in_review") {
      const daysInReview = Math.max(
        0,
        differenceInCalendarDays(now, new Date(step.statusChangedAt)),
      );
      if (daysInReview >= step.estimatedMinDays) {
        bottlenecks.push({
          stepId: step.id,
          kind: "stale_review",
          message: `In review for ${daysInReview} day${daysInReview === 1 ? "" : "s"} (typical ${step.estimatedMinDays}–${step.estimatedMaxDays} business days).`,
          plainLanguage: `This review has been open longer than the usual minimum. Consider calling ${step.department}.`,
        });
      }
    }

    if (
      critical.has(step.id) &&
      step.status !== "approved" &&
      step.status === "not_started" &&
      blocking.length === 0 &&
      steps.some((other) => other.dependencies.includes(step.id) && other.status !== "approved")
    ) {
      bottlenecks.push({
        stepId: step.id,
        kind: "critical_path_delay",
        message: "On the critical path and not started; later steps cannot finish on the estimated date.",
        plainLanguage: "This is a key step. Starting it now helps keep the overall timeline on track.",
      });
    }
  }

  return bottlenecks;
}

export function nextAction(steps: PermitStep[]): PermitStep | undefined {
  const byId = new Map(steps.map((step) => [step.id, step]));
  return steps.find((step) => {
    if (step.status === "approved") return false;
    return step.dependencies.every((id) => byId.get(id)?.status === "approved");
  });
}
