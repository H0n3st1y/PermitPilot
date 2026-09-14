"use client";

import { AlertTriangle, GitBranch, PauseCircle } from "lucide-react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import { StatusBadge, StatusSelect } from "@/components/timeline/StatusSelect";
import { formatShortDate } from "@/lib/dates";
import { useA11y } from "@/lib/a11y";
import type { Bottleneck, PermitStep, PermitStepStatus, Project } from "@/lib/types";

export function TimelineView({
  project,
  bottlenecks,
  onStatusChange,
}: {
  project: Project;
  bottlenecks: Bottleneck[];
  onStatusChange: (stepId: string, status: PermitStepStatus) => void;
}) {
  const { plainLanguage } = useA11y();
  const byStep = new Map(bottlenecks.map((item) => [item.stepId, item]));
  const byId = new Map(project.roadmap.steps.map((step) => [step.id, step]));

  return (
    <ol className="timeline-rail">
      {project.roadmap.steps.map((step, index) => {
        const bottleneck = byStep.get(step.id);
        return (
          <li key={step.id} className="timeline-item">
            <div className={`timeline-node status-${step.status}`} aria-hidden>
              {index + 1}
            </div>
            {index < project.roadmap.steps.length - 1 ? <div className="timeline-stem" aria-hidden /> : null}
            <article className={`panel ${bottleneck ? "panel-warn" : ""}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="eyebrow">{step.department}</p>
                  <h3 className="font-serif text-xl text-[var(--navy)]">{step.title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatShortDate(step.estimatedStartDate)} – {formatShortDate(step.estimatedEndDate)}
                    <span className="mx-2" aria-hidden>
                      ·
                    </span>
                    {step.estimatedMinDays}–{step.estimatedMaxDays} business days
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <StatusBadge status={step.status} />
                  <StatusSelect step={step} onChange={(status) => onStatusChange(step.id, status)} />
                </div>
              </div>
              <p className="mt-3 text-[var(--ink)]">
                {plainLanguage ? step.plainLanguage : step.description}
              </p>
              <DependencyNotes step={step} byId={byId} />
              {bottleneck ? (
                <p className="bottleneck-flag" role="status">
                  {bottleneck.kind === "blocked_dependency" ? (
                    <PauseCircle size={16} aria-hidden />
                  ) : (
                    <AlertTriangle size={16} aria-hidden />
                  )}
                  {plainLanguage ? bottleneck.plainLanguage : bottleneck.message}
                </p>
              ) : null}
              <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Code citations for ${step.shortTitle}`}>
                {step.citations.map((citation) => (
                  <li key={citation.id}>
                    <CodeCitationBadge citation={citation} />
                  </li>
                ))}
              </ul>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

function DependencyNotes({
  step,
  byId,
}: {
  step: PermitStep;
  byId: Map<string, PermitStep>;
}) {
  if (step.dependencies.length === 0 && step.parallelWith.length === 0) {
    return <p className="mt-3 text-sm text-[var(--muted)]">No prerequisite steps. This can start immediately.</p>;
  }
  return (
    <div className="mt-3 flex flex-col gap-1 text-sm text-[var(--muted)]">
      {step.dependencies.length > 0 ? (
        <p>
          After: {step.dependencies.map((id) => byId.get(id)?.shortTitle ?? id).join(", ")}
        </p>
      ) : null}
      {step.parallelWith.length > 0 ? (
        <p className="inline-flex items-center gap-1">
          <GitBranch size={14} aria-hidden />
          May proceed in parallel with {step.parallelWith.map((id) => byId.get(id)?.shortTitle ?? id).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
