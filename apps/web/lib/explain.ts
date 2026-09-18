import {
  OCCUPANCY_LABELS,
  PROJECT_TYPE_LABELS,
  TRADE_LABELS,
  ZONE_LABELS,
} from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  projectType: "Project type",
  homeBased: "Home-based",
  foodPreparation: "Food preparation",
  publicAttendance: "Public attendance",
  zone: "Zoning district",
  occupancy: "Occupancy",
  occupantLoad: "Design occupant load",
  trades: "Trades",
  squareFootage: "Floor area",
  estimatedValuation: "Valuation",
  visitorCount: "Expected attendance",
};

const OPERATOR_TEXT: Record<string, string> = {
  equals: "is",
  not_equals: "is not",
  in: "is one of",
  not_in: "is not one of",
  greater_than: "is more than",
  greater_than_or_equal: "is at least",
  less_than: "is less than",
  less_than_or_equal: "is at most",
  contains: "include",
  exists: "is provided",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  projectType: PROJECT_TYPE_LABELS,
  occupancy: OCCUPANCY_LABELS,
  zone: ZONE_LABELS,
  trades: TRADE_LABELS,
};

/** Turns a rule-engine trace entry such as "trades contains gas" into readable text. */
export function describeMatchedCondition(condition: string): string {
  const match = /^(\w+) (\w+) (.*)$/.exec(condition);
  if (!match) return condition;
  const [, field, operator, rawValue] = match;
  const labels = VALUE_LABELS[field] ?? { true: "yes", false: "no" };
  const value = rawValue
    .split(",")
    .map((item) => labels[item] ?? item)
    .join(", ");
  return `${FIELD_LABELS[field] ?? field} ${OPERATOR_TEXT[operator] ?? operator} ${value}`;
}
