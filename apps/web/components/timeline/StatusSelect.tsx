"use client";

import { PERMIT_STEP_STATUSES, STATUS_LABELS } from "@/lib/status";
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
  return (
    <select
      id={id}
      className={`input ${className}`}
      value={step.status}
      onChange={(event) => onChange(event.target.value as PermitStepStatus)}
      aria-label={id ? undefined : `Status for ${step.shortTitle}`}
    >
      {PERMIT_STEP_STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}

/** Permit status as a colored dot plus text. */
export function StatusText({ status }: { status: PermitStepStatus }) {
  return <span className={`status status-${status}`}>{STATUS_LABELS[status]}</span>;
}
