"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ChevronRight } from "lucide-react";
import { StateMarker, DISPLAY_STATE_LABELS } from "@/components/common/StateMarker";
import { NextActionCard } from "@/components/project/NextActionCard";
import { useA11y } from "@/lib/a11y";
import { formatDateRange, formatLongDate, localDay } from "@/lib/dates";
import {
  dependencyStages,
  pendingDependencies,
  stepDocumentProgress,
  type DisplayState,
  type ProjectProgress,
} from "@/lib/engine/progress";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import { usesValuation } from "@/lib/intake";
import type { TimelineForecast } from "@/lib/engine/timeline";
import { STATUS_LABELS } from "@/lib/status";
import { recommendAction, situationFor, type StepActionKind } from "@/lib/stepActions";
import {
  OCCUPANCY_LABELS,
  PROJECT_TYPE_LABELS,
  TRADE_LABELS,
  ZONE_LABELS,
  type Bottleneck,
  type PermitStep,
  type PermitStepStatus,
  type Project,
} from "@/lib/types";

export type StepFocus = "documents" | "follow-up";

const LEGEND: DisplayState[] = ["completed", "current", "attention", "blocked", "upcoming"];

/** Ids of steps whose status changed since the previous render, so only they animate. */
function useChangedStatuses(steps: PermitStep[]): Set<string> {
  const previous = useRef<Map<string, string> | null>(null);
  const changed = useMemo(() => {
    const before = previous.current;
    if (!before) return new Set<string>();
    return new Set(steps.filter((step) => before.has(step.id) && before.get(step.id) !== step.status).map((step) => step.id));
  }, [steps]);
  useEffect(() => {
    previous.current = new Map(steps.map((step) => [step.id, step.status]));
  }, [steps]);
  return changed;
}

