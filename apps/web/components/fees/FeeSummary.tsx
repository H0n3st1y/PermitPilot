"use client";

import { formatCurrency } from "@/lib/dates";
import { useA11y } from "@/lib/a11y";
import type { FeeBreakdown, ProjectConfig } from "@/lib/types";
import { PROJECT_TYPE_LABELS } from "@/lib/types";

export function FeeSummary({
  // just lists the line items we already calculated
  fees,
  config,
}: {
  fees: FeeBreakdown;
  config: ProjectConfig;
}) {
  const { plainLanguage } = useA11y();
  const baseItems = fees.lineItems.filter((item) => item.kind === "base");
  const surchargeItems = fees.lineItems.filter((item) => item.kind === "surcharge");

  return (
    <section className="panel">
      <p className="eyebrow">Fee estimate</p>
      <h2 className="font-serif text-2xl text-[var(--navy)]">Itemized municipal costs</h2>
      <p className="mt-2 text-[var(--muted)]">
        {plainLanguage
          ? `These numbers are a planning estimate from your ${config.squareFootage} sq ft ${PROJECT_TYPE_LABELS[config.projectType].toLowerCase()} and $${config.estimatedValuation.toLocaleString()} valuation. They are not a bill.`
          : `Calculated from ${config.squareFootage.toLocaleString()} sq ft, ${PROJECT_TYPE_LABELS[config.projectType].toLowerCase()}, and estimated valuation of ${formatCurrency(config.estimatedValuation)}. Demonstration rates only.`}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-4 sm:grid-cols-3">
        <div className="col-span-2 rounded-lg border-2 border-[var(--navy)] p-3 sm:col-span-1">
          <dt className="text-sm text-[var(--muted)]">Estimated total</dt>
          <dd className="font-serif text-2xl text-[var(--navy)]">{formatCurrency(fees.total)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--paper)] p-3">
          <dt className="text-sm text-[var(--muted)]">Base fees</dt>
          <dd className="font-serif text-2xl text-[var(--navy)]">{formatCurrency(fees.baseFees)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--paper)] p-3">
          <dt className="text-sm text-[var(--muted)]">Surcharges</dt>
          <dd className="font-serif text-2xl text-[var(--navy)]">{formatCurrency(fees.surcharges)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-[var(--muted)]">Planning estimate, not a bill. Confirm current fees with each department before applying.</p>
      <FeeTable caption="Base departmental fees" items={baseItems} />
      <FeeTable caption="Surcharges" items={surchargeItems} />
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
        {fees.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}

function FeeTable({
  caption,
  items,
}: {
  caption: string;
  items: FeeBreakdown["lineItems"];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 min-w-0">
      <div className="sm:hidden">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{caption}</h3>
        <dl className="space-y-2">
          {items.map((item) => <div key={item.id} className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3"><dt className="break-words font-semibold text-[var(--navy)]">{item.label}</dt><dd className="mt-1 break-words text-sm text-[var(--muted)]">{item.department} · {item.basis}</dd><dd className="mt-2 font-semibold"><span className="sr-only">Amount: </span>{formatCurrency(item.amount)}</dd></div>)}
        </dl>
      </div>
      <table className="fee-table hidden sm:table">
        <caption className="mb-2 text-left text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {caption}
        </caption>
        <thead>
          <tr>
            <th scope="col">Fee</th>
            <th scope="col">Department</th>
            <th scope="col">Basis</th>
            <th scope="col" className="text-right">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <th scope="row">{item.label}</th>
              <td>{item.department}</td>
              <td>{item.basis}</td>
              <td className="text-right font-semibold">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
