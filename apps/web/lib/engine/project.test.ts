import { describe, expect, it } from "vitest";
import { draftFollowUpEmail } from "@/lib/followUp";
import { buildProjectCalendar } from "@/lib/ics";
import { finalizeConfig, validateIntake } from "@/lib/intake";
import { createProjectFromConfig, deriveProjectView, regenerateProject } from "@/lib/engine/project";
import { baseConfig } from "@/lib/engine/testUtils";
import { removeDocument, setInspectionItem, setStepStatus, upsertDocument } from "@/lib/projectActions";
import { sampleProject } from "@/lib/sample";
import { normalizeProject } from "@/lib/storage/projects";

const NOW = new Date("2026-09-14T12:00:00.000Z");

describe("project actions", () => {
  it("records status history and preserves other steps", () => {
    const project = createProjectFromConfig(baseConfig, NOW);
    const next = setStepStatus(project, "zoning-review", "submitted", "Filed online", NOW);
    const zoning = next.roadmap.steps.find((step) => step.id === "zoning-review")!;
    expect(zoning.status).toBe("submitted");
    expect(zoning.history).toEqual([{ status: "submitted", at: NOW.toISOString(), note: "Filed online" }]);
    expect(next.roadmap.steps.filter((step) => step.status !== "not_started")).toHaveLength(1);
    expect(project.roadmap.steps[0].status).toBe("not_started"); // pure
  });

  it("does not add history when the status is unchanged", () => {
    const project = createProjectFromConfig(baseConfig, NOW);
    const next = setStepStatus(project, "zoning-review", "not_started", undefined, NOW);
    expect(next.roadmap.steps[0].history).toEqual([]);
  });

  it("replaces an upload for the same requirement", () => {
    const project = createProjectFromConfig(baseConfig, NOW);
    const doc = { id: "a", requirementId: "site-plan", stepId: "zoning-review", name: "a.pdf", size: 1, mimeType: "application/pdf", uploadedAt: "", stored: true };
    const first = upsertDocument(project, doc).project;
    const second = upsertDocument(first, { ...doc, id: "b", name: "b.pdf" });
    expect(second.replacedId).toBe("a");
    expect(second.project.documents.map((item) => item.id)).toEqual(["b"]);
    expect(removeDocument(second.project, "b").documents).toEqual([]);
  });

  it("toggles inspection progress", () => {
    const project = setInspectionItem(createProjectFromConfig(baseConfig, NOW), "health-cfp", true);
    expect(project.inspectionProgress).toEqual({ "health-cfp": true });
    expect(setInspectionItem(project, "health-cfp", false).inspectionProgress).toEqual({});
  });
});

describe("regenerateProject", () => {
  it("re-runs the rules and carries progress for steps that remain", () => {
    let project = createProjectFromConfig(baseConfig, NOW);
    project = setStepStatus(project, "zoning-review", "approved", undefined, NOW);
    project = upsertDocument(project, {
      id: "doc-1",
      requirementId: "menu",
      stepId: "health-permit",
      name: "menu.pdf",
      size: 1,
      mimeType: "application/pdf",
      uploadedAt: "",
      stored: true,
    }).project;

    const edited = { ...baseConfig, projectType: "room_addition" as const, homeBased: false, foodPreparation: false };
    const { project: next, change, droppedDocumentIds } = regenerateProject(project, edited, NOW);

    expect(next.roadmap.steps.find((step) => step.id === "zoning-review")?.status).toBe("approved");
    expect(change.removed.map((step) => step.id)).toEqual(expect.arrayContaining(["health-permit", "business-license"]));
    expect(change.added.map((step) => step.id)).toContain("building-permit");
    expect(droppedDocumentIds).toEqual(["doc-1"]);
    expect(next.documents).toEqual([]);
    expect(next.id).toBe(project.id);
  });
});

