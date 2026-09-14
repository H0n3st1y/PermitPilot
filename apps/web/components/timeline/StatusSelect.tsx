"use client";

import { STATUS_LABELS, type PermitStep, type PermitStepStatus, PERMIT_STEP_STATUSES } from "@/lib/types";

export function StatusSelect({
  step,
  onChange,
}: {
  step: PermitStep;
  onChange: (status: PermitStepStatus) => void;
}) {
  return (
    <label className="block min-w-[11rem]">
      <span className="sr-only">Status for {step.title}</span>
      <select
        className="status-select"
        value={step.status}
        onChange={(event) => onChange(event.target.value as PermitStepStatus)}
        aria-label={`Update status for ${step.shortTitle}`}
      >
        {PERMIT_STEP_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StatusBadge({ status }: { status: PermitStepStatus }) {
  return <span className={`status-pill status-${status}`}>{STATUS_LABELS[status]}</span>;
}
