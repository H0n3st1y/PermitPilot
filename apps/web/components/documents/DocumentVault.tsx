"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileCheck2, FileText, Trash2, Upload } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import type { DocumentRequirement, PermitStep, Project, UploadedDocument } from "@/lib/types";

// 10mb max, same as the about page says
const MAX_BYTES = 10 * 1024 * 1024;
const STORE_PREVIEW_UNDER = 400 * 1024;
const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export function documentsForRequirement(
  project: Project,
  stepId: string,
  requirementId: string,
): UploadedDocument | undefined {
  return project.documents.find(
    (doc) => doc.stepId === stepId && doc.requirementId === requirementId,
  );
}

export function stepDocumentProgress(project: Project, step: PermitStep) {
  const required = step.documents.filter((doc) => doc.required);
  const complete = required.filter((doc) => documentsForRequirement(project, step.id, doc.id));
  return { required: required.length, complete: complete.length, done: required.length > 0 && complete.length === required.length };
}

export function DocumentVault({
  project,
  onUpload,
  onRemove,
}: {
  project: Project;
  onUpload: (document: UploadedDocument) => void;
  onRemove: (documentId: string) => void;
}) {
  const { plainLanguage } = useA11y();

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">Attach PDF, PNG, JPEG, or WebP files up to 10 MB. Attachments track your checklist; they are not submitted to a permit office or reviewed for approval. Only files up to 400 KB include a saved preview. Keep your originals.</p>
      {project.roadmap.steps.every((step) => step.documents.length === 0) ? (
        <section className="panel"><h3 className="font-serif text-xl text-[var(--navy)]">No documents required yet</h3><p className="mt-2 text-sm text-[var(--muted)]">This roadmap has no document requirements. Review your project details if your scope changes.</p></section>
      ) : null}
      {project.roadmap.steps.map((step) => {
        if (step.documents.length === 0) return null;
        const progress = stepDocumentProgress(project, step);
        return (
          <section key={step.id} id={`documents-${step.id}`} tabIndex={-1} className="panel">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="eyebrow">{step.department}</p>
                <h3 className="font-serif text-xl text-[var(--navy)]">{step.shortTitle}</h3>
              </div>
              <p className="text-sm text-[var(--muted)]">
                {progress.complete} of {progress.required} required
                {progress.done ? (
                  <span className="ml-2 inline-flex items-center gap-1 font-semibold text-[var(--ok)]">
                    <CheckCircle2 size={16} aria-hidden /> Complete
                  </span>
                ) : null}
              </p>
            </div>
            <ul className="mt-4 space-y-3">
              {step.documents.map((requirement) => (
                <DocumentRow
                  key={requirement.id}
                  step={step}
                  requirement={requirement}
                  uploaded={documentsForRequirement(project, step.id, requirement.id)}
                  plainLanguage={plainLanguage}
                  onUpload={onUpload}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function DocumentRow({
  step,
  requirement,
  uploaded,
  plainLanguage,
  onUpload,
  onRemove,
}: {
  step: PermitStep;
  requirement: DocumentRequirement;
  uploaded?: UploadedDocument;
  plainLanguage: boolean;
  onUpload: (document: UploadedDocument) => void;
  onRemove: (documentId: string) => void;
}) {
  const inputId = `${step.id}-${requirement.id}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const retryFileRef = useRef<File | null>(null);
  const onUploadRef = useRef(onUpload);
  onUploadRef.current = onUpload;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [removed, setRemoved] = useState<UploadedDocument | null>(null);

  useEffect(() => { if (error && !busy) (retryButtonRef.current ?? uploadButtonRef.current)?.focus(); }, [error, busy]);
  useEffect(() => { if (status && !error && !busy) uploadButtonRef.current?.focus(); }, [status, error, busy]);

  function fail(message: string) { setError(message); setStatus(""); }

  async function handleFile(file?: File) {
    if (!file || pendingRef.current) return;
    retryFileRef.current = null;
    setError(""); setStatus("");
    if (file.size > MAX_BYTES) { fail("This file is too large. Choose a file of 10 MB or smaller."); return; }
    if (!ALLOWED.has(file.type)) { fail("This file type isn't supported. Choose a PDF, PNG, JPEG, or WebP file."); return; }
    pendingRef.current = true; setBusy(true); setStatus("Reading your file…");
    retryFileRef.current = file;
    try {
      const document: UploadedDocument = {
        id: crypto.randomUUID(), requirementId: requirement.id, stepId: step.id,
        name: file.name.replace(/[^A-Za-z0-9._-]/g, "_"), size: file.size, mimeType: file.type,
        uploadedAt: new Date().toISOString(), verified: false,
      };
      if (file.size <= STORE_PREVIEW_UNDER) document.dataUrl = await readDataUrl(file);
      onUploadRef.current(document);
      retryFileRef.current = null;
      setRemoved(null);
      setStatus(`${document.name} attached.${document.dataUrl ? "" : " Only file details were saved; keep the original file."}`);
    } catch { fail("We couldn't attach this file. Retry attachment below. Try choosing it again if the original file moved, or free some browser storage if it keeps failing."); }
    finally { pendingRef.current = false; setBusy(false); }
  }

  function handleAttachSamplePdf() {
    if (pendingRef.current) return;
    retryFileRef.current = null;
    setError("");
    const safeSlug = requirement.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const sampleDoc: UploadedDocument = {
      id: crypto.randomUUID(),
      requirementId: requirement.id,
      stepId: step.id,
      name: `sample-${safeSlug || requirement.id}.pdf`,
      size: 148_200,
      mimeType: "application/pdf",
      uploadedAt: new Date().toISOString(),
      verified: false,
    };
    try { onUpload(sampleDoc); setRemoved(null); retryFileRef.current = null; setStatus("Sample file details attached for demonstration. Replace these with your own document before applying."); }
    catch { fail("We couldn't attach the sample. Free some browser storage and try again."); }
  }

  return (
    <li className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3" aria-busy={busy}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--ink)]">
            {requirement.title}
            {requirement.required ? (
              <span className="ml-2 text-xs font-medium uppercase tracking-wide text-[var(--seal)]">Required</span>
            ) : (
              <span className="ml-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Optional</span>
            )}
          </p>
          <p id={`${inputId}-description`} className="mt-1 text-sm text-[var(--muted)]">
            {plainLanguage ? `Upload ${requirement.title.toLowerCase()} for ${step.shortTitle}.` : requirement.description}
          </p>
          {uploaded ? (
            <p className="mt-2 flex min-h-11 max-w-full flex-wrap items-center gap-2 text-sm">
              {uploaded.dataUrl && uploaded.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploaded.dataUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <FileText size={18} aria-hidden />
              )}
              <span className="min-w-0 break-all font-medium">{uploaded.name}</span>
              <span className="inline-flex items-center gap-1 text-[var(--ok)]">
                <CheckCircle2 size={16} aria-hidden />
                Attached
              </span>
              {!uploaded.dataUrl ? <span className="text-[var(--muted)]">File details only · keep your original</span> : null}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">Not uploaded</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[50%]">
          <button ref={uploadButtonRef} type="button" className="button primary min-h-11" disabled={busy}
            aria-label={`${uploaded ? "Replace file" : "Upload file"} for ${requirement.title}`}
            aria-describedby={`${inputId}-description ${inputId}-hint ${inputId}-feedback`}
            onClick={() => inputRef.current?.click()}>
            <Upload size={16} aria-hidden />
            {busy ? "Attaching…" : uploaded ? "Replace file" : "Upload file"}
          </button>
          {!uploaded ? (
            <button
              type="button"
              className="button secondary min-h-11"
              disabled={busy}
              aria-label={`Attach sample PDF for ${requirement.title}`}
              onClick={handleAttachSamplePdf}
            >
              <FileCheck2 size={16} aria-hidden />
              Attach sample PDF
            </button>
          ) : null}
          <input
            ref={inputRef}
            id={inputId}
            className="sr-only"
            tabIndex={-1}
            type="file"
            disabled={busy}
            aria-label={`Choose a file for ${requirement.title}`}
            aria-describedby={`${inputId}-feedback`}
            aria-invalid={Boolean(error)}
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {uploaded ? (
            <button type="button" className="button ghost min-h-11" disabled={busy} aria-label={`Remove ${uploaded.name}`} onClick={() => {
              try { onRemove(uploaded.id); setRemoved(uploaded); retryFileRef.current = null; setError(""); setStatus(`${uploaded.name} removed. Undo is available until you leave this section.`); uploadButtonRef.current?.focus(); }
              catch { fail("We couldn't remove this attachment. Try again."); }
            }}>
              <Trash2 size={16} aria-hidden />
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <p id={`${inputId}-hint`} className="mt-2 text-xs text-[var(--muted)]">PDF or image · up to 10 MB · previews saved only up to 400 KB</p>
      <div id={`${inputId}-feedback`}>
        {error ? <p className="mt-2 text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
        <p className="mt-2 text-sm text-[var(--muted)]" role="status">{status}</p>
      </div>
      {error && retryFileRef.current ? <button ref={retryButtonRef} type="button" className="button secondary mt-2" disabled={busy} aria-label={`Retry attachment for ${requirement.title}`} onClick={() => void handleFile(retryFileRef.current ?? undefined)}>Retry attachment</button> : null}
      {removed && !uploaded ? <button type="button" className="button secondary mt-2" disabled={busy} aria-label={`Undo removal of ${removed.name}`} onClick={() => {
        try { onUpload(removed); setRemoved(null); setError(""); setStatus(`${removed.name} restored.`); uploadButtonRef.current?.focus(); }
        catch { fail("We couldn't restore this attachment. Free some browser storage and try Undo removal again."); }
      }}>Undo removal</button> : null}
    </li>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.onabort = () => reject(new Error("File reading was interrupted."));
    reader.readAsDataURL(file);
  });
}
