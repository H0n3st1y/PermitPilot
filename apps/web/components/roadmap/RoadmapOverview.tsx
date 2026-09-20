"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ChevronRight } from "lucide-react";
import { StateMarker } from "@/components/common/StateMarker";
import { BottleneckRadar } from "@/components/project/BottleneckRadar";
import { NextActionCard } from "@/components/project/NextActionCard";
import { useA11y } from "@/lib/a11y";
import type { PermitState } from "@/lib/engine/permitState";
import { useLabels } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import { formatDateRange, formatLongDate, localDay } from "@/lib/dates";
import { pendingDependencies, stepDocumentProgress, type DisplayState } from "@/lib/engine/progress";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import { usesValuation } from "@/lib/intake";
import type { TimelineForecast } from "@/lib/engine/timeline";
import { recommendAction, situationFor, joinNames, type StepActionKind } from "@/lib/stepActions";
import type { PermitStep, PermitStepStatus, Project } from "@/lib/types";

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
  permitState,
  now,
  onOpenStep,
  onStatusChange,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  project: Project;
  forecast: TimelineForecast;
  /** The one derived permit state; this view renders it and decides nothing. */
  permitState: PermitState;
  now: Date;
  onOpenStep: (stepId: string, focus?: StepFocus) => void;
  onStatusChange: (stepId: string, status: PermitStepStatus) => void;
}) {
  const { plainLanguage } = useA11y();
  const { t } = useCopy();
  const labels = useLabels();
  const { config, roadmap } = project;
  const { display, bottlenecks, actions, progress, critical, stages, byId } = permitState;
  const steps = roadmap.steps;
  const changed = useChangedStatuses(steps);
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredStep = hovered ? byId.get(hovered) : undefined;

  // The step to act on: the most urgent actionable step, else an overdue review, else the first review in progress.
  const overdueReview = steps.find((step) => forecast.steps.get(step.id)?.overdue && step.status !== "approved");
  const focusStep = actions[0] ?? overdueReview ?? steps.find((step) => step.status === "submitted" || step.status === "in_review");
  const focusState = focusStep ? display.get(focusStep.id) ?? "current" : "current";
  const focusAction = focusStep
    ? recommendAction(focusStep, situationFor(focusStep, steps, project.documents, forecast, focusState), t)
    : null;

  function perform(step: PermitStep, kind: StepActionKind) {
    if (kind.kind === "status") onStatusChange(step.id, kind.status);
    else onOpenStep(step.id, kind.kind);
  }

  // The radar already names its own step and everything it is holding up, so
  // nothing it covers is repeated here. One problem, one place.
  const coveredByRadar = new Set(
    permitState.radar ? [permitState.radar.step.id, ...permitState.radar.blocked.map((step) => step.id)] : [],
  );
  const attention = bottlenecks.filter(
    (item) =>
      item.kind !== "critical_path_delay" && item.stepId !== focusStep?.id && !coveredByRadar.has(item.stepId),
  );
  const departments = new Set(steps.map((step) => step.department)).size;

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        {progress.complete ? (
          <section className="next-action next-action-done" aria-labelledby="section-heading">
            <p className="label">{t("action.projectComplete")}</p>
            <h2 id="section-heading" ref={headingRef} tabIndex={-1} className="h2 mt-1">
              {t("action.everyApproved")}
            </h2>
            <p className="mt-1 max-w-2xl text-[var(--ink-2)]">{t("action.completeBody")}</p>
          </section>
        ) : focusStep && focusAction ? (
          <NextActionCard
            eyebrow={t("action.nextStepEyebrow", { department: focusStep.department })}
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
                {t("action.alsoReady")}{" "}
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
              {t("action.nothingToDo")}
            </h2>
            <p className="mt-1 text-[var(--ink-2)]">{t("action.waitingOnDept")}</p>
          </section>
        )}

        <BottleneckRadar state={permitState} onOpenStep={onOpenStep} onStatusChange={onStatusChange} />

        {attention.length > 0 ? (
          <section aria-labelledby="attention-heading">
            <h2 id="attention-heading" className="label mb-1">
              {t("roadmap.alsoAttention")}
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
              {t("tab.roadmap")}
            </h2>
            <p className="meta mt-0.5">
              {t("roadmap.lede", { steps: steps.length, departments })}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ink-2)]" aria-label={t("graph.legend")}>
            {LEGEND.map((state) => (
              <li key={state} className="inline-flex items-center gap-1.5">
                <StateMarker state={state} />
                <span aria-hidden>{labels.displayState(state)}</span>
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
                  <h3 className="h3">{t("roadmap.stage", { n: index + 1 })}</h3>
                  <span className="meta num">
                    {done === stage.length
                      ? t("roadmap.complete")
                      : index === 0
                        ? t("roadmap.startHere")
                        : t("header.approvedCount", { approved: done, total: stage.length })}
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
                              <span className="block">{t("roadmap.setsFinish")}</span>
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
            {t("roadmap.hoverNeeds", {
              step: hoveredStep.shortTitle,
              list: joinNames(
                hoveredStep.dependencies.map((id) => byId.get(id)?.shortTitle ?? id),
                t,
              ),
            })}
          </p>
        ) : null}
      </section>

      {roadmap.warnings.length > 0 ? (
        <section aria-labelledby="warnings-heading" className="max-w-3xl">
          <h2 id="warnings-heading" className="h2">
            {t("roadmap.confirmCity")}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--ink-2)]">
            {roadmap.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="disclosure">
        <summary>{t("facts.summary")}</summary>
        <dl className="facts mt-3">
          <Fact label={t("field.projectType")} value={labels.projectType(config.projectType)} />
          <Fact label={t("field.squareFootage")} value={t("header.squareFeet", { value: config.squareFootage.toLocaleString() })} />
          <Fact label={t("field.occupancy")} value={labels.occupancy(config.occupancy)} />
          <Fact
            label={plainLanguage ? t("field.occupantLoadPlain") : t("field.occupantLoad")}
            value={`${estimateOccupantLoad(config.squareFootage, config.occupancy)}`}
          />
          <Fact label={t("field.zone")} value={labels.zone(config.zone)} />
          {usesValuation(config.projectType) ? (
            <Fact label={t("field.constructionCost")} value={`$${config.estimatedValuation.toLocaleString()}`} />
          ) : null}
          <Fact
            label={t("field.trades")}
            value={config.trades.length ? config.trades.map((trade) => labels.trade(trade)).join(", ") : t("common.none")}
          />
          {config.projectType === "public_event" ? (
            <Fact label={t("field.visitorCount")} value={`${config.visitorCount ?? 0}`} />
          ) : (
            <Fact label={t("field.homeBased")} value={t(config.homeBased ? "common.yes" : "common.no")} />
          )}
        </dl>
        <p className="meta mt-3">
          {t("facts.rulesVersion", { version: roadmap.rulesVersion, date: formatLongDate(localDay(roadmap.generatedAt)) })}
        </p>
      </details>
    </div>
  );
}

function FocusMeta({ step, forecast, now }: { step: PermitStep; forecast: TimelineForecast; now: Date }) {
  const labels = useLabels();
  const { t } = useCopy();
  const entry = forecast.steps.get(step.id);
  const statusLabel = labels.status(step.status);
  if (!entry) return null;
  return (
    <span className="num">
      {t("focus.expectedDecision", { status: statusLabel, range: formatDateRange(entry.earliestEnd, entry.latestEnd, now) })}
      {entry.overdue ? t("focus.pastReview") : ""}
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
  const labels = useLabels();
  const { t } = useCopy();
  const entry = forecast.steps.get(step.id);
  const docs = stepDocumentProgress(project.documents, step);
  const pending = joinNames(pendingDependencies(step, byId).map((dep) => dep.shortTitle), t);

  if (state === "completed") return <>{t("node.approvedOn", { date: entry ? formatDateRange(entry.latestEnd, entry.latestEnd, now) : "" })}</>;
  if (state === "blocked") return <>{t("node.blockedBy", { list: pending })}</>;
  if (state === "upcoming") return <>{t("node.after", { list: pending })}</>;
  if (state === "attention") {
    if (step.status === "needs_changes") return <>{t("node.changesRequested")}</>;
    if (entry?.overdue) return <>{t("node.reviewOverdue")}</>;
    return <>{t(docs.missing.length === 1 ? "node.docsMissingOne" : "node.docsMissingMany", { count: docs.missing.length })}</>;
  }
  if (step.status === "not_started") return <>{t("node.ready")}</>;
  if (step.status === "preparing") return <>{t("node.preparing", { complete: docs.complete, required: docs.required })}</>;
  return (
    <>
      {labels.status(step.status)}
      {entry ? t("node.decision", { range: formatDateRange(entry.earliestEnd, entry.latestEnd, now) }) : ""}
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
