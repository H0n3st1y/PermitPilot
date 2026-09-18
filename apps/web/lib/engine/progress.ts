import { differenceInCalendarDays, localDay, parseISODate } from "@/lib/dates";
import { criticalPathIds, lastEntered, type TimelineForecast } from "@/lib/engine/timeline";
import { hasBeenSubmitted, isWaitingOnDepartment } from "@/lib/status";
import type { Bottleneck, PermitStep, UploadedDocument } from "@/lib/types";

/**
 * completed: approved.
 * current: the applicant can act now, or the department is actively reviewing it.
 * blocked: a prerequisite is stuck (changes requested or review overdue).
 * upcoming: waiting for prerequisites that are progressing normally.
 */
export type StepState = "completed" | "current" | "blocked" | "upcoming";

export const STEP_STATE_LABELS: Record<StepState, string> = {
  completed: "Completed",
  current: "Current",
  blocked: "Blocked",
  upcoming: "Upcoming",
};

export interface DocumentProgress {
  required: number;
  complete: number;
  missing: string[];
  done: boolean;
}

export function findDocument(
  documents: UploadedDocument[],
  stepId: string,
  requirementId: string,
): UploadedDocument | undefined {
  return documents.find((doc) => doc.stepId === stepId && doc.requirementId === requirementId);
}

