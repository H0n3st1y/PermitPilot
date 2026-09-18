"use client";

import { Fragment, type RefObject } from "react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { useA11y } from "@/lib/a11y";
import { formatCurrency } from "@/lib/dates";
import { FEE_BASIS_DESCRIPTIONS, FEE_BASIS_LABELS } from "@/lib/engine/fees";
import type { FeeBasisType, FeeBreakdown, FeeLineItem, Project } from "@/lib/types";

const BASIS_ORDER: FeeBasisType[] = ["official", "calculated", "estimated", "unknown"];
const BASIS_TAG: Record<FeeBasisType, string> = {
  official: "tag-ok",
  calculated: "tag-primary",
  estimated: "tag-attention",
  unknown: "tag-dashed",
};

export function FeeBasisBadge({ basis }: { basis: FeeBasisType }) {
  return <span className={`tag ${BASIS_TAG[basis]}`}>{FEE_BASIS_LABELS[basis]}</span>;
}

export function FeeSummary({
  headingRef,
  fees,
  project,
  onOpenStep,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  fees: FeeBreakdown;
  project: Project;
  onOpenStep: (stepId: string) => void;
}) {
  const { plainLanguage } = useA11y();
  const stepTitle = new Map(project.roadmap.steps.map((step) => [step.id, step.shortTitle]));
  const usedBases = BASIS_ORDER.filter((basis) => fees.lineItems.some((item) => item.basisType === basis));

  return (
    <div>
      <SectionHeading headingRef={headingRef} title="Fees">
        {plainLanguage
          ? "What the city may charge. This is a planning estimate, not a bill."
          : "Itemized from your floor area, valuation, occupancy, and trades. Each line says how its amount was determined."}
      </SectionHeading>

      <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label">Estimated total</p>
          <p className="num mt-1 font-serif text-4xl font-semibold leading-none">{formatCurrency(fees.total)}</p>
          <p className="meta mt-2">
            {fees.unknownCount
              ? `Plus ${fees.unknownCount} fee${fees.unknownCount === 1 ? "" : "s"} that couldn't be priced. Ask the department.`
              : "Every configured fee is priced."}
          </p>
        </div>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 md:max-w-lg">
          {usedBases.map((basis) => (
            <div key={basis} className="flex items-start gap-2">
              <dt className="shrink-0 pt-0.5">
                <FeeBasisBadge basis={basis} />
              </dt>
              <dd className="text-[var(--ink-2)]">{FEE_BASIS_DESCRIPTIONS[basis]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <FeeTable items={fees.lineItems} stepTitle={stepTitle} onOpenStep={onOpenStep} grouped totals={fees} />

      <ul className="meta mt-4 max-w-3xl space-y-1">
        {fees.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

export function FeeTable({
  items,
  stepTitle,
  onOpenStep,
  grouped = false,
  totals,
}: {
  items: FeeLineItem[];
  stepTitle?: Map<string, string>;
  onOpenStep?: (stepId: string) => void;
  grouped?: boolean;
  totals?: FeeBreakdown;
}) {
  if (items.length === 0) return null;
  const groups = grouped
    ? [
        { label: "Department fees", rows: items.filter((item) => item.kind === "base") },
        { label: "Surcharges", rows: items.filter((item) => item.kind === "surcharge") },
      ].filter((group) => group.rows.length)
    : [{ label: "", rows: items }];

  return (
    <div className="surface table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Fee</th>
            <th scope="col">How it&apos;s determined</th>
            <th scope="col" className="amount">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.label || "all"}>
              {group.label ? (
                <tr className="group-row">
                  <th scope="rowgroup" colSpan={3}>
                    {group.label}
                  </th>
                </tr>
              ) : null}
              {group.rows.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <span className="block">{item.label}</span>
                    <span className="meta block font-normal">
                      {item.department}
                      {item.stepId && stepTitle && onOpenStep ? (
                        <>
                          {" · "}
                          <button type="button" className="link font-normal underline" onClick={() => onOpenStep(item.stepId!)}>
                            {stepTitle.get(item.stepId) ?? item.stepId}
                          </button>
                        </>
                      ) : null}
                    </span>
                  </th>
                  <td>
                    <FeeBasisBadge basis={item.basisType} />
                    <span className="meta mt-1 block text-[var(--ink-2)]">{item.basis}</span>
                  </td>
                  <td className="amount font-semibold">
                    {item.amount === null ? <span className="font-normal text-[var(--muted)]">Not priced</span> : formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
        {totals ? (
          <tfoot>
            <tr>
              <th scope="row" colSpan={2} className="text-right max-sm:text-left">
                Estimated total{totals.unknownCount ? " (excludes unpriced fees)" : ""}
              </th>
              <td className="amount text-lg">{formatCurrency(totals.total)}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
