import { STEP_DEFINITIONS } from "@/fixtures/steps";
import { addBusinessDays, parseISODate, toISODate } from "@/lib/dates";
import type { PermitStep } from "@/lib/types";

const CATALOG_ORDER = Object.keys(STEP_DEFINITIONS);

// where this step sits in the catalog, or way at the end if it's unknown
function catalogRank(id: string): number {
  const index = CATALOG_ORDER.indexOf(id);
  // unknown ids sort after every catalog step
  return index === -1 ? 999 : index;
}

// blow up if a step depends on itself somehow
function validateAcyclic(steps: PermitStep[]): void {
  const graph = new Map(steps.map((step) => [step.id, step.dependencies]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  // walk one step and the things it waits on
  function visit(node: string): void {
    // seeing a step again before we finish it means a loop
    if (visiting.has(node)) {
      throw new Error("Circular dependency detected");
    }
    // already checked this one
    if (visited.has(node)) return;
    visiting.add(node);
    // check each dependency first
    for (const dependency of graph.get(node) ?? []) {
      visit(dependency);
    }
    visiting.delete(node);
    visited.add(node);
  }

  // check every step, not just the ones something points at
  for (const node of graph.keys()) {
    visit(node);
  }
}

// date each step from the start date and its dependencies, then number them
export function scheduleSteps(
  steps: Array<Omit<PermitStep, "sequence" | "estimatedStartDate" | "estimatedEndDate"> & Partial<Pick<PermitStep, "sequence" | "estimatedStartDate" | "estimatedEndDate">>>,
  desiredStartDate?: string,
  now = new Date(),
): PermitStep[] {
  // fill in sequence and dates when the caller left them off
  const hydrated: PermitStep[] = steps.map((step, index) => ({
    ...step,
    sequence: step.sequence ?? index,
    estimatedStartDate: step.estimatedStartDate ?? toISODate(now),
    estimatedEndDate: step.estimatedEndDate ?? toISODate(now),
  }));
  validateAcyclic(hydrated);

  // prefer the requested start, otherwise today
  const start = desiredStartDate ? parseISODate(desiredStartDate) : now;
  const byId = new Map(hydrated.map((step) => [step.id, step]));
  const scheduled = new Map<string, PermitStep>();

  // date one step after its dependencies
  function schedule(step: PermitStep): PermitStep {
    const existing = scheduled.get(step.id);
    // already dated, don't do it twice
    if (existing) return existing;

    // date the dependencies first and keep their end dates
    const dependencyMilestones = step.dependencies
      .map((id) => byId.get(id))
      .filter((item): item is PermitStep => Boolean(item))
      .map(schedule);

    // cant start till the latest dep is done
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

  // date every step, dependencies first
  for (const step of hydrated) {
    schedule(step);
  }

  const ordered = topologicalOrder([...scheduled.values()]);
  // sequence follows that order, starting at 1
  return ordered.map((step, index) => ({ ...step, sequence: index + 1 }));
}

// steps with no leftover deps first
export function topologicalOrder(steps: PermitStep[]): PermitStep[] {
  const remaining = new Map(steps.map((step) => [step.id, step]));
  const result: PermitStep[] = [];

  // keep pulling steps whose dependencies are already placed
  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((step) =>
      step.dependencies.every((id) => !remaining.has(id)),
    );
    // nothing is ready, so the graph loops
    if (ready.length === 0) {
      throw new Error("Circular dependency detected");
    }
    // catalog order, then id, so the sort stays stable
    ready.sort((a, b) => catalogRank(a.id) - catalogRank(b.id) || a.id.localeCompare(b.id));
    for (const step of ready) {
      result.push(step);
      remaining.delete(step.id);
    }
  }

  return result;
}

// the chain that sets the last date
export function criticalPathIds(steps: PermitStep[]): Set<string> {
  // nothing to trace
  if (steps.length === 0) return new Set();
  // latest finish date in the whole plan
  const latest = steps.reduce((max, step) =>
    step.estimatedEndDate > max ? step.estimatedEndDate : max,
  "", );
  const ids = new Set<string>();
  const byId = new Map(steps.map((step) => [step.id, step]));

  // walk backward along the dependency that finishes last
  function mark(step: PermitStep): void {
    // already on the path
    if (ids.has(step.id)) return;
    ids.add(step.id);
    let latestDep: PermitStep | undefined;
    // find the dependency that ends latest
    for (const id of step.dependencies) {
      const dependency = byId.get(id);
      // skip deps that aren't in this plan
      if (!dependency) continue;
      if (!latestDep || dependency.estimatedEndDate > latestDep.estimatedEndDate) {
        latestDep = dependency;
      }
    }
    // keep walking back if there was a dependency
    if (latestDep) mark(latestDep);
  }

  // start from every step that lands on that latest date
  for (const step of steps) {
    if (step.estimatedEndDate === latest) mark(step);
  }
  return ids;
}
