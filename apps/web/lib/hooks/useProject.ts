"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deriveProjectView } from "@/lib/engine/project";
import { createId } from "@/lib/ids";
import { removeDocument, setInspectionItem, setStepStatus, upsertDocument } from "@/lib/projectActions";
import { checkUpload, deleteFiles, putFile, safeFileName } from "@/lib/storage/files";
import { loadProject, projectStorageKey, saveProject, StorageError } from "@/lib/storage/projects";
import { STATUS_LABELS } from "@/lib/status";
import type { PermitStepStatus, Project, UploadedDocument } from "@/lib/types";

export type ProjectState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "corrupt"; error: string }
  | { status: "ready"; project: Project };

export interface Feedback {
  tone: "success" | "error";
  message: string;
}

function describe(error: unknown): string {
  if (error instanceof StorageError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

/**
 * Single owner of a project's state on the client: loads it, applies pure
 * updates, persists them, and reports success or failure. A failed save keeps
 * the previous state so the screen never shows unsaved progress as saved.
 */
export function useProject(id: string) {
  const [state, setState] = useState<ProjectState>({ status: "loading" });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [now, setNow] = useState(() => new Date());
  const projectRef = useRef<Project | null>(null);

  useEffect(() => {
    try {
      const result = loadProject(id);
      if (result.status === "ok") {
        projectRef.current = result.project;
        setState({ status: "ready", project: result.project });
      } else {
        setState(result);
      }
    } catch (error) {
      setState({ status: "corrupt", error: describe(error) });
    }
    setNow(new Date());
  }, [id]);

  // Another tab saved this project: adopt its version so this tab never overwrites newer data.
  useEffect(() => {
    const key = projectStorageKey(id);
    function onStorage(event: StorageEvent) {
      if (event.key !== key) return;
      const result = loadProject(id);
      if (result.status === "ok") {
        projectRef.current = result.project;
        setState({ status: "ready", project: result.project });
        setFeedback({ tone: "success", message: "Updated with changes made in another tab." });
      } else {
        projectRef.current = null;
        setState(result);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [id]);

  const commit = useCallback((next: Project, message: string): boolean => {
    try {
      saveProject(next);
    } catch (error) {
      console.error("PermitPilot: failed to save project", error);
      setFeedback({ tone: "error", message: describe(error) });
      return false;
    }
    projectRef.current = next;
    setState({ status: "ready", project: next });
    setNow(new Date());
    setFeedback({ tone: "success", message });
    return true;
  }, []);

  const current = useCallback(() => {
    const project = projectRef.current;
    if (!project) throw new Error("Project is not loaded yet.");
    return project;
  }, []);

  const changeStatus = useCallback(
    (stepId: string, status: PermitStepStatus, note?: string) => {
      const project = current();
      const step = project.roadmap.steps.find((item) => item.id === stepId);
      if (!step || (step.status === status && !note?.trim())) return; // nothing to save
      const message =
        step?.status === status ? "Note added." : `${step?.shortTitle ?? "Step"} marked ${STATUS_LABELS[status]}.`;
      commit(setStepStatus(project, stepId, status, note), message);
    },
    [commit, current],
  );

  const toggleInspection = useCallback(
    (itemId: string, completed: boolean) => {
      commit(setInspectionItem(current(), itemId, completed), completed ? "Checklist item done." : "Checklist item reopened.");
    },
    [commit, current],
  );

  const uploadDocument = useCallback(
    async (stepId: string, requirementId: string, file: File): Promise<string | null> => {
      const problem = await checkUpload(file);
      // Validation problems are shown inline beside the file input by the caller.
      if (problem) return problem;
      const document: UploadedDocument = {
        id: createId(),
        requirementId,
        stepId,
        name: safeFileName(file.name),
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        stored: false,
      };
      let storageNote = "";
      try {
        await putFile(document.id, file);
        document.stored = true;
      } catch (error) {
        console.error("PermitPilot: failed to store file bytes", error);
        storageNote = " The file name was recorded, but this browser could not keep a copy of the file.";
      }
      const { project, replacedId } = upsertDocument(current(), document);
      if (!commit(project, `${document.name} added.${storageNote}`)) {
        if (document.stored) await deleteFiles([document.id]).catch((error) => console.error(error));
        return "Could not save the upload.";
      }
      if (replacedId) await deleteFiles([replacedId]).catch((error) => console.error("PermitPilot: stale file cleanup failed", error));
      return null;
    },
    [commit, current],
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      const project = current();
      const document = project.documents.find((item) => item.id === documentId);
      if (!commit(removeDocument(project, documentId), `${document?.name ?? "Document"} removed.`)) return;
      await deleteFiles([documentId]).catch((error) => console.error("PermitPilot: file cleanup failed", error));
    },
    [commit, current],
  );

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const project = state.status === "ready" ? state.project : null;
  const view = useMemo(() => (project ? deriveProjectView(project, now) : null), [project, now]);

  return {
    state,
    view,
    now,
    feedback,
    clearFeedback,
    changeStatus,
    toggleInspection,
    uploadDocument,
    deleteDocument,
  };
}
