"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, Scale, X } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import { formatLongDate } from "@/lib/dates";
import type { CodeCitation } from "@/lib/types";

export function citationStatusText(citation: CodeCitation): string {
  if (citation.verificationStatus === "demo") {
    return "Fictional Demo Harbor provision. There is no official source to link.";
  }
  const source = citation.edition ? `${citation.publisher}, ${citation.edition} edition` : citation.publisher;
  const scope =
    citation.sourceType === "model_code"
      ? "Model code. Your municipality may adopt a different edition or local amendments."
      : "Federal model guidance. State and local adoption varies.";
  if (citation.verificationStatus === "verified") {
    return `${source}. Section and link checked ${formatLongDate(citation.verifiedOn ?? "")}. ${scope}`;
  }
  return `${source}. The section number has not been checked yet. ${scope}`;
}

/** A citation chip that opens a small disclosure with the paraphrase, status, and official link. */
export function CodeCitationBadge({ citation }: { citation: CodeCitation }) {
  const { plainLanguage } = useA11y();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const body = plainLanguage ? citation.plainLanguage : citation.summary;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <span className="relative inline-flex" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="cite"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Scale size={13} aria-hidden />
        <span>{citation.code}</span>
        {citation.verificationStatus === "demo" ? <span className="font-normal text-[var(--muted)]">(fictional)</span> : null}
        <span className="sr-only">: {citation.title}. Show source details.</span>
      </button>
      {open ? (
        <div className="popover" id={panelId} role="region" aria-label={`${citation.code} source details`}>
          <div className="flex items-start justify-between gap-2">
            <p className="pt-2 font-semibold">
              {citation.code} · {citation.title}
            </p>
            <button
              type="button"
              className="icon-btn -mr-2 -mt-1"
              aria-label="Close source details"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-sm leading-relaxed">{body}</p>
          <p className="meta mt-2">{citationStatusText(citation)}</p>
          {citation.url ? (
            <a
              className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline"
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the official text<span className="sr-only"> (opens in a new tab)</span>
              <ExternalLink size={13} aria-hidden />
            </a>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

const VERIFICATION_TAG = {
  verified: { label: "Link verified", className: "tag-ok" },
  needs_review: { label: "Not yet checked", className: "tag-attention" },
  demo: { label: "Fictional", className: "tag-dashed" },
} as const;

/** Source list used on the permit detail page. */
export function CitationList({ citations }: { citations: CodeCitation[] }) {
  const { plainLanguage } = useA11y();
  if (citations.length === 0) return <p className="text-[var(--ink-2)]">No sources are on file for this step.</p>;
  return (
    <ul className="divided surface">
      {citations.map((citation) => {
        const tag = VERIFICATION_TAG[citation.verificationStatus];
        return (
          <li key={citation.id} className="px-4 py-3.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">{citation.code}</span>
              <span className="text-[var(--ink-2)]">{citation.title}</span>
              <span className={`tag ${tag.className}`}>{tag.label}</span>
            </p>
            <p className="mt-1 text-[var(--ink-2)]">{plainLanguage ? citation.plainLanguage : citation.summary}</p>
            <p className="meta mt-1">{citationStatusText(citation)}</p>
            {citation.url ? (
              <a className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline" href={citation.url} target="_blank" rel="noopener noreferrer">
                Read the official text<span className="sr-only"> for {citation.code} (opens in a new tab)</span>
                <ExternalLink size={13} aria-hidden />
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
