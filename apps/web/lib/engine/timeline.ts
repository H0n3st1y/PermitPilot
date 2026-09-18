import { STEP_DEFINITIONS } from "@/fixtures/steps";
import { addBusinessDays, localDay, parseISODate, toISODate } from "@/lib/dates";
import type { PermitStep } from "@/lib/types";

const CATALOG_ORDER = Object.keys(STEP_DEFINITIONS);

function catalogRank(id: string): number {
  const index = CATALOG_ORDER.indexOf(id);
  return index === -1 ? 999 : index;
}

function validateAcyclic(steps: Pick<PermitStep, "id" | "dependencies">[]): void {
  const graph = new Map(steps.map((step) => [step.id, step.dependencies]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(node: string): void {
    if (visiting.has(node)) throw new Error("Circular dependency detected");
    if (visited.has(node)) return;
    visiting.add(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) visit(node);
}

type Unscheduled = Omit<PermitStep, "sequence" | "estimatedStartDate" | "estimatedEndDate"> &
  Partial<Pick<PermitStep, "sequence" | "estimatedStartDate" | "estimatedEndDate">>;

/**
 * Baseline plan: prerequisites first, independent branches in parallel, each step
 * taking its maximum configured business-day duration.
 */
export function scheduleSteps(steps: Unscheduled[], desiredStartDate?: string, now = new Date()): PermitStep[] {
  validateAcyclic(steps);

  const start = desiredStartDate ? parseISODate(desiredStartDate) : parseISODate(localDay(now));
  const byId = new Map(steps.map((step) => [step.id, step]));
  const scheduled = new Map<string, PermitStep>();

  function schedule(step: Unscheduled): PermitStep {
    const existing = scheduled.get(step.id);
    if (existing) return existing;

    const begin = step.dependencies
      .map((id) => byId.get(id))
      .filter((item): item is Unscheduled => Boolean(item))
      .map(schedule)
      .reduce((latest, dependency) => {
        const end = parseISODate(dependency.estimatedEndDate);
        return end > latest ? end : latest;
      }, start);

    const complete: PermitStep = {
      ...step,
      sequence: step.sequence ?? 0,
      estimatedStartDate: toISODate(begin),
      estimatedEndDate: toISODate(addBusinessDays(begin, step.estimatedMaxDays)),
    };
    scheduled.set(step.id, complete);
    return complete;
  }

  for (const step of steps) schedule(step);

  return topologicalOrder([...scheduled.values()]).map((step, index) => ({ ...step, sequence: index + 1 }));
}

export function topologicalOrder<T extends Pick<PermitStep, "id" | "dependencies">>(steps: T[]): T[] {
  const remaining = new Map(steps.map((step) => [step.id, step]));
  const result: T[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((step) => step.dependencies.every((id) => !remaining.has(id)));
    if (ready.length === 0) throw new Error("Circular dependency detected");
    ready.sort((a, b) => catalogRank(a.id) - catalogRank(b.id) || a.id.localeCompare(b.id));
    for (const step of ready) {
      result.push(step);
      remaining.delete(step.id);
    }
  }

  return result;
}

export interface StepForecast {
  stepId: string;
  /** Actual start (submission) or projected start. */
  start: string;
  earliestEnd: string;
  latestEnd: string;
  /** True once the step is approved and its end date is an actual date. */
  actual: boolean;
  /** A submitted step has passed its maximum review time. */
  overdue: boolean;
}

export interface TimelineForecast {
  steps: Map<string, StepForecast>;
  earliestFinish: string;
  latestFinish: string;
}

function isoDay(timestamp: string): string {
  return localDay(timestamp);
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

function addDays(isoDate: string, days: number): string {
  return toISODate(addBusinessDays(parseISODate(isoDate), days));
}

/**
 * Most recent time the step entered `status`, falling back to the last status change.
 * Consecutive entries with the same status (notes) count from the first of the run.
 */
export function lastEntered(step: PermitStep, status: PermitStep["status"]): string {
  let index = step.history.length - 1;
  while (index >= 0 && step.history[index].status !== status) index -= 1;
  if (index < 0) return step.statusChangedAt;
  while (index > 0 && step.history[index - 1].status === status) index -= 1;
  return step.history[index].at;
}

/**
 * Current forecast from real progress. Approved steps use their approval date,
 * submitted/in-review steps count from submission, and remaining work cannot start
 * before today or before its prerequisites' projected completion.
 */
export function forecastTimeline(steps: PermitStep[], now = new Date(), desiredStartDate?: string): TimelineForecast {
  const today = localDay(now);
  const anchor = desiredStartDate && desiredStartDate > today ? desiredStartDate : today;
  const byId = new Map(steps.map((step) => [step.id, step]));
  const result = new Map<string, StepForecast>();

  function forecast(step: PermitStep): StepForecast {
    const cached = result.get(step.id);
    if (cached) return cached;

    const deps = step.dependencies
      .map((id) => byId.get(id))
      .filter((item): item is PermitStep => Boolean(item))
      .map(forecast);
    const depsEarliest = deps.reduce((latest, dep) => maxDate(latest, dep.earliestEnd), anchor);
    const depsLatest = deps.reduce((latest, dep) => maxDate(latest, dep.latestEnd), anchor);

    let entry: StepForecast;
    if (step.status === "approved") {
      const approvedOn = isoDay(lastEntered(step, "approved"));
      const submittedOn = step.history.some((event) => event.status === "submitted")
        ? isoDay(lastEntered(step, "submitted"))
        : step.estimatedStartDate;
      entry = {
        stepId: step.id,
        start: submittedOn < approvedOn ? submittedOn : approvedOn,
        earliestEnd: approvedOn,
        latestEnd: approvedOn,
        actual: true,
        overdue: false,
      };
    } else if (step.status === "submitted" || step.status === "in_review") {
      const submittedOn = isoDay(lastEntered(step, "submitted"));
      const plannedLatest = addDays(submittedOn, step.estimatedMaxDays);
      const overdue = plannedLatest < today;
      entry = {
        stepId: step.id,
        start: submittedOn,
        earliestEnd: maxDate(addDays(submittedOn, step.estimatedMinDays), today),
        latestEnd: overdue ? addDays(today, 1) : plannedLatest,
        actual: false,
        overdue,
      };
    } else {
      entry = {
        stepId: step.id,
        start: depsEarliest,
        earliestEnd: addDays(depsEarliest, step.estimatedMinDays),
        latestEnd: addDays(depsLatest, step.estimatedMaxDays),
        actual: false,
        overdue: false,
      };
    }
    result.set(step.id, entry);
    return entry;
  }

  for (const step of steps) forecast(step);

  const entries = [...result.values()];
  return {
    steps: result,
    earliestFinish: entries.reduce((latest, entry) => maxDate(latest, entry.earliestEnd), ""),
    latestFinish: entries.reduce((latest, entry) => maxDate(latest, entry.latestEnd), ""),
  };
}

/** Steps on the longest remaining chain, based on the latest projected finish. */
export function criticalPathIds(steps: PermitStep[], forecast: TimelineForecast): Set<string> {
  const ids = new Set<string>();
  if (steps.length === 0) return ids;
  const byId = new Map(steps.map((step) => [step.id, step]));
  const end = (id: string) => forecast.steps.get(id)?.latestEnd ?? "";

  function mark(step: PermitStep): void {
    if (ids.has(step.id)) return;
    ids.add(step.id);
    let latestDep: PermitStep | undefined;
    for (const id of step.dependencies) {
      const dependency = byId.get(id);
      if (dependency && (!latestDep || end(dependency.id) > end(latestDep.id))) latestDep = dependency;
    }
    if (latestDep) mark(latestDep);
  }

  for (const step of steps) {
    if (end(step.id) === forecast.latestFinish) mark(step);
  }
  return ids;
}
