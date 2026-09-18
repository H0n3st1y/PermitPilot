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

/** One condition from a rule trace, broken into its parts. */
export interface MatchedCondition {
  /** Config key the rule tested, e.g. `foodPreparation`. */
  field: string;
  fieldLabel: string;
  operator: string;
  operatorText: string;
  /** The expected value, rendered with human labels. */
  value: string;
  /** The original trace string, kept so nothing is lost in translation. */
  raw: string;
}

export function labelForField(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/** Renders a config value with the same labels the rule trace uses. */
export function labelForValue(field: string, value: unknown): string {
  const labels = VALUE_LABELS[field];
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => labels?.[String(item)] ?? String(item)).join(", ") : "None";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    // A bare number is ambiguous next to a label like "Floor area".
    if (field === "squareFootage") return `${value.toLocaleString()}\u00a0sq\u00a0ft`;
    if (field === "estimatedValuation") return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  }
  if (value === null || value === undefined || value === "") return "Not provided";
  return labels?.[String(value)] ?? String(value);
}

/**
 * Parses a rule-engine trace entry such as `trades contains gas`.
 *
 * The engine emits these as flat strings; the interface needs the parts so it
 * can show which answer triggered a rule rather than just restating the rule.
 */
export function parseMatchedCondition(condition: string): MatchedCondition | null {
  const match = /^(\w+) (\w+) (.*)$/.exec(condition);
  if (!match) return null;
  const [, field, operator, rawValue] = match;
  const labels = VALUE_LABELS[field] ?? { true: "yes", false: "no" };
  const value = rawValue
    .split(",")
    .map((item) => labels[item] ?? item)
    .join(", ");
  return {
    field,
    fieldLabel: labelForField(field),
    operator,
    operatorText: OPERATOR_TEXT[operator] ?? operator,
    value,
    raw: condition,
  };
}

/** Turns a rule-engine trace entry such as "trades contains gas" into readable text. */
export function describeMatchedCondition(condition: string): string {
  const parsed = parseMatchedCondition(condition);
  if (!parsed) return condition;
  return `${parsed.fieldLabel} ${parsed.operatorText} ${parsed.value}`;
}

/**
 * Formats a rule id for display as a citable identifier.
 *
 * Presentation only: `home-food-business` becomes `RULE-HOME-FOOD-BUSINESS`.
 * The engine's own id is unchanged, so the two never drift.
 */
export function formatRuleId(ruleId: string): string {
  return `RULE-${ruleId.toUpperCase()}`;
}
