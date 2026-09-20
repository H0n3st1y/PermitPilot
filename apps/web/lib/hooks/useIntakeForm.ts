"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RoadmapPreview } from "@/components/intake/ChangePreview";
import { createProjectFromConfig, regenerateProject } from "@/lib/engine/project";
import { useCopy } from "@/lib/i18n/useCopy";
import type { PhraseKey } from "@/lib/i18n/phrases";
import {
  defaultsForType,
  EMPTY_CONFIG,
  finalizeConfig,
  INTAKE_STEP_KEYS,
  validateIntake,
  type IntakeErrors,
} from "@/lib/intake";
import { deleteFiles } from "@/lib/storage/files";
import { clearDraft, loadDraft, loadProject, saveDraft, saveProject } from "@/lib/storage/projects";
import type { Project, ProjectConfig, ProjectType } from "@/lib/types";

interface Draft {
  config: ProjectConfig;
  page: number;
  typeChosen: boolean;
}

/**
 * All the intake wizard's state in one place: answers, draft persistence, page
 * navigation, validation, and submission.
 *
 * Keeping it out of the view means the step components stay declarative, and
 * the order of operations on save — which is where data can actually be lost —
 * is readable in a single file.
 */
export function useIntakeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("edit");
  const { t } = useCopy();

  const [page, setPage] = useState(0);
  const [config, setConfig] = useState<ProjectConfig>(EMPTY_CONFIG);
  const [typeChosen, setTypeChosen] = useState(false);
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [formError, setFormError] = useState<PhraseKey | string | null>(null);
  const [existing, setExisting] = useState<Project | null>(null);
  const [preview, setPreview] = useState<RoadmapPreview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  // Load either the project being edited or a saved draft.
  useEffect(() => {
    try {
      if (editId) {
        const result = loadProject(editId);
        if (result.status !== "ok") {
          setFormError("intake.error.notFound");
        } else {
          setExisting(result.project);
          setConfig({ ...EMPTY_CONFIG, ...result.project.config });
          setTypeChosen(true);
        }
      } else {
        const draft = loadDraft<Draft>();
        if (draft?.config) {
          setConfig({ ...EMPTY_CONFIG, ...draft.config });
          setTypeChosen(Boolean(draft.typeChosen));
          setPage(Math.min(Math.max(0, draft.page ?? 0), INTAKE_STEP_KEYS.length - 1));
        }
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "intake.error.draftRead");
    }
    setLoaded(true);
  }, [editId]);

  // Autosave new-project drafts (debounced) so a refresh or "Save & exit" keeps answers.
  useEffect(() => {
    // Stop autosaving once submitted, so a pending save can't resurrect the cleared draft.
    if (!loaded || editId || submitting) return;
    const timer = window.setTimeout(() => {
      try {
        saveDraft({ config, page, typeChosen } satisfies Draft);
      } catch (error) {
        console.error("PermitPilot: draft autosave failed", error);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [config, page, typeChosen, loaded, editId, submitting]);

  // Move focus to the new page's heading, but not on first paint.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [page, preview]);

  const update = useCallback(<K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    // Any edit invalidates a pending change preview.
    setPreview(null);
  }, []);

  const chooseType = useCallback((type: ProjectType) => {
    setTypeChosen(true);
    setErrors({});
    setPreview(null);
    setConfig((current) => ({ ...current, projectType: type, ...defaultsForType(type) }));
  }, []);

  const focusFirstError = useCallback((found: IntakeErrors) => {
    const key = Object.keys(found)[0];
    if (key) formRef.current?.querySelector<HTMLElement>(`[name="${key}"]`)?.focus();
  }, []);

  const finish = useCallback(() => {
    const final = finalizeConfig(config);
    setFormError(null);
    try {
      if (existing) {
        const result = regenerateProject(existing, final);
        // First press previews the change; the second applies it.
        if (!preview) {
          setPreview({ ...result.change, droppedDocuments: result.droppedDocumentIds.length });
          return;
        }
        setSubmitting(true);
        saveProject(result.project);
        void deleteFiles(result.droppedDocumentIds).catch((error) =>
          console.error("PermitPilot: file cleanup failed", error),
        );
        router.push(`/projects/${encodeURIComponent(existing.id)}`);
        return;
      }
      setSubmitting(true);
      const project = createProjectFromConfig(final);
      saveProject(project);
      clearDraft();
      router.push(`/projects/${encodeURIComponent(project.id)}`);
    } catch (error) {
      // Answers stay in the form; nothing is lost when a save fails.
      console.error("PermitPilot: could not save project", error);
      setSubmitting(false);
      setFormError(error instanceof Error ? error.message : "intake.error.saveFailed");
    }
  }, [config, existing, preview, router]);

  const next = useCallback(() => {
    if (submitting) return;
    if (page === 0 && !typeChosen) {
      setErrors({ projectType: "intake.error.projectType" });
      formRef.current?.querySelector<HTMLElement>('input[name="projectType"]')?.focus();
      return;
    }
    const found = validateIntake(config, page);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }
    if (page < INTAKE_STEP_KEYS.length - 1) {
      setPage(page + 1);
      return;
    }
    finish();
  }, [submitting, page, typeChosen, config, focusFirstError, finish]);

  const cancelHref = existing ? `/projects/${encodeURIComponent(existing.id)}` : "/";

  const back = useCallback(() => {
    if (preview) setPreview(null);
    else if (page > 0) setPage(page - 1);
    else router.push(cancelHref);
  }, [preview, page, router, cancelHref]);

  const isLast = page === INTAKE_STEP_KEYS.length - 1;
  const submitLabel = !isLast
    ? t("intake.continue")
    : existing
      ? preview
        ? t("intake.applyChanges")
        : t("intake.previewChanges")
      : t("intake.buildRoadmap");

  return {
    // state
    page,
    config,
    errors,
    formError,
    existing,
    preview,
    typeChosen,
    loaded,
    submitting,
    // refs
    headingRef,
    formRef,
    // derived
    cancelHref,
    isLast,
    submitLabel,
    // actions
    update,
    chooseType,
    setPage,
    next,
    back,
  };
}
