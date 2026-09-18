"use client";

import { useCallback, useMemo, type RefObject } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { PermitNode, type PermitNodeType } from "@/components/graph/PermitNode";
import {
  dependencyEdges,
  GRAPH_NODE_HEIGHT,
  GRAPH_NODE_WIDTH,
  layoutStages,
} from "@/lib/engine/graphLayout";
import type { PermitState } from "@/lib/engine/permitState";
import { useLabels } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import "@xyflow/react/dist/style.css";

const NODE_TYPES: NodeTypes = { permit: PermitNode };
const FIT_VIEW = { padding: 0.14 } as const;

/**
 * The permit roadmap as its dependency graph.
 *
 * Every node and edge is read from the shared permit state; this component
 * decides nothing about permit logic. When a status changes upstream the graph
 * re-renders from the new state, so unlocking a step updates the picture in
 * place rather than through a reload.
 */
export function PermitGraph({
  headingRef,
  state,
  onOpenNode,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  state: PermitState;
  onOpenNode: (stepId: string) => void;
}) {
  const { t } = useCopy();
  const labels = useLabels();

  /**
   * The canvas mounts inside a lazily loaded chunk, so on its first paint the
   * box can still be zero-height and the initial fitView measures nothing. Re-fit
   * on the next frame, once the instance reports ready and the box is real.
   */
  const handleInit = useCallback((instance: ReactFlowInstance<PermitNodeType, Edge>) => {
    requestAnimationFrame(() => instance.fitView(FIT_VIEW));
  }, []);

  const nodes = useMemo<PermitNodeType[]>(() => {
    const positions = layoutStages(state.stages);
    const bottleneckId = state.radar?.step.id;
    /**
     * Everything the picture conveys, said in words: state, department,
     * prerequisites, and the two flags. A screen reader user gets the
     * dependency structure without a second, duplicated list to wade through.
     */
    const describeNode = (step: (typeof state.steps)[number], stateLabel: string) => {
      const prerequisites = step.dependencies
        .map((id) => state.byId.get(id)?.shortTitle)
        .filter(Boolean)
        .join(", ");
      return [
        `${step.shortTitle}, ${step.department}, ${stateLabel}.`,
        prerequisites ? `${t("why.unlockedBy")}: ${prerequisites}.` : t("why.noPrerequisites"),
        step.id === bottleneckId ? `${t("graph.legend.bottleneck")}.` : "",
        state.critical.has(step.id) ? `${t("graph.legend.critical")}.` : "",
        t("graph.nodeHint"),
      ]
        .filter(Boolean)
        .join(" ");
    };
    return state.steps.map((step) => {
      const nodeState = state.graphStates.get(step.id) ?? "not_started";
      return {
        id: step.id,
        type: "permit" as const,
        position: positions.get(step.id) ?? { x: 0, y: 0 },
        draggable: false,
        connectable: false,
        width: GRAPH_NODE_WIDTH,
        height: GRAPH_NODE_HEIGHT,
        data: {
          label: step.shortTitle,
          description: describeNode(step, labels.graphState(nodeState)),
          department: step.department,
          state: nodeState,
          stateLabel: labels.graphState(nodeState),
          isBottleneck: step.id === bottleneckId,
          isCritical: state.critical.has(step.id),
          bottleneckLabel: t("graph.legend.bottleneck"),
          criticalLabel: t("graph.legend.critical"),
          hint: t("graph.nodeHint"),
          onOpen: onOpenNode,
        },
      };
    });
  }, [state, labels, t, onOpenNode]);

  const edges = useMemo<Edge[]>(() => {
    const bottleneckId = state.radar?.step.id;
    return dependencyEdges(state.steps).map((edge) => {
      const source = state.byId.get(edge.source);
      const target = state.byId.get(edge.target);
      // A prerequisite that is already approved no longer gates anything, so the
      // edge reads as satisfied. One that is still open is drawn as a barrier.
      const satisfied = source?.status === "approved";
      const fromBottleneck = edge.source === bottleneckId;
      return {
        ...edge,
        type: "smoothstep",
        animated: false,
        focusable: false,
        ariaLabel: t("graph.edgeLabel", { from: source?.shortTitle ?? edge.source, to: target?.shortTitle ?? edge.target }),
        className: `gedge ${satisfied ? "gedge-satisfied" : "gedge-gating"} ${fromBottleneck ? "gedge-bottleneck" : ""}`,
      } satisfies Edge;
    });
  }, [state, t]);

  if (state.steps.length === 0) {
    return (
      <section aria-labelledby="section-heading">
        <SectionHeading headingRef={headingRef} title={t("graph.heading")} />
        <p className="callout callout-neutral">{t("graph.empty")}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="section-heading">
      <SectionHeading headingRef={headingRef} title={t("graph.heading")}>
        {t("graph.intro")}
      </SectionHeading>

      <GraphLegend />

      <div className="graph-canvas surface">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={FIT_VIEW}
          onInit={handleInit}
          minZoom={0.35}
          maxZoom={1.4}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          proOptions={{ hideAttribution: false }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}

function GraphLegend() {
  const { t } = useCopy();
  const labels = useLabels();
  const states = ["approved", "in_review", "ready", "blocked", "not_started"] as const;
  return (
    <ul className="graph-legend" aria-label={t("graph.legend")}>
      {states.map((value) => (
        <li key={value}>
          <span className={`legend-chip legend-${value}`} aria-hidden />
          {labels.graphState(value)}
        </li>
      ))}
      <li>
        <span className="legend-chip legend-bottleneck" aria-hidden />
        {t("graph.legend.bottleneck")}
      </li>
      <li>
        <span className="legend-chip legend-critical" aria-hidden />
        {t("graph.legend.critical")}
      </li>
    </ul>
  );
}
