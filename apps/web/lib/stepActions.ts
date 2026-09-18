import { pendingDependencies, stepDocumentProgress, type DisplayState } from "@/lib/engine/progress";
import type { TimelineForecast } from "@/lib/engine/timeline";
import type { PermitStep, PermitStepStatus, UploadedDocument } from "@/lib/types";

export type StepActionKind =
  | { kind: "status"; status: PermitStepStatus }
  | { kind: "documents" }
  | { kind: "follow-up" };

export interface StepActionButton {
  label: string;
  action: StepActionKind;
}

export interface StepAction {
  headline: string;
  detail: string;
  tone: "primary" | "attention" | "blocked" | "done";
  primary?: StepActionButton;
  secondary?: StepActionButton;
}

export interface StepSituation {
  pendingNames: string[];
  missingDocuments: string[];
  overdue: boolean;
  blocked: boolean;
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The single most useful next move for a step, with the button that performs it.
 * Pure: derived from status, prerequisites, documents, and review timing only.
 */
export function recommendAction(step: PermitStep, situation: StepSituation): StepAction {
  const { pendingNames, missingDocuments, overdue, blocked } = situation;
  const dept = step.department;

  if (step.status === "approved") {
    return { headline: "Approved", detail: "Nothing more to do for this step. Keep the approval with your records.", tone: "done" };
  }

  if (step.status === "needs_changes") {
    return {
      headline: "Fix the requested changes and resubmit",
      detail: missingDocuments.length
        ? `Upload ${list(missingDocuments)}, then resubmit to ${dept}.`
        : `Update the documents ${dept} flagged, resubmit, then record it here.`,
      tone: "attention",
      primary: missingDocuments.length
        ? { label: "Upload documents", action: { kind: "documents" } }
        : { label: "Mark as resubmitted", action: { kind: "status", status: "submitted" } },
      secondary: { label: "Draft a question to the department", action: { kind: "follow-up" } },
    };
  }

  if (step.status === "submitted" || step.status === "in_review") {
    if (overdue) {
      return {
        headline: `Follow up with ${dept}`,
        detail: "This review is past its usual maximum. A short, specific email often gets it moving.",
        tone: "attention",
        primary: { label: "Draft follow-up email", action: { kind: "follow-up" } },
        secondary:
          step.status === "in_review"
            ? { label: "Record approval", action: { kind: "status", status: "approved" } }
            : { label: "Mark in review", action: { kind: "status", status: "in_review" } },
      };
    }
    return step.status === "submitted"
      ? {
          headline: `Waiting for ${dept} to accept the application`,
          detail: "Record the change when the department confirms review has started.",
          tone: "primary",
          primary: { label: "Mark in review", action: { kind: "status", status: "in_review" } },
        }
      : {
          headline: `${dept} is reviewing`,
          detail: "Record the decision when you hear back.",
          tone: "primary",
          primary: { label: "Record approval", action: { kind: "status", status: "approved" } },
          secondary: { label: "Changes requested", action: { kind: "status", status: "needs_changes" } },
        };
  }

  if (pendingNames.length > 0) {
    return {
      headline: blocked ? `Blocked by ${list(pendingNames)}` : `Starts after ${list(pendingNames)}`,
      detail: missingDocuments.length
        ? `You can gather ${plural(missingDocuments.length, "document")} now so you can submit as soon as it's clear.`
        : "Your documents are ready. Submit once the earlier steps are approved.",
      tone: blocked ? "blocked" : "primary",
      primary:
        step.status === "not_started" && missingDocuments.length
          ? { label: "Start preparing", action: { kind: "status", status: "preparing" } }
          : missingDocuments.length
            ? { label: "Upload documents", action: { kind: "documents" } }
            : undefined,
    };
  }

  if (missingDocuments.length > 0) {
    return {
      headline: `Upload ${plural(missingDocuments.length, "required document")}`,
      detail: `${list(missingDocuments)}. Then submit to ${dept}.`,
      tone: step.status === "preparing" ? "attention" : "primary",
      primary: { label: "Upload documents", action: { kind: "documents" } },
      secondary:
        step.status === "not_started" ? { label: "Mark as preparing", action: { kind: "status", status: "preparing" } } : undefined,
    };
  }

  return {
    headline: `Submit the application to ${dept}`,
    detail: "All required documents are uploaded. Submit through the department, then record it here.",
    tone: "primary",
    primary: { label: "Mark as submitted", action: { kind: "status", status: "submitted" } },
  };
}

export function situationFor(
  step: PermitStep,
  steps: PermitStep[],
  documents: UploadedDocument[],
  forecast: TimelineForecast,
  state: DisplayState,
): StepSituation {
  const byId = new Map(steps.map((item) => [item.id, item]));
  return {
    pendingNames: pendingDependencies(step, byId).map((dep) => dep.shortTitle),
    missingDocuments: stepDocumentProgress(documents, step).missing,
    overdue: Boolean(forecast.steps.get(step.id)?.overdue),
    blocked: state === "blocked",
  };
}
