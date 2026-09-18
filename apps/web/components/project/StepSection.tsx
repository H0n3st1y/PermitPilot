"use client";

import type { RefObject } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useLabels } from "@/lib/i18n/labels";
import type { PermitStep } from "@/lib/types";

/** A titled block of permit detail, with an optional right-aligned summary. */
export function Section({
  id,
  title,
  aside,
  sectionRef,
  children,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  sectionRef?: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      ref={sectionRef}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-32 border-t border-[var(--line)] pt-6"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 id={`${id}-heading`} className="text-lg font-semibold">
          {title}
        </h3>
        {aside ? <div className="text-sm font-semibold text-[var(--ink-2)]">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Prerequisites or dependants as a list of links, with their current status. */
export function StepLinks({
  steps,
  empty,
  onOpenStep,
}: {
  steps: PermitStep[];
  empty: string;
  onOpenStep: (id: string) => void;
}) {
  const labels = useLabels();
  if (steps.length === 0) return <p className="mt-1 text-[var(--ink-2)]">{empty}</p>;
  return (
    <ul className="mt-1">
      {steps.map((item) => (
        <li key={item.id}>
          <button type="button" className="link link-target" onClick={() => onOpenStep(item.id)}>
            {item.status === "approved" ? <Check size={15} className="text-[var(--ok)]" aria-hidden /> : null}
            {item.title}
            <span className="font-normal text-[var(--muted)]">· {labels.status(item.status)}</span>
            <ChevronRight size={15} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
