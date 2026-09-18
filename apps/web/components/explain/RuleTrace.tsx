"use client";

import { describeMatchedCondition, formatRuleId } from "@/lib/explain";
import { useCopy } from "@/lib/i18n/useCopy";
import type { EvaluationTrace } from "@/lib/types";

/**
 * The deterministic rule that selected a permit, shown the same way everywhere.
 *
 * Both the permit detail page and the "Why this step?" drawer answer "why is
 * this here?", and they used to format the rule id differently for the same
 * fact. One component now owns that, so the identifier a user quotes to a
 * department reads identically wherever they found it.
 */
export function RuleTrace({
  trace,
  rulesVersion,
  showConditions = true,
}: {
  trace: EvaluationTrace;
  rulesVersion: string;
  /** The drawer lists matched answers separately, so it turns this off. */
  showConditions?: boolean;
}) {
  const { t } = useCopy();
  return (
    <div className="trace">
      <code className="rule-id">{formatRuleId(trace.ruleId)}</code>
      <p className="mt-1.5 text-[var(--ink-2)]">{trace.reason}</p>
      {showConditions && trace.matchedConditions.length > 0 ? (
        <p className="mt-1.5">
          <span className="font-semibold">{t("why.matchedData")}:</span>{" "}
          {trace.matchedConditions.map(describeMatchedCondition).join("; ")}
        </p>
      ) : null}
      <p className="meta mt-2">{rulesVersion}</p>
    </div>
  );
}
