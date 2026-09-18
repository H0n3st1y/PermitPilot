"use client";

import { ArrowRight, Radar } from "lucide-react";
import { StateMarker } from "@/components/common/StateMarker";
import { StatusSelect } from "@/components/timeline/StatusSelect";
import { useA11y } from "@/lib/a11y";
import type { PermitState } from "@/lib/engine/permitState";
import { useLabels } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import type { PermitStepStatus } from "@/lib/types";

/**
 * The bottleneck radar: one step, why it is holding things up, and what to do.
 *
 * It renders `state.radar`, which the engine picked by root cause and
 * downstream impact. Changing the status control here flows straight back
 * through the same engine, so the graph, roadmap, timeline, and this panel all
 * re-derive from one recomputation.
 */
export function BottleneckRadar({
  state,
  onOpenStep,
  onStatusChange,
}: {
  state: PermitState;
  onOpenStep: (stepId: string) => void;
  onStatusChange: (stepId: string, status: PermitStepStatus) => void;
}) {
  const { t } = useCopy();
  const { plainLanguage } = useA11y();
  const labels = useLabels();
  const radar = state.radar;

  if (!radar) {
    return (
      <section className="radar radar-clear" aria-labelledby="radar-heading">
        <p className="label inline-flex items-center gap-1.5">
          <Radar size={13} aria-hidden />
          <span id="radar-heading">{t("radar.heading")}</span>
        </p>
        <p className="mt-1 text-[var(--ink-2)]">{t("radar.clear")}</p>
      </section>
    );
  }

  const { step, bottleneck, blocked, action, onCriticalPath } = radar;
  const blockedNames = blocked.map((item) => item.shortTitle);

  const impact =
    blocked.length === 0
      ? t("radar.blocksNone")
      : blocked.length === 1
        ? t("radar.blocksOne", { blocked: blockedNames[0], step: step.shortTitle })
        : t("radar.blocksMany", {
            count: blocked.length,
            step: step.shortTitle,
            blocked: blockedNames.join(", "),
          });

  return (
    <section className="radar" aria-labelledby="radar-heading">
      <p className="label inline-flex items-center gap-1.5">
        <Radar size={13} aria-hidden />
        <span id="radar-heading">{t("radar.heading")}</span>
      </p>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="h2">{step.title}</h3>
        <span className="meta">{step.department}</span>
        <StateMarker state={state.display.get(step.id) ?? "current"} showLabel />
      </div>

      {/* The engine's own diagnosis, at the reader's chosen level. */}
      <p className="mt-2 text-[var(--ink-2)]">{plainLanguage ? bottleneck.plainLanguage : bottleneck.message}</p>

      <dl className="radar-facts">
        <div>
          <dt>{t("radar.whyItMatters")}</dt>
          <dd>
            {impact}
            {onCriticalPath ? <> {t("radar.criticalNote")}</> : null}
          </dd>
        </div>
        <div>
          <dt>{t("radar.recommended")}</dt>
          <dd>{t(`radar.action.${action.kind}`, { department: action.department })}</dd>
        </div>
      </dl>

      {blocked.length > 0 ? (
        <ul className="radar-blocked">
          {blocked.map((item) => (
            <li key={item.id}>
              <StateMarker state={state.display.get(item.id) ?? "upcoming"} />
              <button type="button" className="link" onClick={() => onOpenStep(item.id)}>
                {item.shortTitle}
              </button>
              <span className="meta">{labels.status(item.status)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="radar-actions">
        <label className="field-label sr-only" htmlFor="radar-status">
          {step.shortTitle}
        </label>
        <StatusSelect
          id="radar-status"
          step={step}
          className="input-compact max-w-56"
          onChange={(status) => onStatusChange(step.id, status)}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenStep(step.id)}>
          {t("action.viewStep")} <ArrowRight size={15} aria-hidden />
        </button>
      </div>
    </section>
  );
}
