import { criticalPathIds, type TimelineForecast } from "@/lib/engine/timeline";
import {
  classifySteps,
  dependencyStages,
  detectBottlenecks,
  displayStates,
  nextActions,
  pendingDependencies,
  projectProgress,
  stepDocumentProgress,
  type DisplayState,
  type ProjectProgress,
  type StepState,
} from "@/lib/engine/progress";
import { hasBeenSubmitted } from "@/lib/status";
import type { Bottleneck, PermitStep, Project } from "@/lib/types";

/**
 * The single source of truth for permit state.
 *
 * The roadmap, timeline, graph, dashboard, and bottleneck radar all render this
 * one object. None of them decides legal logic on its own: every status, block,
 * and recommendation below is computed from the deterministic rules engine's
 * output plus the applicant's recorded progress. Presentation state (locale,
 * plain-English wording, high contrast) is deliberately absent here, so no
 * display preference can reach a permit decision.
 */

/**
 * Node state shown on the dependency graph. Derived from the engine's own
 * classification, never set by a component.
 *
 * - `approved`     the department signed off
 * - `in_review`    submitted and sitting with a department
 * - `ready`        no prerequisite is outstanding, the applicant can act now
 * - `blocked`      a prerequisite is stalled or awaiting corrections
 * - `not_started`  waiting on prerequisites that are progressing normally
 */
export type GraphNodeState = "approved" | "in_review" | "ready" | "blocked" | "not_started";

export function graphNodeState(step: PermitStep, state: StepState): GraphNodeState {
  if (step.status === "approved") return "approved";
  if (hasBeenSubmitted(step.status)) return "in_review";
  if (state === "blocked") return "blocked";
  if (state === "upcoming") return "not_started";
  return "ready";
}

/** What the applicant should do about the current bottleneck. */
export interface RadarAction {
  /** Stable id so copy can be localized and plain-language simplified. */
  kind: "contact_department" | "resubmit" | "upload_documents" | "start_step" | "await_prerequisite";
  /** The department to approach, taken from seed data. Never invented. */
  department: string;
  stepId: string;
}

/**
 * The one step most worth acting on right now, with its downstream impact.
 *
 * Chosen by root cause, not by symptom: a step that is merely waiting on a
 * stalled prerequisite is never the bottleneck, the stalled prerequisite is.
 */
export interface BottleneckRadar {
  step: PermitStep;
  bottleneck: Bottleneck;
  /** Steps that cannot finish until this one is approved, nearest first. */
  blocked: PermitStep[];
  action: RadarAction;
  onCriticalPath: boolean;
}

/** Severity order used only to break ties between equally impactful bottlenecks. */
const KIND_SEVERITY: Record<Bottleneck["kind"], number> = {
  changes_requested: 0,
  stale_review: 1,
  missing_documents: 2,
  blocked_dependency: 3,
  critical_path_delay: 4,
};

/** Kinds that describe a problem with the step itself rather than with a prerequisite. */
const ROOT_CAUSE_KINDS = new Set<Bottleneck["kind"]>([
  "changes_requested",
  "stale_review",
  "missing_documents",
  "critical_path_delay",
]);

const ACTION_FOR_KIND: Record<Bottleneck["kind"], RadarAction["kind"]> = {
  changes_requested: "resubmit",
  stale_review: "contact_department",
  missing_documents: "upload_documents",
  critical_path_delay: "start_step",
  blocked_dependency: "await_prerequisite",
};

/** Steps that depend on `stepId`, directly or transitively, nearest first. */
export function downstreamSteps(stepId: string, steps: PermitStep[]): PermitStep[] {
  const dependents = new Map<string, PermitStep[]>();
  for (const step of steps) {
    for (const dependency of step.dependencies) {
      const list = dependents.get(dependency) ?? [];
      list.push(step);
      dependents.set(dependency, list);
    }
  }
  const found: PermitStep[] = [];
  const seen = new Set<string>([stepId]);
  let frontier = dependents.get(stepId) ?? [];
  while (frontier.length > 0) {
    const next: PermitStep[] = [];
    for (const step of frontier) {
      if (seen.has(step.id)) continue;
      seen.add(step.id);
      found.push(step);
      next.push(...(dependents.get(step.id) ?? []));
    }
    frontier = next;
  }
  return found;
}

