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

// run those answers through the rules engine
export function createProject(config: ProjectConfig): Project {
  return createProjectFromConfig(config);
}

// build the Harbor Kitchen demo, with health stuck in review
export function sampleProject(now = new Date(), fixedId?: string): Project {
  // pretent health has been stuck 12 days so the gold bottleneck shows
  const project = createProjectFromConfig(sampleConfig(), now);
  // pin the ids when the caller wants the stable sample id
  if (fixedId) {
    project.id = fixedId;
    project.roadmap.id = `roadmap-${fixedId}`;
    project.roadmap.projectId = fixedId;
  }
  const staleReviewStarted = new Date(now);
  staleReviewStarted.setDate(staleReviewStarted.getDate() - 12);

  // mark a few steps so the demo graph isn't all "not started"
  project.roadmap.steps = project.roadmap.steps.map((step) => {
    // zoning is already approved
    if (step.id === "zoning-review") {
      return { ...step, status: "approved" as const, statusChangedAt: staleReviewStarted.toISOString() };
    }
    // health is the review that's been sitting
    if (step.id === "health-permit") {
      return { ...step, status: "in_review" as const, statusChangedAt: staleReviewStarted.toISOString() };
    }
    // electrical was just submitted
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

  // check off two health inspection items in the sample
  project.inspections = project.inspections.map((item) =>
    item.id === "health-handwash" || item.id === "health-cfp"
      ? { ...item, completed: true }
      : item,
  );

  project.updatedAt = now.toISOString();
  return project;
}

// read the saved project list, or an empty list if storage isn't usable
function readIndex(): StoredProjectMeta[] {
  try {
    // not in a browser
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(PROJECT_INDEX_KEY);
    // nothing saved yet
    if (!raw) return [];
    return JSON.parse(raw) as StoredProjectMeta[];
  } catch {
    // bad json or blocked storage looks like an empty list
    return [];
  }
}

// write the project list back, unless we're not in a browser
function writeIndex(entries: StoredProjectMeta[]): void {
  // not in a browser
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(entries));
}

// find a saved project by the name on its config
function findLocalProjectByName(name: string): Project | undefined {
  // can't read the saved list
  if (!isProjectStorageReadable()) return undefined;
  // check the index before falling back to the last-opened project
  for (const meta of readIndex()) {
    const loaded = getProject(meta.id);
    // this saved project has the name we want
    if (loaded?.config.name === name) return loaded;
  }
  const lastId = getLastProjectId();
  // no last project to fall back to
  if (!lastId) return undefined;
  const fallback = getProject(lastId);
  // only use the last project when the name matches
  return fallback?.config.name === name ? fallback : undefined;
}

// keep the roadmap ids lined up with a stable project id
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
    // real projects pass through
    if (!SAMPLE_PROJECT_NAMES.has(name)) {
      unique.push(project);
      continue;
    }
    const current = bySampleName.get(name);
    // keep the sample copy with the later updatedAt
    if (!current || project.updatedAt > current.updatedAt) {
      bySampleName.set(name, project);
    }
  }

  unique.push(...bySampleName.values());
  // newest projects first
  return unique.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// true for the three canned demos, by id or by name
export function isSampleProject(project: Project): boolean {
  return (
    Object.values(SAMPLE_PROJECTS).some((sample) => sample.id === project.id) ||
    SAMPLE_PROJECT_NAMES.has(project.config.name)
  );
}

function visibleProjectsForCurrentUser(projects: Project[]): Project[] {
  // regular people shouldnt see the sample shops they dont own
  const user = getCurrentUser();
  // the demo judge is allowed to see the samples
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

// tell the page whether a save landed in the cloud, locally, or failed
function notifyDbSync(projectId: string, source: "supabase" | "local" | "syncing" | "error", updatedAt?: string): void {
  // no window, so there's nobody to notify
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(
    new CustomEvent(DB_SYNC_EVENT, {
      detail: { projectId, source, updatedAt, timestamp: new Date().toISOString() },
    }),
  );
}

export async function syncProjectToSupabase(project: Project): Promise<boolean> {
  // save locally even if the cloud write fails
  const supabase = getSupabaseClient();
  const user = getCurrentUser();
  // only real cloud sessions get a remote write
  if (!supabase || user?.mode !== "supabase") {
    notifyDbSync(project.id, "local", project.updatedAt);
    return false;
  }

  const row = {
    id: project.id,
    user_id: user.id,
    owner_email: user.email,
    name: project.config.name,
    config: project.config,
    roadmap: project.roadmap,
    documents: project.documents,
    inspections: project.inspections,
    fees: project.fees,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };

  notifyDbSync(project.id, "syncing", project.updatedAt);
  try {
    const { error } = await supabase.from("projects").upsert(row, { onConflict: "id" });
    // upsert went through
    if (!error) {
      notifyDbSync(project.id, "supabase", project.updatedAt);
      return true;
    }
  } catch {
    // Network failures still leave the saved browser copy available for retry.
  }
  notifyDbSync(project.id, "error", project.updatedAt);
  return false;
}

// stash the project, remember it as last, and kick off a cloud sync
export function saveProject(project: Project): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
  localStorage.setItem(LAST_KEY, project.id);

  const user = getCurrentUser();
  // drop the old index row so this id isn't listed twice
  const index = readIndex().filter((entry) => entry.id !== project.id);
  index.unshift({
    id: project.id,
    userId: user?.id,
    ownerEmail: user?.email,
  });
  // keep the index from growing past 50
  writeIndex(index.slice(0, 50));

  void syncProjectToSupabase(project);
}

