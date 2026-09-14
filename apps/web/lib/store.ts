import { createProjectFromConfig } from "@/lib/engine/project";
import type {
  InspectionItem,
  PermitStepStatus,
  Project,
  ProjectConfig,
  UploadedDocument,
} from "@/lib/types";

const PROJECT_PREFIX = "permitpilot:project:";
const LAST_KEY = "permitpilot:last";

export function sampleConfig(): ProjectConfig {
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
  };
}

export function createProject(config: ProjectConfig): Project {
  return createProjectFromConfig(config);
}

export function sampleProject(now = new Date()): Project {
  const project = createProjectFromConfig(sampleConfig(), now);
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

export function saveProject(project: Project): void {
  localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
  localStorage.setItem(LAST_KEY, project.id);
}

export function getProject(id: string): Project | null {
  const raw = localStorage.getItem(`${PROJECT_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export function getLastProjectId(): string | null {
  return localStorage.getItem(LAST_KEY);
}

export function updateStepStatus(project: Project, stepId: string, status: PermitStepStatus): Project {
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