/**
 * Picks the single bottleneck to surface.
 *
 * Impact first: the step holding up the most unfinished work wins, because
 * clearing it unlocks the most. Severity and roadmap order only break ties.
 */
export function primaryBottleneck(
  steps: PermitStep[],
  bottlenecks: Bottleneck[],
  critical: Set<string>,
): BottleneckRadar | null {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const candidates: Array<{ radar: BottleneckRadar; impact: number; severity: number }> = [];

  for (const bottleneck of bottlenecks) {
    if (!ROOT_CAUSE_KINDS.has(bottleneck.kind)) continue;
    const step = byId.get(bottleneck.stepId);
    if (!step || step.status === "approved") continue;
    const blocked = downstreamSteps(step.id, steps).filter((item) => item.status !== "approved");
    candidates.push({
      radar: {
        step,
        bottleneck,
        blocked,
        action: { kind: ACTION_FOR_KIND[bottleneck.kind], department: step.department, stepId: step.id },
        onCriticalPath: critical.has(step.id),
      },
      impact: blocked.length,
      severity: KIND_SEVERITY[bottleneck.kind],
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      b.impact - a.impact ||
      a.severity - b.severity ||
      Number(b.radar.onCriticalPath) - Number(a.radar.onCriticalPath) ||
      a.radar.step.sequence - b.radar.step.sequence,
  );
  return candidates[0].radar;
}

export interface DocumentTotals {
  required: number;
  complete: number;
}

export interface PermitState {
  steps: PermitStep[];
  byId: Map<string, PermitStep>;
  /** Dependency-depth columns: everything in one stage can run at the same time. */
  stages: PermitStep[][];
  states: Map<string, StepState>;
  display: Map<string, DisplayState>;
  graphStates: Map<string, GraphNodeState>;
  bottlenecks: Bottleneck[];
  /** Bottlenecks grouped by the step they belong to. */
  bottlenecksByStep: Map<string, Bottleneck[]>;
  radar: BottleneckRadar | null;
  actions: PermitStep[];
  progress: ProjectProgress;
  critical: Set<string>;
  docTotals: DocumentTotals;
  /** Prerequisites of a step that are not yet approved. */
  pendingFor: (stepId: string) => PermitStep[];
  /** Steps waiting on this one, directly or transitively. */
  downstreamFor: (stepId: string) => PermitStep[];
}

/**
 * Computes every derived permit fact once, from the rules engine's roadmap and
 * the recorded forecast. Components read this; they never recompute it.
 */
export function derivePermitState(project: Project, forecast: TimelineForecast, now: Date): PermitState {
  const steps = project.roadmap.steps;
  const byId = new Map(steps.map((step) => [step.id, step]));
  const states = classifySteps(steps, forecast);
  const bottlenecks = detectBottlenecks(steps, project.documents, forecast, now);
  const critical = criticalPathIds(steps, forecast);

  const graphStates = new Map<string, GraphNodeState>();
  for (const step of steps) {
    graphStates.set(step.id, graphNodeState(step, states.get(step.id) ?? "upcoming"));
  }

  const bottlenecksByStep = new Map<string, Bottleneck[]>();
  for (const bottleneck of bottlenecks) {
    const list = bottlenecksByStep.get(bottleneck.stepId) ?? [];
    list.push(bottleneck);
    bottlenecksByStep.set(bottleneck.stepId, list);
  }

  const docTotals = steps.reduce<DocumentTotals>(
    (sum, step) => {
      const progress = stepDocumentProgress(project.documents, step);
      return { required: sum.required + progress.required, complete: sum.complete + progress.complete };
    },
    { required: 0, complete: 0 },
  );

  const downstreamCache = new Map<string, PermitStep[]>();

  return {
    steps,
    byId,
    stages: dependencyStages(steps),
    states,
    display: displayStates(states, bottlenecks),
    graphStates,
    bottlenecks,
    bottlenecksByStep,
    radar: primaryBottleneck(steps, bottlenecks, critical),
    actions: nextActions(steps, forecast),
    progress: projectProgress(steps),
    critical,
    docTotals,
    pendingFor: (stepId) => {
      const step = byId.get(stepId);
      return step ? pendingDependencies(step, byId) : [];
    },
    downstreamFor: (stepId) => {
      const cached = downstreamCache.get(stepId);
      if (cached) return cached;
      const result = downstreamSteps(stepId, steps);
      downstreamCache.set(stepId, result);
      return result;
    },
  };
}
