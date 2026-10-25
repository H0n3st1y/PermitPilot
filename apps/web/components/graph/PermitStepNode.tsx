"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type PermitNodeData = {
  shortTitle: string;
  department: string;
  status: string;
  statusLabel: string;
  bottleneck: boolean;
  critical: boolean;
  selected: boolean;
  tourTarget?: string;
};

export type PermitFlowNode = Node<PermitNodeData, "permit">;

// one box on the graph: department, title, and status
function PermitStepNodeComponent({ data }: NodeProps<PermitFlowNode>) {
  return (
    <div
      data-tour={data.tourTarget}
      className={[
        "permit-node",
        `status-${data.status}`,
        data.bottleneck ? "is-bottleneck" : "",
        data.critical ? "is-critical" : "",
        data.selected ? "is-selected" : "",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} aria-hidden />
      <p className="permit-node-dept">{data.department}</p>
      <p className="permit-node-title">{data.shortTitle}</p>
      <p className="permit-node-status">{data.statusLabel}</p>
      <Handle type="source" position={Position.Right} aria-hidden />
    </div>
  );
}

// memo so panning the canvas does not redraw every box
export const PermitStepNode = memo(PermitStepNodeComponent);
