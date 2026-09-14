"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, FileStack, GitCommitHorizontal, Landmark, Receipt } from "lucide-react";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { FeeSummary } from "@/components/fees/FeeSummary";
import { InspectionChecklists } from "@/components/inspections/InspectionChecklists";
import { AppShell } from "@/components/layout/AppShell";
import { RoadmapOverview } from "@/components/roadmap/RoadmapOverview";
import { TimelineView } from "@/components/timeline/TimelineView";
import { detectBottlenecks, nextAction } from "@/lib/engine/bottlenecks";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import {
  getProject,
  removeDocument,
  toggleInspection,
  updateStepStatus,
  upsertDocument,
} from "@/lib/store";
import type { PermitStepStatus, Project, UploadedDocument } from "@/lib/types";

const TABS = [
  { id: "overview", label: "Roadmap", icon: Landmark },
  { id: "timeline", label: "Timeline", icon: GitCommitHorizontal },
  { id: "documents", label: "Documents", icon: FileStack },
  { id: "fees", label: "Fees", icon: Receipt },
  { id: "inspections", label: "Inspections", icon: ClipboardCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ProjectDashboard({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const loaded = getProject(id);
    if (!loaded) {
      setMissing(true);
      return;
    }
    setProject(loaded);
  }, [id]);

  const bottlenecks = useMemo(
    () => (project ? detectBottlenecks(project.roadmap.steps) : []),
    [project],
  );
  const upcoming = project ? nextAction(project.roadmap.steps) : undefined;
  const approved = project?.roadmap.steps.filter((step) => step.status === "approved").length ?? 0;
  const total = project?.roadmap.steps.length ?? 0;

  function persist(next: Project, message: string) {
    setProject(next);
    setAnnounce(message);
  }

  if (missing) {
    return (
      <AppShell>
        <main id="main" className="mx-auto max-w-xl px-4 py-16">
          <h1 className="font-serif text-3xl text-[var(--navy)]">Project not found</h1>
          <p className="mt-3 text-[var(--muted)]">
            This demonstration project is stored in this browser. It may have been cleared, or the link is from another device.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="button primary" href="/intake">
              Start a new project
            </Link>
            <Link className="button secondary" href="/demo">
              Open the demo
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <main id="main" className="mx-auto max-w-xl px-4 py-16">
          <p>Loading your roadmap…</p>
        </main>
      </AppShell>
    );
  }

  const occupantLoad = estimateOccupantLoad(project.config.squareFootage, project.config.occupancy);

  return (
    <AppShell eyebrow="Interactive demonstration project">
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        <div className="sr-only" aria-live="polite">
          {announce}
        </div>
        <section className="panel mb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Permit roadmap</p>
              <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">{project.config.name}</h1>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">
                {project.config.squareFootage.toLocaleString()} sq ft · occupant load {occupantLoad} ·{" "}
                {approved} of {total} steps approved
              </p>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Next recommended action
              </p>
              <p className="mt-1 font-semibold text-[var(--navy)]">
                {upcoming ? `Work on ${upcoming.shortTitle} (${upcoming.department})` : "All demonstration steps are approved."}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--paper-2)]" aria-hidden>
            <div
              className="h-full rounded-full bg-[var(--ok)]"
              style={{ width: `${total ? Math.round((approved / total) * 100) : 0}%` }}
            />
          </div>
          <p className="sr-only">
            {approved} of {total} permit steps approved
          </p>
        </section>

        <div
          role="tablist"
          aria-label="Project sections"
          className="mb-4 flex gap-2 overflow-x-auto pb-1"
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                className={`tab ${selected ? "is-active" : ""}`}
                onClick={() => setTab(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                  event.preventDefault();
                  const index = TABS.findIndex((entry) => entry.id === tab);
                  const delta = event.key === "ArrowRight" ? 1 : -1;
                  const next = TABS[(index + delta + TABS.length) % TABS.length];
                  setTab(next.id);
                  document.getElementById(`tab-${next.id}`)?.focus();
                }}
              >
                <Icon size={16} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>

        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "overview" ? <RoadmapOverview project={project} bottlenecks={bottlenecks} /> : null}
          {tab === "timeline" ? (
            <TimelineView
              project={project}
              bottlenecks={bottlenecks}
              onStatusChange={(stepId: string, status: PermitStepStatus) => {
                const next = updateStepStatus(project, stepId, status);
                persist(next, `${next.roadmap.steps.find((step) => step.id === stepId)?.shortTitle} set to ${status.replace("_", " ")}`);
              }}
            />
          ) : null}
          {tab === "documents" ? (
            <DocumentVault
              project={project}
              onUpload={(document: UploadedDocument) => {
                persist(upsertDocument(project, document), `${document.name} uploaded`);
              }}
              onRemove={(documentId: string) => {
                persist(removeDocument(project, documentId), "Document removed");
              }}
            />
          ) : null}
          {tab === "fees" ? <FeeSummary fees={project.fees} config={project.config} /> : null}
          {tab === "inspections" ? (
            <InspectionChecklists
              items={project.inspections}
              onToggle={(itemId, completed) => {
                persist(toggleInspection(project, itemId, completed), "Inspection checklist updated");
              }}
            />
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
