import type { PermitStep } from "@/lib/types";

/**
 * Deterministic layout for the dependency graph.
 *
 * Pure geometry, no rendering library involved, so it can be tested directly
 * and swapped without touching the view. Columns come from dependency depth:
 * everything in one column can be worked on at the same time, and every edge
 * therefore points left to right, which is what makes prerequisite order
 * readable at a glance.
 */

export const GRAPH_NODE_WIDTH = 252;
export const GRAPH_NODE_HEIGHT = 112;
const COLUMN_GAP = 88;
const ROW_GAP = 28;

export interface NodePosition {
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

/**
 * Places each step in its dependency-depth column, with columns centred against
 * the tallest one so short columns do not hug the top edge.
 */
export function layoutStages(stages: PermitStep[][]): Map<string, NodePosition> {
  const columnHeight = (count: number) => count * GRAPH_NODE_HEIGHT + Math.max(0, count - 1) * ROW_GAP;
  const tallest = stages.reduce((max, stage) => Math.max(max, columnHeight(stage.length)), 0);
  const positions = new Map<string, NodePosition>();

  stages.forEach((stage, column) => {
    const offset = (tallest - columnHeight(stage.length)) / 2;
    stage.forEach((step, row) => {
      positions.set(step.id, {
        x: column * (GRAPH_NODE_WIDTH + COLUMN_GAP),
        y: offset + row * (GRAPH_NODE_HEIGHT + ROW_GAP),
      });
    });
  });

  return positions;
}

/** One edge per prerequisite, skipping dependencies that are not on this roadmap. */
export function dependencyEdges(steps: PermitStep[]): GraphEdge[] {
  const present = new Set(steps.map((step) => step.id));
  const edges: GraphEdge[] = [];
  for (const step of steps) {
    for (const dependency of step.dependencies) {
      if (!present.has(dependency)) continue;
      edges.push({ id: `${dependency}->${step.id}`, source: dependency, target: step.id });
    }
  }
  return edges;
}