describe("normalizeProject (schema v1 migration)", () => {
  it("migrates legacy projects and refreshes citations", () => {
    const current = createProjectFromConfig(baseConfig, NOW);
    const legacy = {
      id: current.id,
      config: current.config,
      roadmap: {
        ...current.roadmap,
        rulesVersion: undefined,
        steps: current.roadmap.steps.map(({ history: _history, ...step }) => ({
          ...step,
          citations: step.citations.map((citation) => ({ id: citation.id, code: "old" })),
        })),
      },
      documents: [{ id: "d", requirementId: "site-plan", stepId: "zoning-review", name: "x.pdf", size: 5, mimeType: "application/pdf", uploadedAt: "", verified: true, dataUrl: "data:" }],
      inspections: [{ id: "health-cfp", completed: true }, { id: "health-pest", completed: false }],
      fees: { total: 1 },
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    };
    const migrated = normalizeProject(JSON.parse(JSON.stringify(legacy)));
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.inspectionProgress).toEqual({ "health-cfp": true });
    expect(migrated.roadmap.steps[0].history).toEqual([]);
    expect(migrated.roadmap.steps[0].citations[0].code).not.toBe("old");
    expect(migrated.documents[0]).toMatchObject({ stored: false, name: "x.pdf" });
    expect("dataUrl" in migrated.documents[0]).toBe(false);
    expect(migrated.roadmap.rulesVersion).toBe("legacy");
  });

  it("rejects data that is not a project", () => {
    expect(() => normalizeProject({ hello: "world" })).toThrow(/missing required fields/);
    expect(() => normalizeProject(null)).toThrow();
  });
});

describe("intake validation", () => {
  it("validates per page and across pages", () => {
    expect(validateIntake({ ...baseConfig, squareFootage: 0 }, 1).squareFootage).toBeDefined();
    expect(validateIntake({ ...baseConfig, name: " " }, 2).name).toBeDefined();
    expect(validateIntake({ ...baseConfig, name: " " }, 1)).toEqual({});
    expect(
      validateIntake({ ...baseConfig, desiredStartDate: "2026-10-01", targetDate: "2026-09-01" }).targetDate,
    ).toBeDefined();
  });

  it("finalizes type-specific fields", () => {
    const event = finalizeConfig({ ...baseConfig, name: "  Fair ", projectType: "public_event", homeBased: true, visitorCount: 80 });
    expect(event).toMatchObject({ name: "Fair", homeBased: false, visitorCount: 80 });
    const kitchen = finalizeConfig({ ...baseConfig, foodPreparation: false, visitorCount: 30, desiredStartDate: "" });
    expect(kitchen).toMatchObject({ foodPreparation: true, visitorCount: undefined, desiredStartDate: undefined });
  });
});

describe("sample project and exports", () => {
  it("builds a sample with an overdue review and a blocked step", () => {
    const project = sampleProject(NOW);
    const { forecast } = deriveProjectView(project, NOW);
    expect(forecast.steps.get("health-permit")?.overdue).toBe(true);
    expect(project.documents.every((doc) => doc.sample && !doc.stored)).toBe(true);
  });

  it("exports a valid iCalendar file", () => {
    const project = createProjectFromConfig({ ...baseConfig, name: "Harbor, Kitchen; Test", targetDate: "2026-12-01" }, NOW);
    const view = deriveProjectView(project, NOW);
    const ics = buildProjectCalendar(project, view.forecast, view.inspections, NOW);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(ics.match(/END:VEVENT/g)?.length);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261201");
    expect(ics).toContain("Harbor\\, Kitchen\\; Test");
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true);
  });

  it("drafts a follow-up email with placeholders for the user to fill in", () => {
    const project = sampleProject(NOW);
    const step = project.roadmap.steps.find((item) => item.id === "health-permit")!;
    const draft = draftFollowUpEmail(project, step);
    expect(draft.subject).toContain("Food establishment health permit");
    expect(draft.body).toContain("Hello Public Health team");
    expect(draft.body).toContain("[add number]");
  });
});
