"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, Scale } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import type { CodeCitation } from "@/lib/types";

// code chip that opens a small details popup
export function CodeCitationBadge({ citation }: { citation: CodeCitation }) {
  const { plainLanguage } = useA11y();
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // plain wording when that setting is on
  const body = plainLanguage ? citation.plainLanguage : citation.summary;

  // close on escape or a click outside the chip
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // escape only counts when focus is still inside this chip
      if (event.key === "Escape" && wrapRef.current?.contains(document.activeElement)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(event: MouseEvent) {
      // click outside closes the popup
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    // drop both listeners when the chip unmounts
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <span className="relative inline-flex" ref={wrapRef} onBlur={(event) => {
      // close when focus leaves the chip entirely
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
      {/* details only while the chip is open */}
      {open ? (
        <div className="citation-tooltip" id={tooltipId} role="region" aria-label={`${citation.code} citation details`}>
          <button type="button" className="button secondary float-right ml-2" onClick={() => {
            // close and put focus back on the chip
            setOpen(false);
            triggerRef.current?.focus();
          }}>Close</button>
          <p className="font-semibold text-[var(--ink)]">{citation.code}</p>
          <p className="mt-1 text-sm font-medium">{citation.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-[var(--muted)]">
            {/* demo citations get a fixed label; others show their status */}
            {citation.verificationStatus === "demo" ? "Demonstration model-code reference" : citation.verificationStatus}
          </p>
          {/* link out when there is a url, otherwise say there isn't one */}
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
