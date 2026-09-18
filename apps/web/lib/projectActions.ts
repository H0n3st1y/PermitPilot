import type { PermitStepStatus, Project, UploadedDocument } from "@/lib/types";

/** Pure project updates. Persistence is handled by the caller (see useProject). */

function touch(project: Project, now: Date): Project {
  return { ...project, updatedAt: now.toISOString() };
}

export function setStepStatus(
  project: Project,
  stepId: string,
  status: PermitStepStatus,
  note?: string,
  now = new Date(),
): Project {
  const at = now.toISOString();
  const text = note?.trim();
  return {
    ...touch(project, now),
    roadmap: {
      ...project.roadmap,
      steps: project.roadmap.steps.map((step) => {
        if (step.id !== stepId) return step;
        const changed = step.status !== status;
        // An unchanged status with no note is a no-op; a note alone is logged without moving the status date.
        if (!changed && !text) return step;
        return {
          ...step,
          status,
          statusChangedAt: changed ? at : step.statusChangedAt,
          history: [...step.history, text ? { status, at, note: text } : { status, at }],
        };
      }),
    },
  };
}

/** Replaces any existing upload for the same requirement; returns the id it replaced. */
export function upsertDocument(
  project: Project,
  document: UploadedDocument,
  now = new Date(),
): { project: Project; replacedId: string | null } {
  const existing = project.documents.find(
    (item) => item.stepId === document.stepId && item.requirementId === document.requirementId,
  );
  return {
    project: {
      ...touch(project, now),
      documents: [...project.documents.filter((item) => item !== existing), document],
    },
    replacedId: existing?.id ?? null,
  };
}

export function removeDocument(project: Project, documentId: string, now = new Date()): Project {
  return {
    ...touch(project, now),
    documents: project.documents.filter((item) => item.id !== documentId),
  };
}

export function setInspectionItem(project: Project, itemId: string, completed: boolean, now = new Date()): Project {
  const inspectionProgress = { ...project.inspectionProgress };
  if (completed) inspectionProgress[itemId] = true;
  else delete inspectionProgress[itemId];
  return { ...touch(project, now), inspectionProgress };
}
