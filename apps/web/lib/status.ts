import type { PermitStepStatus } from "@/lib/types";

/** Ordered as a step normally moves through them. */
export const PERMIT_STEP_STATUSES: PermitStepStatus[] = [
  "not_started",
  "preparing",
  "submitted",
  "in_review",
  "needs_changes",
  "approved",
];

export const STATUS_LABELS: Record<PermitStepStatus, string> = {
  not_started: "Not Started",
  preparing: "Preparing",
  submitted: "Submitted",
  in_review: "In Review",
  needs_changes: "Needs Changes",
  approved: "Approved",
};

/** What the applicant should do while a step is in each status. */
export const STATUS_GUIDANCE: Record<PermitStepStatus, string> = {
  not_started: "Review the requirements and start gathering the listed documents.",
  preparing: "Finish the required documents, then submit the application to the department.",
  submitted: "The department has your application. Watch for a completeness check or request for information.",
  in_review: "The department is reviewing. Respond quickly to any questions to avoid delays.",
  needs_changes: "The department asked for corrections. Update the documents and resubmit.",
  approved: "This step is complete. Keep the approval with your project records.",
};

/** The applicant is waiting on the department, not the other way round. */
export function isWaitingOnDepartment(status: PermitStepStatus): boolean {
  return status === "submitted" || status === "in_review";
}

/** The applicant has work to do on this step. */
export function isApplicantAction(status: PermitStepStatus): boolean {
  return status === "not_started" || status === "preparing" || status === "needs_changes";
}

/** The step has been handed to the department at least once. */
export function hasBeenSubmitted(status: PermitStepStatus): boolean {
  return status === "submitted" || status === "in_review" || status === "needs_changes" || status === "approved";
}

export function isPermitStepStatus(value: unknown): value is PermitStepStatus {
  return typeof value === "string" && (PERMIT_STEP_STATUSES as string[]).includes(value);
}
