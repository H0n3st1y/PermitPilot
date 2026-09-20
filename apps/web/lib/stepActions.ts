import { pendingDependencies, stepDocumentProgress, type DisplayState } from "@/lib/engine/progress";
import type { TimelineForecast } from "@/lib/engine/timeline";
import type { PhraseKey } from "@/lib/i18n/phrases";
import type { CopyVars } from "@/lib/i18n/types";
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

export type Translate = (key: PhraseKey, vars?: CopyVars) => string;

export function joinNames(names: string[], t: Translate): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} ${t("common.and")} ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ${t("common.and")} ${names[names.length - 1]}`;
}

/**
 * The single most useful next move for a step, with the button that performs it.
 * Pure: derived from status, prerequisites, documents, and review timing only.
 * Wording comes from `t` so locale stays downstream of the decision.
 */
export function recommendAction(step: PermitStep, situation: StepSituation, t: Translate): StepAction {
  const { pendingNames, missingDocuments, overdue, blocked } = situation;
  const department = step.department;
  const pending = joinNames(pendingNames, t);
  const missing = joinNames(missingDocuments, t);

  if (step.status === "approved") {
    return { headline: t("action.approved.headline"), detail: t("action.approved.detail"), tone: "done" };
  }

  if (step.status === "needs_changes") {
    return {
      headline: t("action.needsChanges.headline"),
      detail: missingDocuments.length
        ? t("action.needsChanges.detailMissing", { list: missing, department })
        : t("action.needsChanges.detailReady", { department }),
      tone: "attention",
      primary: missingDocuments.length
        ? { label: t("action.uploadDocuments"), action: { kind: "documents" } }
        : { label: t("action.markResubmitted"), action: { kind: "status", status: "submitted" } },
      secondary: { label: t("action.draftQuestion"), action: { kind: "follow-up" } },
    };
  }

  if (step.status === "submitted" || step.status === "in_review") {
    if (overdue) {
      return {
        headline: t("action.followUp.headline", { department }),
        detail: t("action.followUp.detail"),
        tone: "attention",
        primary: { label: t("action.draftFollowUp"), action: { kind: "follow-up" } },
        secondary:
          step.status === "in_review"
            ? { label: t("action.recordApproval"), action: { kind: "status", status: "approved" } }
            : { label: t("action.markInReview"), action: { kind: "status", status: "in_review" } },
      };
    }
    return step.status === "submitted"
      ? {
          headline: t("action.waiting.headline", { department }),
          detail: t("action.waiting.detail"),
          tone: "primary",
          primary: { label: t("action.markInReview"), action: { kind: "status", status: "in_review" } },
        }
      : {
          headline: t("action.reviewing.headline", { department }),
          detail: t("action.reviewing.detail"),
          tone: "primary",
          primary: { label: t("action.recordApproval"), action: { kind: "status", status: "approved" } },
          secondary: { label: t("action.changesRequested"), action: { kind: "status", status: "needs_changes" } },
        };
  }

  if (pendingNames.length > 0) {
    return {
      headline: blocked ? t("action.blocked.headline", { list: pending }) : t("action.startsAfter.headline", { list: pending }),
      detail: missingDocuments.length
        ? t(missingDocuments.length === 1 ? "action.pending.detailGatherOne" : "action.pending.detailGatherMany", {
            count: missingDocuments.length,
          })
        : t("action.pending.detailReady"),
      tone: blocked ? "blocked" : "primary",
      primary:
        step.status === "not_started" && missingDocuments.length
          ? { label: t("action.startPreparing"), action: { kind: "status", status: "preparing" } }
          : missingDocuments.length
            ? { label: t("action.uploadDocuments"), action: { kind: "documents" } }
            : undefined,
    };
  }

  if (missingDocuments.length > 0) {
    return {
      headline: t(missingDocuments.length === 1 ? "action.upload.headlineOne" : "action.upload.headlineMany", {
        count: missingDocuments.length,
      }),
      detail: t("action.upload.detail", { list: missing, department }),
      tone: step.status === "preparing" ? "attention" : "primary",
      primary: { label: t("action.uploadDocuments"), action: { kind: "documents" } },
      secondary:
        step.status === "not_started" ? { label: t("action.markPreparing"), action: { kind: "status", status: "preparing" } } : undefined,
    };
  }

  return {
    headline: t("action.submit.headline", { department }),
    detail: t("action.submit.detail"),
    tone: "primary",
    primary: { label: t("action.markSubmitted"), action: { kind: "status", status: "submitted" } },
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
