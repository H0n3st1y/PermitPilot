import type { PermitStep } from "@/lib/types";

export const GRAPH_COL_WIDTH = 260;
export const GRAPH_ROW_HEIGHT = 132;
export const GRAPH_ORIGIN_X = 16;
export const GRAPH_ORIGIN_Y = 16;

export function rankSteps(steps: PermitStep[]): Map<string, number> {
  // how far right the node should sit
  const byId = new Map(steps.map((step) => [step.id, step]));
  const ranks = new Map<string, number>();

  // column number for one step, based on its deepest dependency
  function rankOf(id: string, stack: Set<string> = new Set()): number {
    const cached = ranks.get(id);
    // already figured this one out
    if (cached !== undefined) return cached;
    // a loop in the deps, don't recurse forever
    if (stack.has(id)) return 0;
    const step = byId.get(id);
    // missing step sits in the first column
    if (!step) return 0;
    stack.add(id);
    // one column past the furthest dependency, or column 0 if it has none
    const value =
      step.dependencies.length === 0
        ? 0
        : 1 + Math.max(0, ...step.dependencies.map((dependency) => rankOf(dependency, stack)));
    stack.delete(id);
    ranks.set(id, value);
    return value;
  }

  // rank every step, including ones nothing points at
  for (const step of steps) rankOf(step.id);
  return ranks;
}

export function layoutPermitGraph(steps: PermitStep[]): Map<string, { x: number; y: number }> {
  // dump each rank into a column so it looks like a flow
  const ranks = rankSteps(steps);
  const columns = new Map<number, PermitStep[]>();

  // bucket steps by column, keeping sequence order inside a column
  for (const step of [...steps].sort((a, b) => a.sequence - b.sequence)) {
    const rank = ranks.get(step.id) ?? 0;
    const column = columns.get(rank) ?? [];
    column.push(step);
    columns.set(rank, column);
  }

  const positions = new Map<string, { x: number; y: number }>();
  // rank moves right, index in the column moves down
  for (const [rank, column] of columns) {
    column.forEach((step, index) => {
      positions.set(step.id, {
        x: GRAPH_ORIGIN_X + rank * GRAPH_COL_WIDTH,
        y: GRAPH_ORIGIN_Y + index * GRAPH_ROW_HEIGHT,
      });
    });
  }
  return positions;
}
