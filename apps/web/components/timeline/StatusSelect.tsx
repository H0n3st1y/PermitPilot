"use client";

import { PERMIT_STEP_STATUSES, type PermitStep, type PermitStepStatus } from "@/lib/types";
import { useA11y } from "@/lib/a11y";

export function StatusSelect({
  step,
  onChange,
}: {
  step: PermitStep;
  onChange: (status: PermitStepStatus) => void;
}) {
  const { t } = useA11y();
  return (
    <label className="block min-w-[11rem]">
      <span className="sr-only">
        {t("graph.status")} {step.title}
      </span>
      <select
        className="status-select"
        value={step.status}
        onChange={(event) => onChange(event.target.value as PermitStepStatus)}
        aria-label={`${t("graph.status")}: ${step.shortTitle}`}
      >
        {PERMIT_STEP_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(`status.${status}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StatusBadge({ status }: { status: PermitStepStatus }) {
  const { t } = useA11y();
  return <span className={`status-pill status-${status}`}>{t(`status.${status}`)}</span>;
}
