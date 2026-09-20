"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";
import { CitationList } from "@/components/citations/CodeCitationBadge";
import { StateMarker } from "@/components/common/StateMarker";
import { DocumentRow } from "@/components/documents/DocumentVault";
import { FeeTable } from "@/components/fees/FeeSummary";
import { ChecklistGroup } from "@/components/inspections/InspectionChecklists";
import { FollowUpDraft } from "@/components/project/FollowUpDraft";
import { RuleTrace } from "@/components/explain/RuleTrace";
import { NextActionCard } from "@/components/project/NextActionCard";
import { Section, StepLinks } from "@/components/project/StepSection";
import { StepStatusPanel } from "@/components/project/StepStatusPanel";
import type { StepFocus } from "@/components/roadmap/RoadmapOverview";
import { StatusText } from "@/components/timeline/StatusSelect";
import { useA11y } from "@/lib/a11y";
import { formatCurrency, formatDateRange } from "@/lib/dates";
import { feesForStep } from "@/lib/engine/fees";
import { findDocument, stepDocumentProgress, type DisplayState } from "@/lib/engine/progress";
import type { StepForecast } from "@/lib/engine/timeline";
import { useCopy } from "@/lib/i18n/useCopy";
import { recommendAction, type StepActionKind } from "@/lib/stepActions";
import type { Bottleneck, FeeBreakdown, InspectionItem, InspectionType, PermitStep, PermitStepStatus, Project } from "@/lib/types";

