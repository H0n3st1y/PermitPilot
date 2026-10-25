"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, Scale } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import type { CodeCitation } from "@/lib/types";

export function CodeCitationBadge({ citation }: { citation: CodeCitation }) {
  const { plainLanguage } = useA11y();
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const body = plainLanguage ? citation.plainLanguage : citation.summary;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && wrapRef.current?.contains(document.activeElement)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <span className="relative inline-flex" ref={wrapRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        type="button"
        ref={triggerRef}
        className="citation-badge"
        aria-expanded={open}
        aria-controls={tooltipId}
        aria-label={`${citation.code}: ${citation.title}. Show citation details`}
        onClick={() => setOpen((value) => !value)}
      >
        <Scale size={13} aria-hidden />
        <span>{citation.code}</span>
      </button>
      {open ? (
        <div className="citation-tooltip" id={tooltipId} role="region" aria-label={`${citation.code} citation details`}>
          <button type="button" className="button secondary float-right ml-2" onClick={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}>Close</button>
          <p className="font-semibold text-[var(--ink)]">{citation.code}</p>
          <p className="mt-1 text-sm font-medium">{citation.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-[var(--muted)]">
            {citation.verificationStatus === "demo" ? "Demonstration model-code reference" : citation.verificationStatus}
          </p>
          {citation.url ? (
            <a
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--navy)] underline"
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open official text
              <ExternalLink size={13} aria-hidden />
            </a>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No public URL is attached to this demonstration citation.
            </p>
          )}
        </div>
      ) : null}
    </span>
  );
}
