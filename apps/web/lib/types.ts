export type PermitStepStatus =
  | "not_started"
  | "submitted"
  | "in_review"
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

export type VerificationStatus = "verified" | "needs_review" | "demo";

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
  summary: string;
  plainLanguage: string;
  url: string | null;
  verificationStatus: VerificationStatus;
}

export interface DocumentRequirement {
  id: string;
  title: string;
  category: string;
  description: string;
  acceptedTypes: string[];
  required: boolean;
}

export interface UploadedDocument {
  id: string;
  requirementId: string;
  stepId: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  dataUrl?: string;
  verified: boolean;
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
  dependencies: string[];
  parallelWith: string[];
  documents: DocumentRequirement[];
  citations: CodeCitation[];
  estimatedMinDays: number;
  estimatedMaxDays: number;
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
  estimatedTotalMinDays: number;
  estimatedTotalMaxDays: number;
}

export interface FeeLineItem {
  id: string;
  label: string;
  department: string;
  amount: number;
  basis: string;
  kind: "base" | "surcharge";
}

export interface FeeBreakdown {
  lineItems: FeeLineItem[];
  baseFees: number;
  surcharges: number;
  total: number;
  currency: "USD";
  notes: string[];
}

export interface InspectionItem {
  id: string;
  inspectionType: InspectionType;
  department: "Building" | "Fire" | "Health";
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
}

export interface Project {
  id: string;
  config: ProjectConfig;
  roadmap: Roadmap;
  documents: UploadedDocument[];
  inspections: InspectionItem[];
  fees: FeeBreakdown;
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
  kind: "blocked_dependency" | "stale_review" | "critical_path_delay";
  message: string;
  plainLanguage: string;
}

export const PERMIT_STEP_STATUSES: PermitStepStatus[] = [
  "not_started",
  "submitted",
  "in_review",
  "approved",
];

export const STATUS_LABELS: Record<PermitStepStatus, string> = {
  not_started: "Not Started",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
};

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