export function stepDocumentProgress(documents: UploadedDocument[], step: PermitStep): DocumentProgress {
  const required = step.documents.filter((doc) => doc.required);
  const missing = required.filter((doc) => !findDocument(documents, step.id, doc.id)).map((doc) => doc.title);
  return {
    required: required.length,
    complete: required.length - missing.length,
    missing,
    done: missing.length === 0,
  };
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function pendingDependencies(step: PermitStep, byId: Map<string, PermitStep>): PermitStep[] {
  return step.dependencies
    .map((id) => byId.get(id))
    .filter((dep): dep is PermitStep => Boolean(dep) && dep!.status !== "approved");
}

/** Prerequisites (direct or indirect) that are stuck and holding this step up. */
function stuckAncestors(step: PermitStep, byId: Map<string, PermitStep>, forecast: TimelineForecast): PermitStep[] {
  const stuck: PermitStep[] = [];
  const seen = new Set<string>();
  const walk = (current: PermitStep) => {
    for (const id of current.dependencies) {
      const dep = byId.get(id);
      if (!dep || seen.has(id) || dep.status === "approved") continue;
      seen.add(id);
      if (dep.status === "needs_changes" || forecast.steps.get(id)?.overdue) stuck.push(dep);
      walk(dep);
    }
  };
  walk(step);
  return stuck;
}

export function classifySteps(steps: PermitStep[], forecast: TimelineForecast): Map<string, StepState> {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const states = new Map<string, StepState>();
  for (const step of steps) {
    if (step.status === "approved") {
      states.set(step.id, "completed");
    } else if (pendingDependencies(step, byId).length === 0 || hasBeenSubmitted(step.status)) {
      states.set(step.id, "current");
    } else if (stuckAncestors(step, byId, forecast).length > 0) {
      states.set(step.id, "blocked");
    } else {
      states.set(step.id, "upcoming");
    }
  }
  return states;
}

export function detectBottlenecks(
  steps: PermitStep[],
  documents: UploadedDocument[],
  forecast: TimelineForecast,
  now = new Date(),
): Bottleneck[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const critical = criticalPathIds(steps, forecast);
  const bottlenecks: Bottleneck[] = [];

  for (const step of steps) {
    if (step.status === "approved") continue;
    const pending = pendingDependencies(step, byId);
    const pendingNames = joinNames(pending.map((dep) => dep.shortTitle));

    if (step.status === "needs_changes") {
      bottlenecks.push({
        stepId: step.id,
        kind: "changes_requested",
        message: `${step.department} requested changes. Everything that depends on this step is on hold until you resubmit.`,
        plainLanguage: "The city asked you to fix something. Update your documents and send them back.",
      });
    }

    if (isWaitingOnDepartment(step.status) && forecast.steps.get(step.id)?.overdue) {
      const days = Math.max(0, differenceInCalendarDays(parseISODate(localDay(now)), parseISODate(localDay(lastEntered(step, "submitted")))));
      bottlenecks.push({
        stepId: step.id,
        kind: "stale_review",
        message: `With ${step.department} for ${days} calendar days, beyond the typical ${step.estimatedMinDays}–${step.estimatedMaxDays} business days.`,
        plainLanguage: `This review is taking longer than usual. Consider contacting ${step.department} for an update.`,
      });
    }

    if (pending.length > 0 && hasBeenSubmitted(step.status)) {
      bottlenecks.push({
        stepId: step.id,
        kind: "blocked_dependency",
        message: `Submitted before ${pendingNames} ${pending.length === 1 ? "was" : "were"} approved. The department may pause review until prerequisites clear.`,
        plainLanguage: `You sent this in early. The city may wait for ${pendingNames} first.`,
      });
    } else if (pending.length > 0) {
      const stuck = stuckAncestors(step, byId, forecast);
      if (stuck.length > 0) {
        const stuckNames = joinNames(stuck.map((dep) => dep.shortTitle));
        bottlenecks.push({
          stepId: step.id,
          kind: "blocked_dependency",
          message: `Blocked: ${stuckNames} ${stuck.length === 1 ? "is" : "are"} stalled or awaiting corrections.`,
          plainLanguage: `This step cannot move until ${stuckNames} gets unstuck.`,
        });
      }
    }

    if ((step.status === "preparing" || step.status === "needs_changes") && pending.length === 0) {
      const docs = stepDocumentProgress(documents, step);
      if (!docs.done) {
        bottlenecks.push({
          stepId: step.id,
          kind: "missing_documents",
          message: `${docs.missing.length} required document${docs.missing.length === 1 ? "" : "s"} missing: ${joinNames(docs.missing)}.`,
          plainLanguage: `Upload ${joinNames(docs.missing)} before you submit.`,
        });
      }
    }

    if (critical.has(step.id) && step.status === "not_started" && pending.length === 0) {
      bottlenecks.push({
        stepId: step.id,
        kind: "critical_path_delay",
        message: "On the critical path and not started. Every day of delay moves the projected finish date.",
        plainLanguage: "This is a key step. Starting it now keeps the whole project on schedule.",
      });
    }
  }

  return bottlenecks;
}

const ACTION_PRIORITY: Record<PermitStep["status"], number> = {
  needs_changes: 0,
  preparing: 1,
  not_started: 2,
  submitted: 3,
  in_review: 3,
  approved: 9,
};

/**
 * Steps the applicant should act on now, most urgent first: corrections, then
 * applications in preparation, then steps whose prerequisites are complete.
 * Critical-path steps sort ahead of others at the same urgency.
 */
export function nextActions(steps: PermitStep[], forecast: TimelineForecast): PermitStep[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const critical = criticalPathIds(steps, forecast);
  return steps
    .filter(
      (step) =>
        (step.status === "needs_changes" || step.status === "preparing" || step.status === "not_started") &&
        pendingDependencies(step, byId).length === 0,
    )
    .sort(
      (a, b) =>
        ACTION_PRIORITY[a.status] - ACTION_PRIORITY[b.status] ||
        Number(critical.has(b.id)) - Number(critical.has(a.id)) ||
        a.sequence - b.sequence,
    );
}

export interface ProjectProgress {
  approved: number;
  total: number;
  percent: number;
  complete: boolean;
  withDepartment: number;
}

export function projectProgress(steps: PermitStep[]): ProjectProgress {
  const approved = steps.filter((step) => step.status === "approved").length;
  return {
    approved,
    total: steps.length,
    percent: steps.length ? Math.round((approved / steps.length) * 100) : 0,
    complete: steps.length > 0 && approved === steps.length,
    withDepartment: steps.filter((step) => isWaitingOnDepartment(step.status)).length,
  };
}

/**
 * Groups steps into stages by dependency depth: stage 1 has no prerequisites on the
 * roadmap, stage N depends on something in stage N-1. Steps in one stage can run
 * at the same time. Order inside a stage follows roadmap sequence.
 */
export function dependencyStages(steps: PermitStep[]): PermitStep[][] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const depth = new Map<string, number>();
  const visit = (step: PermitStep, seen: Set<string>): number => {
    const known = depth.get(step.id);
    if (known !== undefined) return known;
    if (seen.has(step.id)) throw new Error("Circular dependency detected");
    seen.add(step.id);
    const level = step.dependencies.reduce((max, id) => {
      const dep = byId.get(id);
      return dep ? Math.max(max, visit(dep, seen) + 1) : max;
    }, 0);
    depth.set(step.id, level);
    return level;
  };
  const stages: PermitStep[][] = [];
  for (const step of [...steps].sort((a, b) => a.sequence - b.sequence)) {
    const level = visit(step, new Set());
    (stages[level] ??= []).push(step);
  }
  return stages.filter(Boolean);
}

/** Roadmap display state: a current step with an open problem is shown as needing attention. */
export type DisplayState = StepState | "attention";

const ATTENTION_KINDS = new Set<Bottleneck["kind"]>(["changes_requested", "stale_review", "missing_documents"]);

export function displayStates(states: Map<string, StepState>, bottlenecks: Bottleneck[]): Map<string, DisplayState> {
  const flagged = new Set(bottlenecks.filter((item) => ATTENTION_KINDS.has(item.kind)).map((item) => item.stepId));
  const result = new Map<string, DisplayState>();
  for (const [id, state] of states) {
    result.set(id, state === "current" && flagged.has(id) ? "attention" : state);
  }
  return result;
}
