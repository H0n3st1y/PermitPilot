"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { draftFollowUpEmail } from "@/lib/followUp";
import type { PermitStep, Project } from "@/lib/types";

/**
 * Human-reviewed follow-up: PermitPilot only drafts the text. The applicant edits it,
 * adds the recipient, and sends it from their own email app. Nothing is sent from here.
 */
export function FollowUpDraft({ project, step, onClose }: { project: Project; step: PermitStep; onClose: () => void }) {
  const initial = useMemo(() => draftFollowUpEmail(project, step), [project, step]);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const subjectId = useId();
  const bodyId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus(), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopyState("copied");
    } catch (error) {
      console.error("PermitPilot: clipboard write failed", error);
      setCopyState("failed");
    }
  }

  const unfilled = /\[[^\]]+\]/.test(body);
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="fade-in mt-5 border-t border-[var(--line)] pt-4">
      <h3 ref={headingRef} tabIndex={-1} className="h3 focus:outline-none">
        Follow-up email draft
      </h3>
      <p className="meta">Review and edit it, then send it from your own email. PermitPilot never sends anything.</p>
      <div className="field mt-3">
        <label htmlFor={subjectId}>Subject</label>
        <input id={subjectId} value={subject} onChange={(event) => setSubject(event.target.value)} />
      </div>
      <div className="field mt-3">
        <label htmlFor={bodyId}>Message</label>
        <textarea id={bodyId} className="min-h-64" value={body} onChange={(event) => setBody(event.target.value)} />
        {unfilled ? <p className="field-hint text-[var(--attention)]">Fill in the [bracketed] fields before sending.</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn btn-primary btn-sm" href={mailto}>
          <Mail size={15} aria-hidden /> Open in email app
        </a>
        <button type="button" className="btn btn-secondary btn-sm min-w-[7.5rem]" onClick={() => void copy()}>
          {copyState === "copied" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copyState === "copied" ? "Copied" : "Copy text"}
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="sr-only" role="status">
        {copyState === "copied" ? "Draft copied to clipboard." : copyState === "failed" ? "Copy failed. Select the text and copy it manually." : ""}
      </p>
      {copyState === "failed" ? <p className="field-error mt-2">Copy failed. Select the text and copy it manually.</p> : null}
    </div>
  );
}