export function RoadmapOverview({
  headingRef,
  project,
  forecast,
  display,
  bottlenecks,
  actions,
  progress,
  critical,
  now,
  onOpenStep,
  onStatusChange,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  project: Project;
  forecast: TimelineForecast;
  display: Map<string, DisplayState>;
  bottlenecks: Bottleneck[];
  actions: PermitStep[];
  progress: ProjectProgress;
  critical: Set<string>;
  now: Date;
  onOpenStep: (stepId: string, focus?: StepFocus) => void;
  onStatusChange: (stepId: string, status: PermitStepStatus) => void;
}) {
  const { plainLanguage } = useA11y();
  const { config, roadmap } = project;
  const steps = roadmap.steps;
  const byId = useMemo(() => new Map(steps.map((step) => [step.id, step])), [steps]);
  const stages = useMemo(() => dependencyStages(steps), [steps]);
  const changed = useChangedStatuses(steps);
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredStep = hovered ? byId.get(hovered) : undefined;

  // The step to act on: the most urgent actionable step, else an overdue review, else the first review in progress.
  const overdueReview = steps.find((step) => forecast.steps.get(step.id)?.overdue && step.status !== "approved");
  const focusStep = actions[0] ?? overdueReview ?? steps.find((step) => step.status === "submitted" || step.status === "in_review");
  const focusState = focusStep ? display.get(focusStep.id) ?? "current" : "current";
  const focusAction = focusStep
    ? recommendAction(focusStep, situationFor(focusStep, steps, project.documents, forecast, focusState))
    : null;

  function perform(step: PermitStep, kind: StepActionKind) {
    if (kind.kind === "status") onStatusChange(step.id, kind.status);
    else onOpenStep(step.id, kind.kind);
  }

  const attention = bottlenecks.filter(
    (item) => item.kind !== "critical_path_delay" && item.stepId !== focusStep?.id,
  );
  const departments = new Set(steps.map((step) => step.department)).size;

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        {progress.complete ? (
          <section className="next-action next-action-done" aria-labelledby="section-heading">
            <p className="label">Project complete</p>
            <h2 id="section-heading" ref={headingRef} tabIndex={-1} className="h2 mt-1">
              Every step is approved
            </h2>
            <p className="mt-1 max-w-2xl text-[var(--ink-2)]">
              Keep your approvals and documents together. Before you open, occupy, or hold the event, confirm with each
              department that nothing else is outstanding.
            </p>
          </section>
        ) : focusStep && focusAction ? (
          <NextActionCard
            eyebrow={`Your next step · ${focusStep.department}`}
            title={focusStep.title}
            headingId="section-heading"
            headingRef={headingRef}
            action={focusAction}
            meta={<FocusMeta step={focusStep} forecast={forecast} now={now} />}
            onPerform={(kind) => perform(focusStep, kind)}
            onOpen={() => onOpenStep(focusStep.id)}
          >
            {actions.length > 1 ? (
              <p className="meta mt-3">
                Also ready to work on:{" "}
                {actions.slice(1, 4).map((step, index) => (
                  <span key={step.id}>
                    {index > 0 ? ", " : ""}
                    <button type="button" className="link" onClick={() => onOpenStep(step.id)}>
                      {step.shortTitle}
                    </button>
                  </span>
                ))}
              </p>
            ) : null}
          </NextActionCard>
        ) : (
          <section className="next-action" aria-labelledby="section-heading">
            <h2 id="section-heading" ref={headingRef} tabIndex={-1} className="h2">
              Nothing to do right now
            </h2>
            <p className="mt-1 text-[var(--ink-2)]">Every open step is waiting on a department.</p>
          </section>
        )}

        {attention.length > 0 ? (
          <section aria-labelledby="attention-heading">
            <h2 id="attention-heading" className="label mb-1">
              Also needs attention
            </h2>
            <ul className="divided surface">
              {attention.map((item) => {
                const step = byId.get(item.stepId);
                const state = display.get(item.stepId) ?? "current";
                return (
                  <li key={`${item.stepId}-${item.kind}`}>
                    <button type="button" className="flex min-h-12 w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--bg)]" onClick={() => onOpenStep(item.stepId)}>
                      <StateMarker state={state} />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{step?.shortTitle}</span>
                        <span className="text-[var(--ink-2)]"> · {plainLanguage ? item.plainLanguage : item.message}</span>
                      </span>
                      <ChevronRight size={16} aria-hidden className="shrink-0 text-[var(--muted)]" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <section aria-labelledby="roadmap-heading">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="roadmap-heading" className="h2">
              Roadmap
            </h2>
            <p className="meta mt-0.5">
              {steps.length} steps across {departments} departments. Each stage starts when the previous one is approved;
              steps in the same stage can run at the same time.
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ink-2)]" aria-label="Legend">
            {LEGEND.map((state) => (
              <li key={state} className="inline-flex items-center gap-1.5">
                <StateMarker state={state} />
                <span aria-hidden>{DISPLAY_STATE_LABELS[state]}</span>
              </li>
            ))}
          </ul>
        </div>

        <ol className="surface stages" onMouseLeave={() => setHovered(null)}>
          {stages.map((stage, index) => {
            const done = stage.filter((step) => step.status === "approved").length;
            return (
              <li key={index} className="stage">
                <div className="stage-head">
                  <h3 className="h3">Stage {index + 1}</h3>
                  <span className="meta num">
                    {done === stage.length ? "Complete" : index === 0 ? "Start here" : `${done}/${stage.length} approved`}
                  </span>
                </div>
                <ul>
                  {stage.map((step) => {
                    const state = display.get(step.id) ?? "upcoming";
                    const highlight =
                      hoveredStep && hoveredStep.id === step.id
                        ? "self"
                        : hoveredStep?.dependencies.includes(step.id)
                          ? "dep"
                          : undefined;
                    return (
                      <li key={step.id}>
                        <button
                          type="button"
                          className={`node node-${state}`}
                          data-highlight={highlight}
                          onMouseEnter={() => setHovered(step.id)}
                          onFocus={() => setHovered(step.id)}
                          onBlur={() => setHovered(null)}
                          onClick={() => onOpenStep(step.id)}
                        >
                          <span key={`${step.id}-${step.status}`} className={`mt-0.5 ${changed.has(step.id) ? "pulse-once" : ""}`}>
                            <StateMarker state={state} />
                          </span>
                          <span className="node-title">{step.title}</span>
                          <span className="node-body">
                            {step.department}
                            <span aria-hidden> · </span>
                            <span className={state === "completed" || state === "upcoming" ? "" : `node-emph state-text-${state}`}>
                              <NodeSummary step={step} state={state} byId={byId} project={project} forecast={forecast} now={now} />
                            </span>
                            {critical.has(step.id) && state !== "completed" ? (
                              <span className="block">Sets the finish date</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
        {hoveredStep && hoveredStep.dependencies.length > 0 ? (
          <p className="meta mt-2 hidden lg:block" aria-hidden>
            {hoveredStep.shortTitle} needs {hoveredStep.dependencies.map((id) => byId.get(id)?.shortTitle ?? id).join(" and ")} approved first (dashed outline).
          </p>
        ) : null}
      </section>

      {roadmap.warnings.length > 0 ? (
        <section aria-labelledby="warnings-heading" className="max-w-3xl">
          <h2 id="warnings-heading" className="h2">
            Confirm with the city
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--ink-2)]">
            {roadmap.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="disclosure">
        <summary>Project details used by the rules</summary>
        <dl className="facts mt-3">
          <Fact label="Project type" value={PROJECT_TYPE_LABELS[config.projectType]} />
          <Fact label="Floor area" value={`${config.squareFootage.toLocaleString()} sq ft`} />
          <Fact label="Occupancy" value={OCCUPANCY_LABELS[config.occupancy]} />
          <Fact label={plainLanguage ? "People the space is sized for" : "Design occupant load"} value={`${estimateOccupantLoad(config.squareFootage, config.occupancy)}`} />
          <Fact label="Zoning district" value={ZONE_LABELS[config.zone]} />
          {usesValuation(config.projectType) ? <Fact label="Construction cost" value={`$${config.estimatedValuation.toLocaleString()}`} /> : null}
          <Fact label="Trades" value={config.trades.length ? config.trades.map((trade) => TRADE_LABELS[trade]).join(", ") : "None"} />
          {config.projectType === "public_event" ? (
            <Fact label="Expected attendance" value={`${config.visitorCount ?? 0}`} />
          ) : (
            <Fact label="Home-based" value={config.homeBased ? "Yes" : "No"} />
          )}
        </dl>
        <p className="meta mt-3">
          Rules version {roadmap.rulesVersion}, generated {formatLongDate(localDay(roadmap.generatedAt))}.
        </p>
      </details>
    </div>
  );
}

function FocusMeta({ step, forecast, now }: { step: PermitStep; forecast: TimelineForecast; now: Date }) {
  const entry = forecast.steps.get(step.id);
  if (!entry) return null;
  return (
    <span className="num">
      {STATUS_LABELS[step.status]} · expected decision {formatDateRange(entry.earliestEnd, entry.latestEnd, now)}
      {entry.overdue ? " · past typical review time" : ""}
    </span>
  );
}

function NodeSummary({
  step,
  state,
  byId,
  project,
  forecast,
  now,
}: {
  step: PermitStep;
  state: DisplayState;
  byId: Map<string, PermitStep>;
  project: Project;
  forecast: TimelineForecast;
  now: Date;
}) {
  const entry = forecast.steps.get(step.id);
  const docs = stepDocumentProgress(project.documents, step);
  const pending = pendingDependencies(step, byId).map((dep) => dep.shortTitle).join(", ");

  if (state === "completed") return <>Approved {entry ? formatDateRange(entry.latestEnd, entry.latestEnd, now) : ""}</>;
  if (state === "blocked") return <>Blocked by {pending}</>;
  if (state === "upcoming") return <>After {pending}</>;
  if (state === "attention") {
    if (step.status === "needs_changes") return <>Changes requested</>;
    if (entry?.overdue) return <>Review overdue</>;
    return <>{docs.missing.length} document{docs.missing.length === 1 ? "" : "s"} missing</>;
  }
  if (step.status === "not_started") return <>Ready to start</>;
  if (step.status === "preparing") return <>Preparing · {docs.complete}/{docs.required} docs</>;
  return (
    <>
      {STATUS_LABELS[step.status]}
      {entry ? ` · decision ${formatDateRange(entry.earliestEnd, entry.latestEnd, now)}` : ""}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
