import { createProjectFromConfig } from "@/lib/engine/project";
import { getCurrentUser, getSupabaseClient } from "@/lib/supabase";
import type {
  InspectionItem,
  PermitStepStatus,
  Project,
  ProjectConfig,
  UploadedDocument,
} from "@/lib/types";

// everything we stash in the browser
const PROJECT_PREFIX = "permitpilot:project:";
const PROJECT_INDEX_KEY = "permitpilot:projects:index";
const LAST_KEY = "permitpilot:last";
export const DB_SYNC_EVENT = "permitpilot:db-synced";

const SAMPLE_PROJECTS = {
  harbor: { id: "sample-harbor-kitchen", name: "Harbor Kitchen" },
  cafe: { id: "sample-beacon-corner-cafe", name: "Beacon Corner Cafe & Roastery" },
  event: { id: "sample-wharf-street-block-party", name: "Wharf Street Autumn Block Party" },
} as const;

const SAMPLE_PROJECT_NAMES = new Set<string>(
  Object.values(SAMPLE_PROJECTS).map((sample) => sample.name),
);

export interface StoredProjectMeta {
  id: string;
  userId?: string;
  ownerEmail?: string;
}

export function sampleConfig(): ProjectConfig {
  // harbor kitchen numbers for the judge demo
  return {
    name: "Harbor Kitchen",
    projectType: "food_business",
    squareFootage: 420,
    occupancy: "residential",
    zone: "residential",
    estimatedValuation: 18000,
    trades: ["electrical", "plumbing"],
    homeBased: true,
    foodPreparation: true,
    publicAttendance: false,
    state: "NH",
    useCase: "home-bakery",
    personalCare: false,
    changingSpace: false,
  };
}

export function createProject(config: ProjectConfig): Project {
  return createProjectFromConfig(config);
}

export function sampleProject(now = new Date(), fixedId?: string): Project {
  // pretent health has been stuck 12 days so the gold bottleneck shows
  const project = createProjectFromConfig(sampleConfig(), now);
  if (fixedId) {
    project.id = fixedId;
    project.roadmap.id = `roadmap-${fixedId}`;
    project.roadmap.projectId = fixedId;
  }
  const staleReviewStarted = new Date(now);
  staleReviewStarted.setDate(staleReviewStarted.getDate() - 12);

  project.roadmap.steps = project.roadmap.steps.map((step) => {
    if (step.id === "zoning-review") {
      return { ...step, status: "approved" as const, statusChangedAt: staleReviewStarted.toISOString() };
    }
    if (step.id === "health-permit") {
      return { ...step, status: "in_review" as const, statusChangedAt: staleReviewStarted.toISOString() };
    }
    if (step.id === "electrical-permit") {
      return { ...step, status: "submitted" as const, statusChangedAt: now.toISOString() };
    }
    return step;
  });

  project.documents = [
    {
      id: "doc-sample-1",
      requirementId: "site-plan",
      stepId: "zoning-review",
      name: "harbor-kitchen-floor-plan.pdf",
      size: 248_320,
      mimeType: "application/pdf",
      uploadedAt: now.toISOString(),
      verified: true,
    },
    {
      id: "doc-sample-2",
      requirementId: "menu",
      stepId: "health-permit",
      name: "proposed-menu.pdf",
      size: 82_144,
      mimeType: "application/pdf",
      uploadedAt: now.toISOString(),
      verified: true,
    },
  ];

  project.inspections = project.inspections.map((item) =>
    item.id === "health-handwash" || item.id === "health-cfp"
      ? { ...item, completed: true }
      : item,
  );

  project.updatedAt = now.toISOString();
  return project;
}

function readIndex(): StoredProjectMeta[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(PROJECT_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredProjectMeta[];
  } catch {
    return [];
  }
}

function writeIndex(entries: StoredProjectMeta[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(entries));
}

function findLocalProjectByName(name: string): Project | undefined {
  if (typeof localStorage === "undefined") return undefined;
  for (const meta of readIndex()) {
    const loaded = getProject(meta.id);
    if (loaded?.config.name === name) return loaded;
  }
  const lastId = getLastProjectId();
  if (!lastId) return undefined;
  const fallback = getProject(lastId);
  return fallback?.config.name === name ? fallback : undefined;
}

function assignStableId(project: Project, id: string): Project {
  project.id = id;
  project.roadmap.id = `roadmap-${id}`;
  project.roadmap.projectId = id;
  return project;
}

