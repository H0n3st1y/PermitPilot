"use client";

import { useLabels } from "@/lib/i18n/labels";
import { PERMIT_STEP_STATUSES } from "@/lib/status";
import type { PermitStep, PermitStepStatus } from "@/lib/types";

export function StatusSelect({
  step,
  onChange,
  id,
  className = "",
}: {
  step: PermitStep;
  onChange: (status: PermitStepStatus) => void;
  id?: string;
  className?: string;
}) {
  const labels = useLabels();
  return (
    <select
      id={id}
      className={`input ${className}`}
      value={step.status}
      onChange={(event) => onChange(event.target.value as PermitStepStatus)}
      aria-label={id ? undefined : `${step.shortTitle}`}
    >
      {PERMIT_STEP_STATUSES.map((status) => (
        <option key={status} value={status}>
          {labels.status(status)}
        </option>
      ))}
    </select>
  );
}

/** Permit status as a colored dot plus text. */
export function StatusText({ status }: { status: PermitStepStatus }) {
  const labels = useLabels();
  return <span className={`status status-${status}`}>{labels.status(status)}</span>;
}