// load one project from the browser, or null if it isn't there
export function getProject(id: string): Project | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(`${PROJECT_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

// true when we can actually read the project index
export function isProjectStorageReadable(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.getItem(PROJECT_INDEX_KEY);
    return true;
  } catch {
    return false;
  }
}

// keep a cloud copy in the browser when storage allows it
function cacheCloudProject(project: Project): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
    }
  } catch {
    // A readable cloud project must remain available when browser caching is blocked.
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

// turn a database row into the project shape the app uses
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
  const user = getCurrentUser();
  if (supabase && user?.mode === "supabase") {
    const { data, error } = await supabase
      .from("projects")
      .select("id, config, roadmap, documents, inspections, fees, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      const project = rowToProject(data as SupabaseProjectRow);
      const local = getProject(id);
      // a newer browser copy wins over the older cloud row
      if (local && local.updatedAt > project.updatedAt) return local;
      cacheCloudProject(project);
      notifyDbSync(project.id, "supabase", project.updatedAt);
      return project;
    }
  }
  return getProject(id);
}

// projects in this browser that belong to whoever is signed in
export function listLocalProjectsForCurrentUser(): Project[] {
  if (!isProjectStorageReadable()) return [];
  const user = getCurrentUser();
  const index = readIndex();
  const projects: Project[] = [];
  const seen = new Set<string>();

  for (const meta of index) {
    // skip rows saved under someone else's email
    if (user && meta.ownerEmail && meta.ownerEmail !== user.email) continue;
    const loaded = getProject(meta.id);
    // skip missing rows and ones we already added
    if (loaded && !seen.has(loaded.id)) {
      seen.add(loaded.id);
      projects.push(loaded);
    }
  }

  const lastId = getLastProjectId();
  // the last-opened project might not be in the index
  if (lastId && !seen.has(lastId)) {
    const fallback = getProject(lastId);
    const alreadyHaveSample =
      fallback &&
      SAMPLE_PROJECT_NAMES.has(fallback.config.name) &&
      projects.some((project) => project.config.name === fallback.config.name);
    // don't add a second copy of a sample we already have
    if (fallback && !alreadyHaveSample) projects.unshift(fallback);
  }

  return visibleProjectsForCurrentUser(dedupeSampleProjects(projects));
}

export async function listUserProjects(): Promise<Project[]> {
  // merge local + cloud then drop extra samples
  const local = listLocalProjectsForCurrentUser();
  const supabase = getSupabaseClient();
  const user = getCurrentUser();
  // no cloud session, so the browser list is the whole list
  if (!supabase || user?.mode !== "supabase") return local;

  const query = supabase
    .from("projects")
    .select("id, config, roadmap, documents, inspections, fees, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20)
    .eq("user_id", user.id);

  const { data, error } = await query;
  // cloud read failed, stick with what we have locally
  if (error || !data) return local;

  const merged = new Map<string, Project>();
  // cloud rows win, and we cache them locally
  for (const row of data as SupabaseProjectRow[]) {
    const project = rowToProject(row);
    merged.set(project.id, project);
    cacheCloudProject(project);
  }
  // keep local-only projects the cloud didn't return
  for (const item of local) {
    if (!merged.has(item.id)) merged.set(item.id, item);
  }
  return visibleProjectsForCurrentUser(dedupeSampleProjects([...merged.values()]));
}

// rebuild Harbor Kitchen and save it over the same id when we have one
export function resetHarborKitchen(existingId?: string): Project {
  const fresh = sampleProject(new Date(), existingId);
  saveProject(fresh);
  return fresh;
}

// reuse the saved Harbor Kitchen when health is still in review, otherwise reseed it
export function getOrSeedHarborKitchen(): Project {
  const existing = findLocalProjectByName(SAMPLE_PROJECTS.harbor.name);
  if (existing) {
    const health = existing.roadmap.steps.find((s) => s.id === "health-permit");
    // the stuck review is already there, so just save and return it
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

  // load the cafe, the block party, and harbor, creating any that are missing
  let cafe = findLocalProjectByName(SAMPLE_PROJECTS.cafe.name);
  // create the cafe demo the first time
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
    // first steps approved, then one in review and one submitted
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
  // create the block party demo the first time
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
    // first two approved, the third submitted
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

// id of the project we opened most recently
export function getLastProjectId(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
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

// replace the file for this step and requirement, then save
export function upsertDocument(project: Project, document: UploadedDocument): Project {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
    documents: [
      // drop the previous file for the same slot
      ...project.documents.filter(
        (item) => !(item.stepId === document.stepId && item.requirementId === document.requirementId),
      ),
      document,
    ],
  };
  saveProject(next);
  return next;
}

// take one uploaded file off the project and save
export function removeDocument(project: Project, documentId: string): Project {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
    documents: project.documents.filter((item) => item.id !== documentId),
  };
  saveProject(next);
  return next;
}

// flip one inspection item and save
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