function dedupeSampleProjects(projects: Project[]): Project[] {
  // we used to get two harbor kitchens. keep the newer one
  const bySampleName = new Map<string, Project>();
  const unique: Project[] = [];

  for (const project of projects) {
    const name = project.config.name;
    if (!SAMPLE_PROJECT_NAMES.has(name)) {
      unique.push(project);
      continue;
    }
    const current = bySampleName.get(name);
    if (!current || project.updatedAt > current.updatedAt) {
      bySampleName.set(name, project);
    }
  }

  unique.push(...bySampleName.values());
  return unique.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function isSampleProject(project: Project): boolean {
  return (
    Object.values(SAMPLE_PROJECTS).some((sample) => sample.id === project.id) ||
    SAMPLE_PROJECT_NAMES.has(project.config.name)
  );
}

function visibleProjectsForCurrentUser(projects: Project[]): Project[] {
  // regular people shouldnt see the sample shops they dont own
  const user = getCurrentUser();
  if (user?.isDemoJudge) return projects;
  return projects.filter((project) => !isSampleProject(project));
}

export async function workspaceAfterAuth(): Promise<{
  projects: Project[];
  nextPath: string;
}> {
  const projects = await listUserProjects();
  // first time users go make their own project
  return {
    projects,
    nextPath: projects.length === 0 ? "/intake?welcome=1" : "/",
  };
}

function notifyDbSync(projectId: string, source: "supabase" | "local"): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(
    new CustomEvent(DB_SYNC_EVENT, {
      detail: { projectId, source, timestamp: new Date().toISOString() },
    }),
  );
}

export async function syncProjectToSupabase(project: Project): Promise<boolean> {
  // save locally even if the cloud write fails
  const supabase = getSupabaseClient();
  const user = getCurrentUser();
  if (!supabase) {
    notifyDbSync(project.id, "local");
    return false;
  }

  const row = {
    id: project.id,
    user_id: user?.mode === "supabase" ? user.id : null,
    owner_email: user?.email ?? null,
    name: project.config.name,
    config: project.config,
    roadmap: project.roadmap,
    documents: project.documents,
    inspections: project.inspections,
    fees: project.fees,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };

  const { error } = await supabase.from("projects").upsert(row, { onConflict: "id" });
  if (!error) {
    notifyDbSync(project.id, "supabase");
    return true;
  }
  notifyDbSync(project.id, "local");
  return false;
}

export function saveProject(project: Project): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
  localStorage.setItem(LAST_KEY, project.id);

  const user = getCurrentUser();
  const index = readIndex().filter((entry) => entry.id !== project.id);
  index.unshift({
    id: project.id,
    userId: user?.id,
    ownerEmail: user?.email,
  });
  writeIndex(index.slice(0, 50));

  void syncProjectToSupabase(project);
}

