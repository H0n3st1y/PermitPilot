import { CITATIONS } from "@/fixtures/citations";
import { STEP_DEFINITIONS } from "@/fixtures/steps";
import { isPermitStepStatus } from "@/lib/status";
import type { PermitStep, Project, UploadedDocument } from "@/lib/types";

const PROJECT_PREFIX = "permitpilot:project:";
const LAST_KEY = "permitpilot:last";
const DRAFT_KEY = "permitpilot:draft";

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}

export type LoadResult =
  | { status: "ok"; project: Project }
  | { status: "missing" }
  | { status: "corrupt"; error: string };

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  approved: number;
  total: number;
}

function storage(): Storage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new StorageError("Browser storage is not available.");
  }
  return window.localStorage;
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
}

function write(key: string, value: string): void {
  try {
    storage().setItem(key, value);
  } catch (error) {
    if (isQuotaError(error)) {
      throw new StorageError(
        "This browser's storage is full. Remove an old project or uploaded files, then try again.",
        { cause: error },
      );
    }
    throw new StorageError("Your change could not be saved in this browser.", { cause: error });
  }
}

export function projectStorageKey(id: string): string {
  return `${PROJECT_PREFIX}${id}`;
}

export function saveProject(project: Project): void {
  write(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
  write(LAST_KEY, project.id);
}

export function loadProject(id: string): LoadResult {
  const raw = storage().getItem(`${PROJECT_PREFIX}${id}`);
  if (!raw) return { status: "missing" };
  try {
    return { status: "ok", project: normalizeProject(JSON.parse(raw)) };
  } catch (error) {
    return { status: "corrupt", error: error instanceof Error ? error.message : String(error) };
  }
}

export function deleteProject(id: string): void {
  const store = storage();
  store.removeItem(`${PROJECT_PREFIX}${id}`);
  if (store.getItem(LAST_KEY) === id) store.removeItem(LAST_KEY);
}

export function getLastProjectId(): string | null {
  return storage().getItem(LAST_KEY);
}

export function listProjects(): ProjectSummary[] {
  const store = storage();
  const summaries: ProjectSummary[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (!key?.startsWith(PROJECT_PREFIX)) continue;
    const result = loadProject(key.slice(PROJECT_PREFIX.length));
    if (result.status !== "ok") continue;
    const { project } = result;
    summaries.push({
      id: project.id,
      name: project.config.name,
      updatedAt: project.updatedAt,
      approved: project.roadmap.steps.filter((step) => step.status === "approved").length,
      total: project.roadmap.steps.length,
    });
  }
  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadDraft<T>(): T | null {
  const raw = storage().getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A malformed draft is not worth blocking intake over; start fresh.
    storage().removeItem(DRAFT_KEY);
    return null;
  }
}

export function saveDraft(value: unknown): void {
  write(DRAFT_KEY, JSON.stringify(value));
}

export function clearDraft(): void {
  storage().removeItem(DRAFT_KEY);
}

type Legacy = Record<string, unknown>;

function asArray(value: unknown): Legacy[] {
  return Array.isArray(value) ? (value as Legacy[]) : [];
}

/**
 * Validates stored data and migrates schema v1 (pre-refactor) projects.
 * Citations are re-read from the registry so corrections reach existing projects.
 */
export function normalizeProject(input: unknown): Project {
  if (!input || typeof input !== "object") throw new Error("Stored project is not an object.");
  const raw = input as Legacy;
  const roadmap = raw.roadmap as Legacy | undefined;
  const config = raw.config as Project["config"] | undefined;
  if (typeof raw.id !== "string" || !config || !roadmap || !Array.isArray(roadmap.steps)) {
    throw new Error("Stored project is missing required fields.");
  }

  const steps: PermitStep[] = asArray(roadmap.steps).map((step) => {
    const status = isPermitStepStatus(step.status) ? step.status : "not_started";
    const definition = STEP_DEFINITIONS[String(step.id)];
    const citationIds = definition?.citationIds ?? asArray(step.citations).map((c) => String(c.id));
    return {
      ...(step as unknown as PermitStep),
      status,
      history: Array.isArray(step.history) ? (step.history as PermitStep["history"]) : [],
      citations: citationIds.map((id) => CITATIONS[id]).filter(Boolean),
      documents: asArray(step.documents).map((doc) => ({
        ...(doc as unknown as PermitStep["documents"][number]),
        officialFormUrl: (doc.officialFormUrl as string | null | undefined) ?? null,
      })),
    };
  });

  const documents: UploadedDocument[] = asArray(raw.documents).map((doc) => ({
    id: String(doc.id),
    requirementId: String(doc.requirementId),
    stepId: String(doc.stepId),
    name: String(doc.name),
    size: Number(doc.size) || 0,
    mimeType: String(doc.mimeType ?? ""),
    uploadedAt: String(doc.uploadedAt ?? raw.updatedAt),
    stored: doc.stored === true,
    sample: doc.sample === true || undefined,
  }));

  let inspectionProgress = raw.inspectionProgress as Record<string, boolean> | undefined;
  if (!inspectionProgress) {
    inspectionProgress = {};
    for (const item of asArray(raw.inspections)) {
      if (item.completed === true) inspectionProgress[String(item.id)] = true;
    }
  }

  const createdAt = String(raw.createdAt ?? new Date().toISOString());
  return {
    schemaVersion: 2,
    id: raw.id,
    config,
    roadmap: {
      id: String(roadmap.id ?? `roadmap-${raw.id}`),
      projectId: raw.id,
      steps,
      warnings: Array.isArray(roadmap.warnings) ? (roadmap.warnings as string[]) : [],
      traces: Array.isArray(roadmap.traces) ? (roadmap.traces as Project["roadmap"]["traces"]) : [],
      rulesVersion: String(roadmap.rulesVersion ?? "legacy"),
      generatedAt: String(roadmap.generatedAt ?? createdAt),
    },
    documents,
    inspectionProgress,
    createdAt,
    updatedAt: String(raw.updatedAt ?? createdAt),
  };
}
