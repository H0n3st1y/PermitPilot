"use client";

import { useId, useState, type RefObject } from "react";
import { ChevronRight, Download, ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { useA11y } from "@/lib/a11y";
import { formatBytes } from "@/lib/dates";
import { findDocument, stepDocumentProgress } from "@/lib/engine/progress";
import { downloadBlob } from "@/lib/ics";
import { getFile, UPLOAD_ACCEPT } from "@/lib/storage/files";
import type { DocumentRequirement, PermitStep, Project, UploadedDocument } from "@/lib/types";

type UploadHandler = (stepId: string, requirementId: string, file: File) => Promise<string | null>;
type RemoveHandler = (documentId: string) => Promise<void>;

export function DocumentVault({
  headingRef,
  project,
  onOpenStep,
  onUpload,
  onRemove,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  project: Project;
  onOpenStep: (stepId: string) => void;
  onUpload: UploadHandler;
  onRemove: RemoveHandler;
}) {
  const [filter, setFilter] = useState<"missing" | "all">("all");
  const steps = project.roadmap.steps.filter((step) => step.documents.length > 0);
  const totals = steps.reduce(
    (sum, step) => {
      const progress = stepDocumentProgress(project.documents, step);
      return { required: sum.required + progress.required, complete: sum.complete + progress.complete };
    },
    { required: 0, complete: 0 },
  );
  const missing = totals.required - totals.complete;
  const visible = steps
    .map((step) => ({
      step,
      requirements:
        filter === "missing"
          ? step.documents.filter((doc) => doc.required && !findDocument(project.documents, step.id, doc.id))
          : step.documents,
    }))
    .filter((group) => group.requirements.length > 0);

  return (
    <div>
      <SectionHeading
        headingRef={headingRef}
        title={missing ? `${missing} required document${missing === 1 ? "" : "s"} missing` : "All required documents uploaded"}
        actions={
          <div className="inline-flex rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] p-0.5" role="group" aria-label="Filter documents">
            {(["all", "missing"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`btn btn-sm ${filter === value ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--ink-2)]"}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "All" : `Missing (${missing})`}
              </button>
            ))}
          </div>
        }
      >
        {totals.complete} of {totals.required} required uploaded. Files stay in this browser and are never sent to a
        server. PermitPilot records what you added; the department reviews the contents.
      </SectionHeading>

      {steps.length === 0 ? <p className="text-[var(--ink-2)]">No step on this roadmap lists documents.</p> : null}
      {steps.length > 0 && visible.length === 0 ? (
        <div className="callout callout-ok">Nothing missing. Every required document has a file.</div>
      ) : null}

      <div className="space-y-8">
        {visible.map(({ step, requirements }) => {
          const progress = stepDocumentProgress(project.documents, step);
          return (
            <section key={step.id} aria-labelledby={`docs-${step.id}`}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 id={`docs-${step.id}`} className="h3">
                  <button type="button" className="link link-target text-[var(--ink)]" onClick={() => onOpenStep(step.id)}>
                    {step.title}
                    <ChevronRight size={15} aria-hidden className="text-[var(--muted)]" />
                  </button>
                </h3>
                <span className={`meta num ${progress.done ? "text-[var(--ok)]" : ""}`}>
                  {step.department} · {progress.complete}/{progress.required} required
                </span>
              </div>
              <ul className="divided surface">
                {requirements.map((requirement) => (
                  <DocumentRow
                    key={requirement.id}
                    step={step}
                    requirement={requirement}
                    uploaded={findDocument(project.documents, step.id, requirement.id)}
                    onUpload={onUpload}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function DocumentRow({
  step,
  requirement,
  uploaded,
  onUpload,
  onRemove,
}: {
  step: PermitStep;
  requirement: DocumentRequirement;
  uploaded?: UploadedDocument;
  onUpload: UploadHandler;
  onRemove: RemoveHandler;
}) {
  const { plainLanguage } = useA11y();
  const inputId = useId();
  const errorId = useId();
  const [busy, setBusy] = useState<"upload" | "remove" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    setBusy("upload");
    setError(null);
    try {
      setError(await onUpload(step.id, requirement.id, file));
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    if (!uploaded || busy) return;
    setBusy("download");
    setError(null);
    try {
      const blob = await getFile(uploaded.id);
      if (!blob) setError("This browser no longer has a copy of the file. Upload it again to keep it here.");
      else downloadBlob(uploaded.name, blob);
    } catch (cause) {
      console.error("PermitPilot: could not read stored file", cause);
      setError("The file couldn't be read from this browser's storage.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!uploaded || busy) return;
    setBusy("remove");
    try {
      await onRemove(uploaded.id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{requirement.title}</span>
          {requirement.required ? null : <span className="tag">Optional</span>}
        </p>
        <p className="meta mt-0.5">
          {plainLanguage ? `Upload your ${requirement.title.toLowerCase()} for ${step.shortTitle}.` : requirement.description}
        </p>
        {requirement.officialFormUrl ? (
          <a className="mt-1 inline-flex items-center gap-1 text-sm font-semibold" href={requirement.officialFormUrl} target="_blank" rel="noopener noreferrer">
            Official blank form <ExternalLink size={13} aria-hidden />
          </a>
        ) : requirement.category === "application_form" ? (
          <p className="meta mt-1">No official form link on file. Get the current form from {step.department}.</p>
        ) : null}
        <div className="mt-2 text-sm" aria-live="polite">
          {uploaded ? (
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <FileText size={15} aria-hidden className="shrink-0 text-[var(--ok)]" />
              <span className="min-w-0 break-all font-semibold">{uploaded.name}</span>
              <span className="num text-[var(--muted)]">
                {formatBytes(uploaded.size)} · {new Date(uploaded.uploadedAt).toLocaleDateString()}
              </span>
              {uploaded.sample ? <span className="tag tag-dashed">Sample, no file attached</span> : null}
            </p>
          ) : (
            <p className={requirement.required ? "font-semibold text-[var(--attention)]" : "text-[var(--muted)]"}>
              {requirement.required ? "Missing" : "Not added"}
            </p>
          )}
          {error ? (
            <p id={errorId} className="field-error mt-1" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <label htmlFor={inputId} className={`btn btn-sm min-w-[6.5rem] ${uploaded ? "btn-secondary" : "btn-primary"} ${busy === "upload" ? "is-busy" : ""}`}>
          {busy === "upload" ? <Loader2 size={15} className="spin" aria-hidden /> : <Upload size={15} aria-hidden />}
          {uploaded ? "Replace" : "Upload"}
          <span className="sr-only"> {requirement.title}{busy === "upload" ? ", saving" : ""}</span>
        </label>
        <input
          id={inputId}
          className="sr-only file-input"
          type="file"
          accept={UPLOAD_ACCEPT}
          disabled={busy !== null}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {uploaded?.stored ? (
          <button type="button" className="icon-btn" onClick={() => void download()} disabled={busy !== null} aria-label={`Download ${uploaded.name}`}>
            {busy === "download" ? <Loader2 size={16} className="spin" aria-hidden /> : <Download size={16} aria-hidden />}
          </button>
        ) : null}
        {uploaded ? (
          <button type="button" className="icon-btn hover:text-[var(--blocked)]" onClick={() => void remove()} disabled={busy !== null} aria-label={`Remove ${uploaded.name}`}>
            {busy === "remove" ? <Loader2 size={16} className="spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
          </button>
        ) : null}
      </div>
    </li>
  );
}
