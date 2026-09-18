import { formatLongDate, localDay } from "@/lib/dates";
import { lastEntered } from "@/lib/engine/timeline";
import { STATUS_LABELS } from "@/lib/status";
import type { PermitStep, Project } from "@/lib/types";

export interface EmailDraft {
  subject: string;
  body: string;
}

/**
 * A plain template the applicant reviews, edits, and sends themselves.
 * It only restates facts from the project record and never asserts requirements.
 */
export function draftFollowUpEmail(project: Project, step: PermitStep): EmailDraft {
  const submitted = step.history.some((event) => event.status === "submitted")
    ? formatLongDate(localDay(lastEntered(step, "submitted")))
    : null;
  const needsChanges = step.status === "needs_changes";

  const opening = needsChanges
    ? `I received a request for changes on my ${step.title.toLowerCase()} application and want to confirm exactly what needs to be revised before I resubmit.`
    : `I am following up on my ${step.title.toLowerCase()} application${submitted ? `, submitted on ${submitted}` : ""}.`;

  const questions = needsChanges
    ? [
        "Which documents or sections need to be corrected?",
        "Can I resubmit only the corrected items, or the full application?",
        "Is there anything else that could delay approval after resubmission?",
      ]
    : [
        "Is the application complete, or do you need anything else from me?",
        "Where is it in the review process, and when might I expect a decision?",
        "Are other departments' sign-offs still pending?",
      ];

  return {
    subject: `Follow-up: ${step.title} – ${project.config.name}`,
    body: [
      `Hello ${step.department} team,`,
      "",
      opening,
      "",
      `Project: ${project.config.name}`,
      `Status on my records: ${STATUS_LABELS[step.status]}`,
      "Project address: [add address]",
      "Application or reference number: [add number]",
      "",
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      "",
      "Thank you for your help.",
      "",
      "[Your name]",
      "[Phone or email]",
    ].join("\n"),
  };
}
