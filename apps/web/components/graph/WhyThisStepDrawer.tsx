"use client";

import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import { RuleTrace } from "@/components/explain/RuleTrace";
import { StateMarker } from "@/components/common/StateMarker";
import { useA11y } from "@/lib/a11y";
import type { PermitState } from "@/lib/engine/permitState";
import { labelForField, labelForValue, parseMatchedCondition } from "@/lib/explain";
import { useLabels } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import type { EvaluationTrace, PermitStep, Project } from "@/lib/types";

/**
 * "Why this step?" — the audit trail for one permit.
 *
 * Everything shown here is a fact the deterministic rules engine already
 * recorded when the roadmap was generated: which rule fired, which answers
 * matched it, what it depends on, and which published provisions back it. No
 * text on this panel is generated; it is the trace, formatted.
 */
export function WhyThisStepDrawer({
  step,
  project,
  state,
  onClose,
  onOpenStep,
}: {
  step: PermitStep;
  project: Project;
  state: PermitState;
  onClose: () => void;
  onOpenStep: (stepId: string) => void;
}) {
  const { t } = useCopy();
  const { plainLanguage } = useA11y();
  const labels = useLabels();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  const trace = useMemo<EvaluationTrace | undefined>(
    () => project.roadmap.traces.find((item) => item.stepId === step.id),
    [project.roadmap.traces, step.id],
  );

  const prerequisites = useMemo(
    () => step.dependencies.map((id) => state.byId.get(id)).filter((item): item is PermitStep => Boolean(item)),
    [step.dependencies, state.byId],
  );
  const dependents = useMemo(
    () => state.steps.filter((item) => item.dependencies.includes(step.id)),
    [state.steps, step.id],
  );

  // Fields the rule actually tested, so the applicant's answers can be marked.
  const matched = useMemo(
    () => (trace?.matchedConditions ?? []).map(parseMatchedCondition).filter(Boolean),
    [trace],
  );
  const matchedFields = useMemo(
    () => new Set(matched.map((item) => item!.field)),
    [matched],
  );

  // Show the answers the rule looked at first, then the rest for context.
  const answers = useMemo(() => {
    const config = project.config as unknown as Record<string, unknown>;
    const keys = [
      "projectType",
      "squareFootage",
      "occupancy",
      "zone",
      "trades",
      "homeBased",
      "foodPreparation",
      "publicAttendance",
      "estimatedValuation",
      "visitorCount",
    ].filter((key) => config[key] !== undefined && config[key] !== null);
    return keys
      .map((key) => ({ field: key, value: labelForValue(key, config[key]), matched: matchedFields.has(key) }))
      .sort((a, b) => Number(b.matched) - Number(a.matched));
  }, [project.config, matchedFields]);

  useEffect(() => {
    returnFocusTo.current = document.activeElement;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      // Keep focus inside the drawer while it is open.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      (returnFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  const displayState = state.display.get(step.id) ?? "upcoming";

  return (
    <div className="drawer-scrim" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="why-title"
      >
        <div className="drawer-head">
          <div className="min-w-0">
            <p className="label">{t("why.title")}</p>
            <h2 id="why-title" className="h2 mt-0.5 truncate">
              {step.shortTitle}
            </h2>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label={t("why.close")}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="drawer-body">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StateMarker state={displayState} showLabel />
            <span className="meta">
              {t("common.department")}: {step.department}
            </span>
          </div>

          <Section title={t("why.requirement")}>
            <p className="font-semibold">{step.title}</p>
            <p className="mt-1 text-[var(--ink-2)]">{plainLanguage ? step.plainLanguage : step.description}</p>
            <p className="mt-2 text-[var(--ink-2)]">{step.whyRequired}</p>
          </Section>

          <Section title={t("why.ruleTrace")} hint={t("why.ruleTraceHint")}>
            {trace ? (
              // Matched answers get their own section below, so they are not repeated here.
              <RuleTrace trace={trace} rulesVersion={project.roadmap.rulesVersion} showConditions={false} />
            ) : (
              <p className="meta">{t("why.noSources")}</p>
            )}
          </Section>

          <Section title={t("why.matchedData")} hint={t("why.matchedDataHint")}>
            <dl className="answers">
              {answers.map((answer) => (
                <div key={answer.field} className={answer.matched ? "answer is-matched" : "answer"}>
                  <dt>{labelForField(answer.field)}</dt>
                  <dd>{answer.value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title={t("why.unlockedBy")}>
            {prerequisites.length > 0 ? (
              <ul className="link-list">
                {prerequisites.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="link" onClick={() => onOpenStep(item.id)}>
                      <StateMarker state={state.display.get(item.id) ?? "upcoming"} />
                      {item.shortTitle}
                    </button>
                    <span className="meta"> · {labels.status(item.status)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--ink-2)]">{t("why.noPrerequisites")}</p>
            )}
          </Section>

          <Section title={t("why.unlocks")}>
            {dependents.length > 0 ? (
              <ul className="link-list">
                {dependents.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="link" onClick={() => onOpenStep(item.id)}>
                      <StateMarker state={state.display.get(item.id) ?? "upcoming"} />
                      {item.shortTitle}
                    </button>
                    <span className="meta"> · {labels.status(item.status)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--ink-2)]">{t("why.noDependents")}</p>
            )}
          </Section>

          <Section title={t("why.sources")}>
            {step.citations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {step.citations.map((citation) => (
                  <CodeCitationBadge key={citation.id} citation={citation} />
                ))}
              </div>
            ) : (
              <p className="text-[var(--ink-2)]">{t("why.noSources")}</p>
            )}
          </Section>

          <div className="ethics">
            <p className="ethics-title">
              <ShieldCheck size={15} aria-hidden />
              {t("why.ethicsTitle")}
            </p>
            <p className="mt-1 text-[var(--ink-2)]">{t("why.ethicsBody")}</p>
          </div>
        </div>

        <div className="drawer-foot">
          <button type="button" className="btn btn-primary btn-block" onClick={() => onOpenStep(step.id)}>
            {t("why.openStep")} <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="drawer-section">
      <h3 className="h3">{title}</h3>
      {hint ? <p className="meta mt-0.5">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </section>
  );
}
