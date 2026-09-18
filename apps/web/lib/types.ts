/**
 * Shared domain types for PermitPilot.
 *
 * Data flow: ProjectConfig -> rules -> PermitStep[] (requirements + dependencies)
 * -> derived timeline forecast, fees, documents, and inspections.
 * Only user progress (statuses, uploads, checklist ticks) is persisted beside the
 * generated roadmap; everything else is derived from config + steps on demand.
 */

export type PermitStepStatus =
  | "not_started"
  | "preparing"
  | "submitted"
  | "in_review"
  | "needs_changes"
  | "approved";

export type ProjectType =
  | "food_business"
  | "room_addition"
  | "public_event"
  | "commercial_renovation";

export type OccupancyGroup =
  | "residential"
  | "business"
  | "assembly"
  | "mercantile"
  | "storage";

export type ZoneDistrict =
  | "residential"
  | "downtown"
  | "commercial"
  | "waterfront"
  | "industrial";

export type Trade = "electrical" | "plumbing" | "mechanical" | "gas";

export type InspectionType = "building" | "fire" | "health";

/**
 * verified: section number, title, and URL were checked against the publisher.
 * needs_review: a real source is expected but has not been checked yet.
 * demo: fictional Demo Harbor reference; no official source exists.
 */
export type VerificationStatus = "verified" | "needs_review" | "demo";

export type CitationSourceType = "model_code" | "federal_guidance" | "demo_ordinance";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "contains"
  | "exists";

export interface ConditionLeaf {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface ConditionGroup {
  all?: ConditionNode[];
  any?: ConditionNode[];
  none?: ConditionNode[];
}

export type ConditionNode = ConditionLeaf | ConditionGroup;

export interface CodeCitation {
  id: string;
  code: string;
  title: string;
  /** Paraphrase of the provision. Never presented as a verbatim quotation. */
  summary: string;
  plainLanguage: string;
  url: string | null;
  sourceType: CitationSourceType;
  publisher: string;
  edition?: string;
  verificationStatus: VerificationStatus;
  /** ISO date the URL and section were last checked. */
  verifiedOn?: string;
}

export interface DocumentRequirement {
  id: string;
  title: string;
  category: string;
  description: string;
  acceptedTypes: string[];
  required: boolean;
  /** Official blank form, when the municipality publishes one. Null means none is known. */
  officialFormUrl?: string | null;
}

export interface UploadedDocument {
  id: string;
  requirementId: string;
  stepId: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  /** True when the file bytes are stored in this browser and can be downloaded again. */
  stored: boolean;
  /** Placeholder records that ship with the sample project (no file bytes). */
  sample?: boolean;
}

export interface StatusEvent {
  status: PermitStepStatus;
  at: string;
  note?: string;
}

export interface PermitStep {
  id: string;
  title: string;
  shortTitle: string;
  department: string;
  description: string;
  plainLanguage: string;
  whyRequired: string;
  status: PermitStepStatus;
  statusChangedAt: string;
  history: StatusEvent[];
  dependencies: string[];
  parallelWith: string[];
  documents: DocumentRequirement[];
  citations: CodeCitation[];
  estimatedMinDays: number;
  estimatedMaxDays: number;
  /** Baseline plan computed when the roadmap was generated. */
  estimatedStartDate: string;
  estimatedEndDate: string;
  sequence: number;
}

export interface EvaluationTrace {
  stepId: string;
  ruleId: string;
  reason: string;
  matchedConditions: string[];
}

export interface Roadmap {
  id: string;
  projectId: string;
  steps: PermitStep[];
  warnings: string[];
  traces: EvaluationTrace[];
  rulesVersion: string;
  generatedAt: string;
}

/**
 * official: published by the municipality, with a cited source.
 * calculated: computed from a configured rate and your project inputs.
 * estimated: a planning figure, not a published rate.
 * unknown: a fee is expected but no amount can be given; excluded from totals.
 */
export type FeeBasisType = "official" | "calculated" | "estimated" | "unknown";

export interface FeeLineItem {
  id: string;
  stepId: string | null;
  label: string;
  department: string;
  /** Null when basisType is "unknown". */
  amount: number | null;
  basis: string;
  basisType: FeeBasisType;
  kind: "base" | "surcharge";
}

export interface FeeBreakdown {
  lineItems: FeeLineItem[];
  baseFees: number;
  surcharges: number;
  /** Sum of every item with a known amount. */
  total: number;
  unknownCount: number;
  currency: "USD";
  notes: string[];
}

export interface InspectionItem {
  id: string;
  inspectionType: InspectionType;
  department: "Building" | "Fire" | "Health";
  /** Roadmap steps that trigger this inspection. */
  stepIds: string[];
  title: string;
  description: string;
  plainLanguage: string;
  passingCriteria: string;
  citation?: CodeCitation;
  completed: boolean;
}

export interface ProjectConfig {
  name: string;
  projectType: ProjectType;
  squareFootage: number;
  occupancy: OccupancyGroup;
  zone: ZoneDistrict;
  estimatedValuation: number;
  trades: Trade[];
  homeBased: boolean;
  foodPreparation: boolean;
  publicAttendance: boolean;
  visitorCount?: number;
  desiredStartDate?: string;
  /** Opening, event, or move-in date the user is working toward. */
  targetDate?: string;
}

export interface Project {
  schemaVersion: 2;
  id: string;
  config: ProjectConfig;
  roadmap: Roadmap;
  documents: UploadedDocument[];
  /** Inspection checklist item id -> completed. */
  inspectionProgress: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface RuleDefinition {
  id: string;
  name: string;
  priority: number;
  conditions: ConditionNode;
  actions: {
    addSteps: string[];
    addWarnings: string[];
  };
  reason: string;
}

export interface StepDefinition {
  id: string;
  title: string;
  shortTitle: string;
  department: string;
  description: string;
  plainLanguage: string;
  whyRequired: string;
  dependencies: string[];
  parallelWith: string[];
  documents: DocumentRequirement[];
  citationIds: string[];
  estimatedMinDays: number;
  estimatedMaxDays: number;
}

export interface Bottleneck {
  stepId: string;
  kind: "blocked_dependency" | "stale_review" | "critical_path_delay" | "changes_requested" | "missing_documents";
  message: string;
  plainLanguage: string;
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  food_business: "Food business",
  room_addition: "Room addition",
  public_event: "Public event",
  commercial_renovation: "Commercial renovation",
};

export const OCCUPANCY_LABELS: Record<OccupancyGroup, string> = {
  residential: "Residential (R)",
  business: "Business (B)",
  assembly: "Assembly (A)",
  mercantile: "Mercantile (M)",
  storage: "Storage (S)",
};

export const ZONE_LABELS: Record<ZoneDistrict, string> = {
  residential: "Residential district",
  downtown: "Downtown district",
  commercial: "Commercial district",
  waterfront: "Waterfront overlay",
  industrial: "Industrial district",
};

export const TRADE_LABELS: Record<Trade, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  mechanical: "Mechanical / HVAC",
  gas: "Fuel gas",
};

export const INSPECTION_LABELS: Record<InspectionType, string> = {
  building: "Building",
  fire: "Fire",
  health: "Health",
};