export function getProject(id: string): Project | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(`${PROJECT_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

interface SupabaseProjectRow {
  id: string;
  config: Project["config"];
  roadmap: Project["roadmap"];
  documents: Project["documents"];
  inspections: Project["inspections"];
  fees: Project["fees"];
  created_at: string;
  updated_at: string;
}

function rowToProject(row: SupabaseProjectRow): Project {
  return {
    id: row.id,
    config: row.config,
    roadmap: row.roadmap,
    documents: row.documents ?? [],
    inspections: row.inspections ?? [],
    fees: row.fees,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjectFromDb(id: string): Promise<Project | null> {
  // cloud first then the browser copy
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, config, roadmap, documents, inspections, fees, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      const project = rowToProject(data as SupabaseProjectRow);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
      }
      return project;
    }
  }
  return getProject(id);
}

export function listLocalProjectsForCurrentUser(): Project[] {
  if (typeof localStorage === "undefined") return [];
  const user = getCurrentUser();
  const index = readIndex();
  const projects: Project[] = [];
  const seen = new Set<string>();

  for (const meta of index) {
    if (user && meta.ownerEmail && meta.ownerEmail !== user.email) continue;
    const loaded = getProject(meta.id);
    if (loaded && !seen.has(loaded.id)) {
      seen.add(loaded.id);
      projects.push(loaded);
    }
  }

  const lastId = getLastProjectId();
  if (lastId && !seen.has(lastId)) {
    const fallback = getProject(lastId);
    const alreadyHaveSample =
      fallback &&
      SAMPLE_PROJECT_NAMES.has(fallback.config.name) &&
      projects.some((project) => project.config.name === fallback.config.name);
    if (fallback && !alreadyHaveSample) projects.unshift(fallback);
  }

  return visibleProjectsForCurrentUser(dedupeSampleProjects(projects));
}

export async function listUserProjects(): Promise<Project[]> {
  // merge local + cloud then drop extra samples
  const local = listLocalProjectsForCurrentUser();
  const supabase = getSupabaseClient();
  const user = getCurrentUser();
  if (!supabase) return local;

  let query = supabase
    .from("projects")
    .select("id, config, roadmap, documents, inspections, fees, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (user?.email) {
    query = query.eq("owner_email", user.email);
  }

  const { data, error } = await query;
  if (error || !data) return local;

  const merged = new Map<string, Project>();
  for (const row of data as SupabaseProjectRow[]) {
    const project = rowToProject(row);
    merged.set(project.id, project);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
    }
  }
  for (const item of local) {
    if (!merged.has(item.id)) merged.set(item.id, item);
  }
  return visibleProjectsForCurrentUser(dedupeSampleProjects([...merged.values()]));
}

export function resetHarborKitchen(existingId?: string): Project {
  const fresh = sampleProject(new Date(), existingId);
  saveProject(fresh);
  return fresh;
}

export function getOrSeedHarborKitchen(): Project {
  const existing = findLocalProjectByName(SAMPLE_PROJECTS.harbor.name);
  if (existing) {
    const health = existing.roadmap.steps.find((s) => s.id === "health-permit");
    if (health && health.status === "in_review") {
      saveProject(existing);
      return existing;
    }
    return resetHarborKitchen(existing.id);
  }
  const seeded = sampleProject(new Date(), SAMPLE_PROJECTS.harbor.id);
  saveProject(seeded);
  return seeded;
}

export function seedMockAccountWorkspace(): {
  // the 3 sample projects the judge card loads
  primary: Project;
  projects: Project[];
} {
  const now = new Date();

  let cafe = findLocalProjectByName(SAMPLE_PROJECTS.cafe.name);
  if (!cafe) {
    cafe = assignStableId(
      createProjectFromConfig(
        {
          name: "Beacon Corner Cafe & Roastery",
          projectType: "commercial_renovation",
          squareFootage: 1650,
          occupancy: "assembly",
          zone: "downtown",
          estimatedValuation: 95000,
          trades: ["electrical", "plumbing", "mechanical", "gas"],
          homeBased: false,
          foodPreparation: true,
          publicAttendance: true,
          visitorCount: 65,
          state: "NH",
          useCase: "cafe",
          personalCare: false,
          changingSpace: true,
        },
        now,
      ),
      SAMPLE_PROJECTS.cafe.id,
    );
    cafe.roadmap.steps = cafe.roadmap.steps.map((step, idx) => {
      if (idx < 2) {
        return { ...step, status: "approved" as const, statusChangedAt: now.toISOString() };
      }
      if (idx === 2) {
        return { ...step, status: "in_review" as const, statusChangedAt: now.toISOString() };
      }
      if (idx === 3) {
        return { ...step, status: "submitted" as const, statusChangedAt: now.toISOString() };
      }
      return step;
    });
    saveProject(cafe);
  }

  let eventProj = findLocalProjectByName(SAMPLE_PROJECTS.event.name);
  if (!eventProj) {
    eventProj = assignStableId(
      createProjectFromConfig(
        {
          name: "Wharf Street Autumn Block Party",
          projectType: "public_event",
          squareFootage: 4500,
          occupancy: "assembly",
          zone: "commercial",
          estimatedValuation: 12000,
          trades: ["electrical"],
          homeBased: false,
          foodPreparation: true,
          publicAttendance: true,
          visitorCount: 250,
          state: "NH",
          useCase: "neighborhood-event",
          personalCare: false,
          changingSpace: false,
        },
        now,
      ),
      SAMPLE_PROJECTS.event.id,
    );
    eventProj.roadmap.steps = eventProj.roadmap.steps.map((step, idx) => {
      if (idx < 2) {
        return { ...step, status: "approved" as const, statusChangedAt: now.toISOString() };
      }
      if (idx === 2) {
        return { ...step, status: "submitted" as const, statusChangedAt: now.toISOString() };
      }
      return step;
    });
    saveProject(eventProj);
  }

  const harbor = getOrSeedHarborKitchen();
  return {
    primary: harbor,
    projects: dedupeSampleProjects(listLocalProjectsForCurrentUser()),
  };
}

export function getLastProjectId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(LAST_KEY);
}

export function updateStepStatus(project: Project, stepId: string, status: PermitStepStatus): Project {
  // mark approved etc and save it back
  const now = new Date().toISOString();
  const next: Project = {
    ...project,
    updatedAt: now,
    roadmap: {
      ...project.roadmap,
      steps: project.roadmap.steps.map((step) =>
        step.id === stepId ? { ...step, status, statusChangedAt: now } : step,
      ),
    },
  };
  saveProject(next);
  return next;
}

export function upsertDocument(project: Project, document: UploadedDocument): Project {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
    documents: [
      ...project.documents.filter(
        (item) => !(item.stepId === document.stepId && item.requirementId === document.requirementId),
      ),
      document,
    ],
  };
  saveProject(next);
  return next;
}

export function removeDocument(project: Project, documentId: string): Project {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
    documents: project.documents.filter((item) => item.id !== documentId),
  };
  saveProject(next);
  return next;
}

export function toggleInspection(project: Project, itemId: string, completed: boolean): Project {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
    inspections: project.inspections.map((item: InspectionItem) =>
      item.id === itemId ? { ...item, completed } : item,
    ),
  };
  saveProject(next);
  return next;
}
