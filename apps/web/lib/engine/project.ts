import { calculateFees } from "@/lib/engine/fees";
import { inspectionsFor } from "@/lib/engine/inspections";
import { evaluateRules, RULES_VERSION } from "@/lib/engine/rules";
import { forecastTimeline } from "@/lib/engine/timeline";
import { createId } from "@/lib/ids";
import type { PermitStep, Project, ProjectConfig } from "@/lib/types";

export function createProjectFromConfig(config: ProjectConfig, now = new Date()): Project {
  const evaluation = evaluateRules(config, now);
  const id = createId();
  const createdAt = now.toISOString();

  return {
    schemaVersion: 2,
    id,
    config,
    roadmap: {
      id: `roadmap-${id}`,
      projectId: id,
      steps: evaluation.steps,
      warnings: evaluation.warnings,
      traces: evaluation.traces,
      rulesVersion: RULES_VERSION,
      generatedAt: createdAt,
    },
    documents: [],
    inspectionProgress: {},
    createdAt,
    updatedAt: createdAt,
  };
}

export interface RoadmapChange {
  added: PermitStep[];
  removed: PermitStep[];
  kept: PermitStep[];
}

/**
 * Re-runs the rules for edited project details. Progress (status, history,
 * uploads, checklist ticks) carries over for every step that is still required;
 * uploads for removed steps are dropped.
 */
export function regenerateProject(
  project: Project,
  config: ProjectConfig,
  now = new Date(),
): { project: Project; change: RoadmapChange; droppedDocumentIds: string[] } {
  const evaluation = evaluateRules(config, now);
  const previous = new Map(project.roadmap.steps.map((step) => [step.id, step]));
  const nextIds = new Set(evaluation.steps.map((step) => step.id));

  const steps = evaluation.steps.map((step) => {
    const prior = previous.get(step.id);
    return prior
      ? { ...step, status: prior.status, statusChangedAt: prior.statusChangedAt, history: prior.history }
      : step;
  });
  const droppedDocumentIds = project.documents.filter((doc) => !nextIds.has(doc.stepId)).map((doc) => doc.id);
  const timestamp = now.toISOString();

  return {
    project: {
      ...project,
      config,
      roadmap: {
        ...project.roadmap,
        steps,
        warnings: evaluation.warnings,
        traces: evaluation.traces,
        rulesVersion: RULES_VERSION,
        generatedAt: timestamp,
      },
      documents: project.documents.filter((doc) => nextIds.has(doc.stepId)),
      updatedAt: timestamp,
    },
    change: {
      added: steps.filter((step) => !previous.has(step.id)),
      removed: project.roadmap.steps.filter((step) => !nextIds.has(step.id)),
      kept: steps.filter((step) => previous.has(step.id)),
    },
    droppedDocumentIds,
  };
}

/** Everything derived from a project; computed on demand, never stored. */
export function deriveProjectView(project: Project, now = new Date()) {
  const { steps } = project.roadmap;
  return {
    forecast: forecastTimeline(steps, now, project.config.desiredStartDate),
    fees: calculateFees(project.config, steps),
    inspections: inspectionsFor(project.config, steps, project.inspectionProgress),
  };
}
