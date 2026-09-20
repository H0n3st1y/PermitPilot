"use client";

import { useCallback, useMemo } from "react";
import type { GraphNodeState } from "@/lib/engine/permitState";
import type { DisplayState } from "@/lib/engine/progress";
import { PHRASES, type PhraseKey } from "@/lib/i18n/phrases";
import { useCopy } from "@/lib/i18n/useCopy";
import type { OccupancyGroup, PermitStepStatus, ProjectType, Trade, ZoneDistrict } from "@/lib/types";

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
  projectType: (value: ProjectType) => string;
  occupancy: (value: OccupancyGroup) => string;
  zone: (value: ZoneDistrict) => string;
  trade: (value: Trade) => string;
  field: (field: string) => string;
  configValue: (field: string, value: unknown) => string;
  occupancyOptions: Record<OccupancyGroup, string>;
  zoneOptions: Record<ZoneDistrict, string>;
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

const PROJECT_TYPE_KEYS: Record<ProjectType, PhraseKey> = {
  food_business: "label.projectType.food_business",
  room_addition: "label.projectType.room_addition",
  public_event: "label.projectType.public_event",
  commercial_renovation: "label.projectType.commercial_renovation",
};

const OCCUPANCY_KEYS: Record<OccupancyGroup, PhraseKey> = {
  residential: "label.occupancy.residential",
  business: "label.occupancy.business",
  assembly: "label.occupancy.assembly",
  mercantile: "label.occupancy.mercantile",
  storage: "label.occupancy.storage",
};

const ZONE_KEYS: Record<ZoneDistrict, PhraseKey> = {
  residential: "label.zone.residential",
  downtown: "label.zone.downtown",
  commercial: "label.zone.commercial",
  waterfront: "label.zone.waterfront",
  industrial: "label.zone.industrial",
};

const TRADE_KEYS: Record<Trade, PhraseKey> = {
  electrical: "label.trade.electrical",
  plumbing: "label.trade.plumbing",
  mechanical: "label.trade.mechanical",
  gas: "label.trade.gas",
};

const FIELD_KEYS: Record<string, PhraseKey> = {
  projectType: "field.projectType",
  homeBased: "field.homeBased",
  foodPreparation: "field.foodPreparation",
  publicAttendance: "field.publicAttendance",
  zone: "field.zone",
  occupancy: "field.occupancy",
  occupantLoad: "field.occupantLoad",
  trades: "field.trades",
  squareFootage: "field.squareFootage",
  estimatedValuation: "field.estimatedValuation",
  visitorCount: "field.visitorCount",
};

function isProjectType(value: unknown): value is ProjectType {
  return typeof value === "string" && value in PROJECT_TYPE_KEYS;
}
function isOccupancy(value: unknown): value is OccupancyGroup {
  return typeof value === "string" && value in OCCUPANCY_KEYS;
}
function isZone(value: unknown): value is ZoneDistrict {
  return typeof value === "string" && value in ZONE_KEYS;
}
function isTrade(value: unknown): value is Trade {
  return typeof value === "string" && value in TRADE_KEYS;
}

export function isPhraseKey(value: string): value is PhraseKey {
  return value in PHRASES;
}

export function useLabels(): LabelApi {
  const { t } = useCopy();
  const occupancyOptions = useMemo(
    () =>
      ({
        residential: t(OCCUPANCY_KEYS.residential),
        business: t(OCCUPANCY_KEYS.business),
        assembly: t(OCCUPANCY_KEYS.assembly),
        mercantile: t(OCCUPANCY_KEYS.mercantile),
        storage: t(OCCUPANCY_KEYS.storage),
      }) satisfies Record<OccupancyGroup, string>,
    [t],
  );
  const zoneOptions = useMemo(
    () =>
      ({
        residential: t(ZONE_KEYS.residential),
        downtown: t(ZONE_KEYS.downtown),
        commercial: t(ZONE_KEYS.commercial),
        waterfront: t(ZONE_KEYS.waterfront),
        industrial: t(ZONE_KEYS.industrial),
      }) satisfies Record<ZoneDistrict, string>,
    [t],
  );

  const projectType = useCallback((value: ProjectType) => t(PROJECT_TYPE_KEYS[value]), [t]);
  const occupancy = useCallback((value: OccupancyGroup) => t(OCCUPANCY_KEYS[value]), [t]);
  const zone = useCallback((value: ZoneDistrict) => t(ZONE_KEYS[value]), [t]);
  const trade = useCallback((value: Trade) => t(TRADE_KEYS[value]), [t]);
  const field = useCallback((name: string) => (FIELD_KEYS[name] ? t(FIELD_KEYS[name]) : name), [t]);
  const configValue = useCallback(
    (name: string, value: unknown) => {
      if (Array.isArray(value)) {
        if (value.length === 0) return t("common.none");
        return value.map((item) => (isTrade(item) ? trade(item) : String(item))).join(", ");
      }
      if (typeof value === "boolean") return t(value ? "common.yes" : "common.no");
      if (typeof value === "number") {
        if (name === "squareFootage") return t("header.squareFeet", { value: value.toLocaleString() });
        if (name === "estimatedValuation") return `$${value.toLocaleString()}`;
        return value.toLocaleString();
      }
      if (value === null || value === undefined || value === "") return t("common.notProvided");
      if (name === "projectType" && isProjectType(value)) return projectType(value);
      if (name === "occupancy" && isOccupancy(value)) return occupancy(value);
      if (name === "zone" && isZone(value)) return zone(value);
      if (isTrade(value)) return trade(value);
      return String(value);
    },
    [occupancy, projectType, t, trade, zone],
  );

  return {
    status: useCallback((value: PermitStepStatus) => t(STATUS_KEYS[value]), [t]),
    displayState: useCallback((value: DisplayState) => t(DISPLAY_KEYS[value]), [t]),
    graphState: useCallback((value: GraphNodeState) => t(GRAPH_KEYS[value]), [t]),
    projectType,
    occupancy,
    zone,
    trade,
    field,
    configValue,
    occupancyOptions,
    zoneOptions,
  };
}
