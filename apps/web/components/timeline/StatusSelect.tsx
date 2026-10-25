"use client";

import { PERMIT_STEP_STATUSES, type PermitStep, type PermitStepStatus } from "@/lib/types";
import { useA11y } from "@/lib/a11y";

// dropdown that records a step's status
export function StatusSelect({
  step,
  onChange,
  showLabel = false,
  describedBy,
}: {
  step: PermitStep;
  onChange: (status: PermitStepStatus) => void;
  showLabel?: boolean;
  describedBy?: string;
}) {
  const { t } = useA11y();
  return (
    <label className="block w-full min-w-0 sm:min-w-[11rem]">
      {/* visible label only when the caller asked for one */}
      <span className={showLabel ? "mb-1 block text-sm text-[var(--muted)]" : "sr-only"}>
        {showLabel ? "Recorded status" : `${t("graph.status")} ${step.title}`}
      </span>
      <select
        className="status-select"
        value={step.status}
        onChange={(event) => onChange(event.target.value as PermitStepStatus)}
        aria-label={`${t("graph.status")}: ${step.shortTitle}`}
        aria-describedby={describedBy}
      >
        {/* one option per status we know about */}
        {PERMIT_STEP_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(`status.${status}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

// little colored chip for a status
export function StatusBadge({ status }: { status: PermitStepStatus }) {
  const { t } = useA11y();
  return <span className={`status-pill status-${status}`}>{t(`status.${status}`)}</span>;
}
