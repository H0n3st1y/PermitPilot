"use client";

import { AlertTriangle, GitBranch, PauseCircle } from "lucide-react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import { StatusBadge, StatusSelect } from "@/components/timeline/StatusSelect";
import { formatShortDate } from "@/lib/dates";
import { useA11y } from "@/lib/a11y";
import { getDashboardSummary } from "@/lib/dashboardSummary";
import type { Bottleneck, PermitStep, PermitStepStatus, Project } from "@/lib/types";

export function TimelineView({
  // dates are guesses not promises
  project,
  bottlenecks,
  onStatusChange,
}: {
  project: Project;
  bottlenecks: Bottleneck[];
  onStatusChange: (stepId: string, status: PermitStepStatus) => void;
}) {
  const { plainLanguage } = useA11y();
  // look up a bottleneck or a step by id
  const byStep = new Map(bottlenecks.map((item) => [item.stepId, item]));
  const byId = new Map(project.roadmap.steps.map((step) => [step.id, step]));
  const summary = getDashboardSummary(project, bottlenecks);

  // empty roadmap is its own panel
  if (project.roadmap.steps.length === 0) return <section className="panel"><h2 className="font-serif text-2xl text-[var(--navy)]">No permit steps yet</h2><p className="mt-2 text-[var(--muted)]">Confirm your project requirements with the municipality before starting work.</p></section>;

  return (
    <div className="timeline-view">
      <section className="panel timeline-guide" aria-labelledby="timeline-heading">
        <p className="eyebrow">Your permit plan</p>
        <h2 id="timeline-heading" className="font-serif text-2xl text-[var(--navy)]">Timeline & prerequisites</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{summary.approved} of {summary.total} steps marked approved · {summary.blockedSteps.length} waiting on prerequisites</p>
        <p id="timeline-status-help" className="mt-2 text-sm text-[var(--muted)]">Statuses are your records, not live permit-office updates. Dates are planning estimates, not deadlines.</p>
        {/* jump to the recommended step; wording depends on whether it is already filed */}
        {summary.recommendedStep ? <button type="button" className="button primary timeline-next" onClick={() => focusStep(summary.recommendedStep!.id)}>
          {summary.recommendedStep.status === "submitted" || summary.recommendedStep.status === "in_review" ? "Check on" : "Prepare"} {summary.recommendedStep.shortTitle}
        </button> : null}
        <label className="field timeline-jump">
          <span>Jump to a permit step</span>
          {/* scroll to the chosen step, then reset so it can be picked again */}
          <select defaultValue="" onChange={(event) => { if (event.target.value) focusStep(event.target.value); event.target.value = ""; }}>
            <option value="">Choose a step…</option>
            {project.roadmap.steps.map((step, index) => <option key={step.id} value={step.id}>{index + 1}. {step.title}</option>)}
          </select>
        </label>
      </section>
    <ol className="timeline-rail" aria-label="Permit steps in planning order">
      {/* one rail item per step, in planning order */}
      {project.roadmap.steps.map((step, index) => {
        const bottleneck = byStep.get(step.id);
        return (
          <li key={step.id} className="timeline-item">
            <div className={`timeline-node status-${step.status}`} aria-hidden>
              {index + 1}
            </div>
            {/* connector line except after the last step */}
            {index < project.roadmap.steps.length - 1 ? <div className="timeline-stem" aria-hidden /> : null}
            <article id={`step-${step.id}`} tabIndex={-1} aria-label={step.title} className={`panel min-w-0 break-words ${bottleneck ? "panel-warn" : ""}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="eyebrow">{step.department}</p>
                  <h3 className="font-serif text-xl text-[var(--navy)]">{step.title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Estimated: {formatShortDate(step.estimatedStartDate)} – {formatShortDate(step.estimatedEndDate)}
                    <span className="mx-2" aria-hidden>
                      ·
                    </span>
                    {step.estimatedMinDays}–{step.estimatedMaxDays} business days
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <StatusBadge status={step.status} />
                  <StatusSelect step={step} showLabel describedBy="timeline-status-help" onChange={(status) => onStatusChange(step.id, status)} />
                </div>
              </div>
              <p className="mt-3 text-[var(--ink)]">
                {/* plain wording when that setting is on */}
                {plainLanguage ? step.plainLanguage : step.description}
              </p>
              <DependencyNotes step={step} byId={byId} />
              {/* extra note once they have recorded submitted or in review */}
              {step.status === "submitted" || step.status === "in_review" ? <p className="mt-3 text-sm text-[var(--muted)]">{step.status === "submitted" ? "Recorded as submitted. Check with the permit office for receipt and next steps." : "Recorded as in review. Check with the permit office for updates."}</p> : null}
              {/* warning flag when this step is a bottleneck */}
              {bottleneck ? (
                <p className="bottleneck-flag" role="status">
                  {/* pause icon for a blocked dependency, warning icon otherwise */}
                  {bottleneck.kind === "blocked_dependency" ? (
                    <PauseCircle size={16} aria-hidden />
                  ) : (
                    <AlertTriangle size={16} aria-hidden />
                  )}
                  {/* plain text for plain language or a critical-path delay */}
                  {plainLanguage || bottleneck.kind === "critical_path_delay" ? bottleneck.plainLanguage : bottleneck.message}
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
    </div>
  );
}

// focus a step card and scroll it to the top
function focusStep(id: string) {
  const target = document.getElementById(`step-${id}`);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "start", behavior: "auto" });
}

// prerequisite buttons and any steps that can run in parallel
function DependencyNotes({
  step,
  byId,
}: {
  step: PermitStep;
  byId: Map<string, PermitStep>;
}) {
  // nothing to list when there are no prerequisites or parallel steps
  if (step.dependencies.length === 0 && step.parallelWith.length === 0) {
    return <p className="mt-3 text-sm text-[var(--muted)]">No prerequisite steps.{step.status === "not_started" ? " This can start immediately." : ""}</p>;
  }
  return (
    <div className="mt-3 flex flex-col gap-1 text-sm text-[var(--muted)]">
      {/* prerequisite list when this step waits on earlier ones */}
      {step.dependencies.length > 0 ? (
        <div className="timeline-dependencies">
          {/* "waiting" only while a known prerequisite is not approved yet */}
          <p className="font-semibold text-[var(--ink)]">{step.status === "not_started" && step.dependencies.some((id) => byId.has(id) && byId.get(id)?.status !== "approved") ? "Waiting on earlier approvals" : "Prerequisite steps"}</p>
          <ul className="timeline-dependency-list">
            {/* button when we still have the step, otherwise a missing label */}
            {step.dependencies.map((id) => {
              const prerequisite = byId.get(id);
              return <li key={id}>{prerequisite ? <button className="button secondary timeline-dependency" type="button" aria-label={`View prerequisite: ${prerequisite.shortTitle}`} onClick={() => focusStep(id)}><span>{prerequisite.shortTitle}</span><span className="timeline-dependency-state">{prerequisite.status === "approved" ? "Marked approved" : "Approval not recorded"}</span></button> : <span>{id} · Step unavailable</span>}</li>;
            })}
          </ul>
        </div>
      ) : null}
      {/* steps that can move at the same time */}
      {step.parallelWith.length > 0 ? (
        <p className="inline-flex items-start gap-1">
          <GitBranch size={14} className="mt-1 shrink-0" aria-hidden />
          May proceed in parallel with {step.parallelWith.map((id) => byId.get(id)?.shortTitle ?? id).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
