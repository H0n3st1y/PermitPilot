"use client";

import { useId, useState } from "react";
import { useLabels } from "@/lib/i18n/labels";
import { PERMIT_STEP_STATUSES } from "@/lib/status";
import type { PermitStep, PermitStepStatus } from "@/lib/types";

/**
 * Status control and history for one permit.
 *
 * It warns before a submission that the department is likely to reject, but
 * never blocks it: the applicant may know something the roadmap does not.
 */
export function StepStatusPanel({
  step,
  pendingNames,
  docsMissing,
  onStatusChange,
}: {
  step: PermitStep;
  pendingNames: string[];
  docsMissing: number;
  onStatusChange: (stepId: string, status: PermitStepStatus, note?: string) => void;
}) {
  const [status, setStatus] = useState<PermitStepStatus>(step.status);
  const [note, setNote] = useState("");
  const [syncedStatus, setSyncedStatus] = useState(step.status);
  const labels = useLabels();
  const selectId = useId();
  const noteId = useId();
  const warningId = useId();

  // When the status changes elsewhere (e.g. the next-action button), follow it.
  if (syncedStatus !== step.status) {
    setSyncedStatus(step.status);
    setStatus(step.status);
  }

  const submitting = status === "submitted" && step.status !== "submitted";
  const warnings: string[] = [];
  if (submitting && pendingNames.length) {
    warnings.push(`${pendingNames.join(", ")} ${pendingNames.length === 1 ? "isn't" : "aren't"} approved yet. The department may not accept this application.`);
  }
  if (submitting && docsMissing) warnings.push(`${docsMissing} required document${docsMissing === 1 ? " is" : "s are"} missing.`);
  const unchanged = status === step.status && !note.trim();

  return (
    <section className="surface surface-pad" aria-labelledby="status-heading">
      <h3 id="status-heading" className="h3">
        Status
      </h3>
      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (unchanged) return;
          onStatusChange(step.id, status, note);
          setNote("");
        }}
      >
        <div className="field">
          <label htmlFor={selectId} className="sr-only">
            Status
          </label>
          <select id={selectId} value={status} onChange={(event) => setStatus(event.target.value as PermitStepStatus)} aria-describedby={warnings.length ? warningId : undefined}>
            {PERMIT_STEP_STATUSES.map((value) => (
              <option key={value} value={value}>
                {labels.status(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={noteId} className="text-sm">
            Note <span className="font-normal text-[var(--muted)]">(optional)</span>
          </label>
          <input id={noteId} value={note} maxLength={200} placeholder="Reference number, reviewer name…" onChange={(event) => setNote(event.target.value)} />
        </div>
        {warnings.length ? (
          <ul id={warningId} className="callout callout-attention space-y-1 text-sm">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        <button type="submit" className="btn btn-secondary btn-block" disabled={unchanged}>
          {status === step.status ? "Add note" : `Save as ${labels.status(status)}`}
        </button>
      </form>
      {step.history.length > 0 ? (
        <div className="mt-5">
          <h4 className="label">History</h4>
          <ol className="mt-2 space-y-1.5 text-sm">
            {[...step.history].reverse().map((event, index) => (
              <li key={`${event.at}-${index}`} className="grid grid-cols-[5.5rem_1fr] gap-2">
                <span className="num text-[var(--muted)]">{new Date(event.at).toLocaleDateString()}</span>
                <span>
                  <span className="font-semibold">{labels.status(event.status)}</span>
                  {event.note ? <span className="text-[var(--ink-2)]"> · {event.note}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