export function StepDetail({
  headingRef,
  project,
  step,
  forecast,
  state,
  critical,
  bottlenecks,
  fees,
  inspections,
  now,
  backLabel,
  initialFocus,
  onBack,
  onOpenStep,
  onStatusChange,
  onUpload,
  onRemove,
  onToggleInspection,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  project: Project;
  step: PermitStep;
  forecast?: StepForecast;
  state: DisplayState;
  critical: boolean;
  bottlenecks: Bottleneck[];
  fees: FeeBreakdown;
  inspections: InspectionItem[];
  now: Date;
  backLabel: string;
  initialFocus?: StepFocus;
  onBack: () => void;
  onOpenStep: (stepId: string) => void;
  onStatusChange: (stepId: string, status: PermitStepStatus, note?: string) => void;
  onUpload: (stepId: string, requirementId: string, file: File) => Promise<string | null>;
  onRemove: (documentId: string) => Promise<void>;
  onToggleInspection: (id: string, completed: boolean) => void;
}) {
  const { plainLanguage } = useA11y();
  const { t } = useCopy();
  const [showFollowUp, setShowFollowUp] = useState(initialFocus === "follow-up");
  const documentsRef = useRef<HTMLElement>(null);
  const steps = project.roadmap.steps;
  const byId = new Map(steps.map((item) => [item.id, item]));
  const prerequisites = step.dependencies.map((id) => byId.get(id)).filter((item): item is PermitStep => Boolean(item));
  const pending = prerequisites.filter((item) => item.status !== "approved");
  const dependents = steps.filter((item) => item.dependencies.includes(step.id));
  const docs = stepDocumentProgress(project.documents, step);
  const stepFees = feesForStep(fees, step.id);
  const knownFeeTotal = stepFees.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const trace = project.roadmap.traces.find((item) => item.stepId === step.id);
  const inspectionTypes = [...new Set(inspections.map((item) => item.inspectionType))] as InspectionType[];
  const action = recommendAction(step, {
    pendingNames: pending.map((dep) => dep.shortTitle),
    missingDocuments: docs.missing,
    overdue: Boolean(forecast?.overdue),
    blocked: state === "blocked",
  }, t);
  const otherIssues = bottlenecks.filter((item) => item.kind === "blocked_dependency" || item.kind === "critical_path_delay");

  function scrollToDocuments() {
    const section = documentsRef.current;
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    section.querySelector<HTMLElement>("input[type=file]")?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (initialFocus === "documents") scrollToDocuments();
    // Run once per mount: the focus intent comes from the roadmap's action button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function perform(kind: StepActionKind) {
    if (kind.kind === "status") onStatusChange(step.id, kind.status);
    else if (kind.kind === "documents") scrollToDocuments();
    else setShowFollowUp(true);
  }

  return (
    <article aria-labelledby="section-heading">
      <button type="button" className="link link-target -mt-2" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> {backLabel}
      </button>

      <header className="mb-6 mt-1">
        <p className="meta">
          {t("step.position", { n: step.sequence, total: steps.length, department: step.department })}
          {critical && state !== "completed" ? t("step.setsFinishSuffix") : ""}
        </p>
        <h2 id="section-heading" ref={headingRef} tabIndex={-1} className="page-title mt-1">
          {step.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <StateMarker state={state} showLabel />
          <StatusText status={step.status} />
        </div>
        <p className="mt-3 max-w-3xl text-[var(--ink-2)]">{plainLanguage ? step.plainLanguage : step.description}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-10">
        <div className="lg:col-start-1 lg:row-start-1">
          <NextActionCard
            eyebrow={t("step.nextAction")}
            action={action}
            onPerform={perform}
            meta={
              forecast && !forecast.actual ? (
                <span className="num">
                  {t("step.expectedDecision", { range: formatDateRange(forecast.earliestEnd, forecast.latestEnd, now) })}
                  {forecast.overdue ? t("focus.pastReview") : ""}
                </span>
              ) : null
            }
          >
            {otherIssues.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {otherIssues.map((item) => (
                  <li key={item.kind} className="flex gap-2 text-[var(--ink-2)]">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--attention)]" aria-hidden />
                    {plainLanguage ? item.plainLanguage : item.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {step.status === "approved" ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {dependents.filter((item) => item.status !== "approved").length ? (
                  <>
                    <span className="meta">{t("step.nowYouCan")}</span>
                    {dependents
                      .filter((item) => item.status !== "approved")
                      .map((item) => (
                        <button key={item.id} type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenStep(item.id)}>
                          {item.shortTitle}
                          <ChevronRight size={14} aria-hidden />
                        </button>
                      ))}
                  </>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
                    {t("step.backTo", { label: backLabel.toLowerCase() })}
                  </button>
                )}
              </div>
            ) : null}
            {showFollowUp ? <FollowUpDraft project={project} step={step} onClose={() => setShowFollowUp(false)} /> : null}
          </NextActionCard>
        </div>

        <aside className="max-w-xl lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-none" aria-label="Status">
          <div className="lg:sticky lg:top-32">
            <StepStatusPanel step={step} pendingNames={pending.map((dep) => dep.shortTitle)} docsMissing={docs.missing.length} onStatusChange={onStatusChange} />
          </div>
        </aside>

        <div className="space-y-10 lg:col-start-1 lg:row-start-2">
          <Section id="step-requirements" title="Why it's required">
            <p>{step.whyRequired}</p>
            {trace ? (
              <div className="mt-3">
                <RuleTrace trace={trace} rulesVersion={project.roadmap.rulesVersion} />
              </div>
            ) : null}
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <h4 className="label">Must be approved first</h4>
                <StepLinks steps={prerequisites} empty="Nothing. This can start now." onOpenStep={onOpenStep} />
              </div>
              <div>
                <h4 className="label">Unlocks</h4>
                <StepLinks steps={dependents} empty="No later steps wait on this one." onOpenStep={onOpenStep} />
              </div>
            </div>
          </Section>

          <Section
            id="step-documents"
            sectionRef={documentsRef}
            title="Required documents"
            aside={step.documents.length ? <span className={`num ${docs.done ? "text-[var(--ok)]" : ""}`}>{docs.complete} of {docs.required} uploaded</span> : null}
          >
            {step.documents.length === 0 ? (
              <p className="text-[var(--ink-2)]">This step doesn&apos;t list any documents.</p>
            ) : (
              <ul className="divided surface">
                {step.documents.map((requirement) => (
                  <DocumentRow
                    key={requirement.id}
                    step={step}
                    requirement={requirement}
                    uploaded={findDocument(project.documents, step.id, requirement.id)}
                    onUpload={onUpload}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section
            id="step-fees"
            title="Fees"
            aside={stepFees.length ? <span className="num">{formatCurrency(knownFeeTotal)}{stepFees.some((item) => item.amount === null) ? " + unknown" : ""}</span> : null}
          >
            {stepFees.length === 0 ? (
              <p className="text-[var(--ink-2)]">No fee is configured for this step. Ask {step.department} whether one applies.</p>
            ) : (
              <FeeTable items={stepFees} />
            )}
          </Section>

          <Section id="step-timeline" title="Timeline">
            <dl className="facts">
              <div>
                <dt>{forecast?.actual ? "Approved" : "Expected decision"}</dt>
                <dd>
                  {forecast
                    ? forecast.actual
                      ? formatDateRange(forecast.latestEnd, forecast.latestEnd, now)
                      : formatDateRange(forecast.earliestEnd, forecast.latestEnd, now)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Typical review</dt>
                <dd>
                  {step.estimatedMinDays}–{step.estimatedMaxDays} business days
                </dd>
              </div>
              <div>
                <dt>Original plan</dt>
                <dd>{formatDateRange(step.estimatedStartDate, step.estimatedEndDate, now)}</dd>
              </div>
            </dl>
            <p className="meta mt-3">Planning estimates from configured review times, not department commitments.</p>
          </Section>

          {inspectionTypes.length > 0 ? (
            <Section id="step-inspections" title="Inspection prep">
              <div className="space-y-6">
                {inspectionTypes.map((type) => (
                  <ChecklistGroup key={type} type={type} items={inspections.filter((item) => item.inspectionType === type)} onToggle={onToggleInspection} />
                ))}
              </div>
            </Section>
          ) : null}

          <Section id="step-sources" title="Official sources">
            <p className="meta mb-3">Summaries are paraphrased. The linked official text is what counts.</p>
            <CitationList citations={step.citations} />
          </Section>
        </div>
      </div>
    </article>
  );
}
