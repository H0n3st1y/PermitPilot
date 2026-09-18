import { createProjectFromConfig } from "@/lib/engine/project";
import type { Project, ProjectConfig } from "@/lib/types";

export const SAMPLE_PROJECT_ID = "demo-harbor-kitchen";

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

function daysAgo(now: Date, days: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * The walkthrough project: zoning approved, health permit stuck in review,
 * electrical being prepared. Sample uploads are placeholders with no file bytes.
 */
export function sampleProject(now = new Date()): Project {
  const created = new Date(daysAgo(now, 50));
  const project = { ...createProjectFromConfig(sampleConfig(), created), id: SAMPLE_PROJECT_ID };
  project.roadmap = { ...project.roadmap, id: `roadmap-${SAMPLE_PROJECT_ID}`, projectId: SAMPLE_PROJECT_ID };

  const progress: Record<string, Array<[PermitStatus, number]>> = {
    "zoning-review": [["preparing", 45], ["submitted", 43], ["in_review", 41], ["approved", 32]],
    "health-permit": [["preparing", 31], ["submitted", 29], ["in_review", 27]],
    "fire-review": [["preparing", 31], ["submitted", 29], ["in_review", 26], ["approved", 12]],
    "electrical-permit": [["preparing", 2]],
  };

  project.roadmap.steps = project.roadmap.steps.map((step) => {
    const events = progress[step.id];
    if (!events) return step;
    const history = events.map(([status, ago]) => ({ status, at: daysAgo(now, ago) }));
    const last = history[history.length - 1];
    return { ...step, status: last.status, statusChangedAt: last.at, history };
  });

  project.documents = [
    { requirementId: "site-plan", stepId: "zoning-review", name: "harbor-kitchen-floor-plan.pdf", size: 248_320 },
    { requirementId: "menu", stepId: "health-permit", name: "proposed-menu.pdf", size: 82_144 },
    { requirementId: "food-plan", stepId: "health-permit", name: "food-safety-plan.pdf", size: 131_072 },
    { requirementId: "cfp", stepId: "health-permit", name: "cfpm-certificate.pdf", size: 64_512 },
    { requirementId: "fire-plan", stepId: "fire-review", name: "fire-floor-plan.pdf", size: 190_004 },
  ].map((doc, index) => ({
    ...doc,
    id: `doc-sample-${index + 1}`,
    mimeType: "application/pdf",
    uploadedAt: daysAgo(now, 33),
    stored: false,
    sample: true,
  }));

  project.inspectionProgress = { "health-handwash": true, "health-cfp": true, "fire-extinguishers": true };
  project.updatedAt = now.toISOString();
  return project;
}

type PermitStatus = Project["roadmap"]["steps"][number]["status"];
