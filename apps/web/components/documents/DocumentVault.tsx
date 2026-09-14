"use client";

import { CheckCircle2, FileText, Trash2, Upload } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import type { DocumentRequirement, PermitStep, Project, UploadedDocument } from "@/lib/types";

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
      {project.roadmap.steps.map((step) => {
        if (step.documents.length === 0) return null;
        const progress = stepDocumentProgress(project, step);
        return (
          <section key={step.id} className="panel">
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

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      window.alert("Files must be 10 MB or smaller.");
      return;
    }
    if (!ALLOWED.has(file.type)) {
      window.alert("Upload a PDF, PNG, JPEG, or WebP file.");
      return;
    }
    const document: UploadedDocument = {
      id: crypto.randomUUID(),
      requirementId: requirement.id,
      stepId: step.id,
      name: file.name.replace(/[^A-Za-z0-9._-]/g, "_"),
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      verified: true,
    };
    if (file.size <= STORE_PREVIEW_UNDER) {
      document.dataUrl = await readDataUrl(file);
    }
    onUpload(document);
  }

  return (
    <li className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3">
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
          <p className="mt-1 text-sm text-[var(--muted)]">
            {plainLanguage ? `Upload ${requirement.title.toLowerCase()} for ${step.shortTitle}.` : requirement.description}
          </p>
          {uploaded ? (
            <p className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm">
              {uploaded.dataUrl && uploaded.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploaded.dataUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <FileText size={18} aria-hidden />
              )}
              <span className="truncate font-medium">{uploaded.name}</span>
              <span className="inline-flex items-center gap-1 text-[var(--ok)]">
                <CheckCircle2 size={16} aria-hidden />
                Verified
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">Not uploaded</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="button secondary min-h-11 cursor-pointer">
            <Upload size={16} aria-hidden />
            {uploaded ? "Replace file" : "Upload file"}
            <input
              id={inputId}
              className="sr-only"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              onChange={(event) => {
                void handleFile(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          {uploaded ? (
            <button type="button" className="button ghost min-h-11" onClick={() => onRemove(uploaded.id)}>
              <Trash2 size={16} aria-hidden />
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
