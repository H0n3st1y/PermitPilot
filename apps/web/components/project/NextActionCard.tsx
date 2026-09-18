"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { StepAction, StepActionKind } from "@/lib/stepActions";

/**
 * Renders a step's recommended action. Buttons lock briefly after a click so a double
 * click cannot advance a status twice (e.g. Submitted → In Review → Approved).
 */
export function NextActionCard({
  action,
  eyebrow,
  title,
  meta,
  headingId,
  headingRef,
  onPerform,
  onOpen,
  children,
}: {
  action: StepAction;
  eyebrow: string;
  title?: string;
  meta?: React.ReactNode;
  headingId?: string;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  onPerform: (action: StepActionKind) => void;
  onOpen?: () => void;
  children?: React.ReactNode;
}) {
  const [locked, setLocked] = useState(false);
  const lockRef = useRef(false); // synchronous guard: state updates land too late for a fast double click
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function perform(kind: StepActionKind) {
    if (lockRef.current) return;
    lockRef.current = true;
    setLocked(true);
    timer.current = window.setTimeout(() => {
      lockRef.current = false;
      setLocked(false);
    }, 700);
    onPerform(kind);
  }

  const toneClass = action.tone === "primary" ? "" : `next-action-${action.tone}`;

  return (
    <section className={`next-action ${toneClass}`} aria-labelledby={headingId}>
      <p className="label">{eyebrow}</p>
      <h2 id={headingId} ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="h2 mt-1">
        {action.headline}
      </h2>
      {title ? (
        <p className="mt-0.5 font-semibold text-[var(--ink-2)]">
          {title}
        </p>
      ) : null}
      <p className="mt-1 max-w-2xl text-[var(--ink-2)]">{action.detail}</p>
      {meta ? <div className="meta mt-2">{meta}</div> : null}
      {action.primary || action.secondary || onOpen ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {action.primary ? (
            <button type="button" className="btn btn-primary" disabled={locked} onClick={() => perform(action.primary!.action)}>
              {action.primary.label}
            </button>
          ) : null}
          {action.secondary ? (
            <button type="button" className="btn btn-secondary" disabled={locked} onClick={() => perform(action.secondary!.action)}>
              {action.secondary.label}
            </button>
          ) : null}
          {onOpen ? (
            <button type="button" className="btn btn-quiet" onClick={onOpen}>
              Open step <ArrowRight size={15} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
