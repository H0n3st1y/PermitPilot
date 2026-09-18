"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Check, CircleDashed, Clock, Lock, Play } from "lucide-react";
import type { GraphNodeState } from "@/lib/engine/permitState";

/**
 * One permit on the dependency graph.
 *
 * State is carried by four independent signals so no single channel is load
 * bearing: a shape-distinct icon, a border treatment, the status spelled out in
 * words, and (for the bottleneck) a labelled badge. Anyone who cannot separate
 * gold from grey still reads "Current bottleneck" in text.
 */
export type PermitNodeData = {
  label: string;
  /** Full spoken description: state, department, prerequisites, and flags. */
  description: string;
  department: string;
  state: GraphNodeState;
  stateLabel: string;
  isBottleneck: boolean;
  isCritical: boolean;
  bottleneckLabel: string;
  criticalLabel: string;
  hint: string;
  onOpen: (stepId: string) => void;
} & Record<string, unknown>;

export type PermitNodeType = Node<PermitNodeData, "permit">;

const STATE_ICON: Record<GraphNodeState, typeof Check> = {
  approved: Check,
  in_review: Clock,
  ready: Play,
  blocked: Lock,
  not_started: CircleDashed,
};

function PermitNodeComponent({ id, data, selected }: NodeProps<PermitNodeType>) {
  const Icon = STATE_ICON[data.state];
  const classes = [
    "gnode",
    `gnode-${data.state}`,
    data.isBottleneck ? "gnode-bottleneck" : "",
    data.isCritical ? "gnode-critical" : "",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {/* Target on the left, source on the right: every edge reads left to right. */}
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <button
        type="button"
        className="gnode-hit"
        onClick={() => data.onOpen(id)}
        title={data.hint}
        aria-label={data.description}
      >
        <span className="gnode-top">
          <span className="gnode-icon" aria-hidden>
            <Icon size={13} strokeWidth={2.75} />
          </span>
          <span className="gnode-state">{data.stateLabel}</span>
          {data.isCritical ? <span className="gnode-flag">{data.criticalLabel}</span> : null}
        </span>
        <span className="gnode-title">{data.label}</span>
        <span className="gnode-dept">{data.department}</span>
        {data.isBottleneck ? (
          <span className="gnode-badge">
            <AlertTriangle size={11} strokeWidth={2.75} aria-hidden />
            {data.bottleneckLabel}
          </span>
        ) : null}
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

export const PermitNode = memo(PermitNodeComponent);
