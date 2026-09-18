"use client";

import { useCallback } from "react";
import type { GraphNodeState } from "@/lib/engine/permitState";
import type { DisplayState } from "@/lib/engine/progress";
import { useCopy } from "@/lib/i18n/useCopy";
import type { PhraseKey } from "@/lib/i18n/phrases";
import type { PermitStepStatus } from "@/lib/types";

/**
 * Localized labels for engine-produced enums.
 *
 * The engine emits stable identifiers (`in_review`, `blocked`); the interface
 * decides how to say them. Keeping the mapping here means a new language never
 * touches permit logic.
 */
export interface LabelApi {
  status: (value: PermitStepStatus) => string;
  displayState: (value: DisplayState) => string;
  graphState: (value: GraphNodeState) => string;
}

const STATUS_KEYS: Record<PermitStepStatus, PhraseKey> = {
  not_started: "status.not_started",
  preparing: "status.preparing",
  submitted: "status.submitted",
  in_review: "status.in_review",
  needs_changes: "status.needs_changes",
  approved: "status.approved",
};

const DISPLAY_KEYS: Record<DisplayState, PhraseKey> = {
  completed: "state.completed",
  current: "state.current",
  attention: "state.attention",
  blocked: "state.blocked",
  upcoming: "state.upcoming",
};

const GRAPH_KEYS: Record<GraphNodeState, PhraseKey> = {
  approved: "graph.state.approved",
  in_review: "graph.state.in_review",
  ready: "graph.state.ready",
  blocked: "graph.state.blocked",
  not_started: "graph.state.not_started",
};

export function useLabels(): LabelApi {
  const { t } = useCopy();
  return {
    status: useCallback((value: PermitStepStatus) => t(STATUS_KEYS[value]), [t]),
    displayState: useCallback((value: DisplayState) => t(DISPLAY_KEYS[value]), [t]),
    graphState: useCallback((value: GraphNodeState) => t(GRAPH_KEYS[value]), [t]),
  };
}
