import { STEP_DEFINITIONS } from "@/fixtures/steps";
import { addBusinessDays, parseISODate, toISODate } from "@/lib/dates";
import type { PermitStep } from "@/lib/types";

const CATALOG_ORDER = Object.keys(STEP_DEFINITIONS);

function catalogRank(id: string): number {
  const index = CATALOG_ORDER.indexOf(id);
  return index === -1 ? 999 : index;
}

function validateAcyclic(steps: PermitStep[]): void {
  const graph = new Map(steps.map((step) => [step.id, step.dependencies]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(node: string): void {
    if (visiting.has(node)) {
      throw new Error("Circular dependency detected");
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const dependency of graph.get(node) ?? []) {
      visit(dependency);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) {
    visit(node);
  }
}

export function scheduleSteps(
  steps: Array<Omit<PermitStep, "sequence" | "estimatedStartDate" | "estimatedEndDate"> & Partial<Pick<PermitStep, "sequence" | "estimatedStartDate" | "estimatedEndDate">>>,
  desiredStartDate?: string,
  now = new Date(),
): PermitStep[] {
  const hydrated: PermitStep[] = steps.map((step, index) => ({
    ...step,
    sequence: step.sequence ?? index,
    estimatedStartDate: step.estimatedStartDate ?? toISODate(now),
    estimatedEndDate: step.estimatedEndDate ?? toISODate(now),
  }));
  validateAcyclic(hydrated);

  const start = desiredStartDate ? parseISODate(desiredStartDate) : now;
  const byId = new Map(hydrated.map((step) => [step.id, step]));
  const scheduled = new Map<string, PermitStep>();

  function schedule(step: PermitStep): PermitStep {
    const existing = scheduled.get(step.id);
    if (existing) return existing;

    const dependencyMilestones = step.dependencies
      .map((id) => byId.get(id))
      .filter((item): item is PermitStep => Boolean(item))
      .map(schedule);

    const begin = dependencyMilestones.reduce((latest, dependency) => {
      const end = parseISODate(dependency.estimatedEndDate);
      return end > latest ? end : latest;
    }, start);

    const complete: PermitStep = {
      ...step,
      estimatedStartDate: toISODate(begin),
      estimatedEndDate: toISODate(addBusinessDays(begin, step.estimatedMaxDays)),
    };
    scheduled.set(step.id, complete);
    return complete;
  }

  for (const step of hydrated) {
    schedule(step);
  }

  const ordered = topologicalOrder([...scheduled.values()]);
  return ordered.map((step, index) => ({ ...step, sequence: index + 1 }));
}

export function topologicalOrder(steps: PermitStep[]): PermitStep[] {
  const remaining = new Map(steps.map((step) => [step.id, step]));
  const result: PermitStep[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((step) =>
      step.dependencies.every((id) => !remaining.has(id)),
    );
    if (ready.length === 0) {
      throw new Error("Circular dependency detected");
    }
    ready.sort((a, b) => catalogRank(a.id) - catalogRank(b.id) || a.id.localeCompare(b.id));
    for (const step of ready) {
      result.push(step);
      remaining.delete(step.id);
    }
  }

  return result;
}

export function criticalPathIds(steps: PermitStep[]): Set<string> {
  if (steps.length === 0) return new Set();
  const latest = steps.reduce((max, step) =>
    step.estimatedEndDate > max ? step.estimatedEndDate : max,
  "", );
  const ids = new Set<string>();
  const byId = new Map(steps.map((step) => [step.id, step]));

  function mark(step: PermitStep): void {
    if (ids.has(step.id)) return;
    ids.add(step.id);
    let latestDep: PermitStep | undefined;
    for (const id of step.dependencies) {
      const dependency = byId.get(id);
      if (!dependency) continue;
      if (!latestDep || dependency.estimatedEndDate > latestDep.estimatedEndDate) {
        latestDep = dependency;
      }
    }
    if (latestDep) mark(latestDep);
  }

  for (const step of steps) {
    if (step.estimatedEndDate === latest) mark(step);
  }
  return ids;
}
