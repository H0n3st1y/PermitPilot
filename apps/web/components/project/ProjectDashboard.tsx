"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ClipboardCheck,
  Database,
  FileStack,
  GitCommitHorizontal,
  Landmark,
  Receipt,
  RotateCcw,
  Share2,
} from "lucide-react";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { FeeSummary } from "@/components/fees/FeeSummary";
import { InspectionChecklists } from "@/components/inspections/InspectionChecklists";
import { AppShell } from "@/components/layout/AppShell";
import { RoadmapOverview } from "@/components/roadmap/RoadmapOverview";
import { TimelineView } from "@/components/timeline/TimelineView";
import { ProductTour } from "@/components/tour/ProductTour";
import { useA11y } from "@/lib/a11y";
import { detectBottlenecks, nextAction } from "@/lib/engine/bottlenecks";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import {
  fetchProjectFromDb,
  getProject,
  removeDocument,
  resetHarborKitchen,
  toggleInspection,
  updateStepStatus,
  upsertDocument,
} from "@/lib/store";
import type { PermitStepStatus, Project, UploadedDocument } from "@/lib/types";

const PermitGraph = dynamic(
  () => import("@/components/graph/PermitGraph").then((mod) => mod.PermitGraph),
  {
    ssr: false,
    loading: () => <p className="panel">Loading graph…</p>,
  },
);

const TABS = [
  { id: "overview", icon: Landmark },
  { id: "graph", icon: Share2 },
  { id: "timeline", icon: GitCommitHorizontal },
  { id: "documents", icon: FileStack },
  { id: "fees", icon: Receipt },
  { id: "inspections", icon: ClipboardCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | undefined): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function ProjectDashboard({
  id,
  initialTab,
  initialTour = false,
}: {
  id: string;
  initialTab?: string;
  initialTour?: boolean;
}) {
  const { t } = useA11y();
  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<TabId>(isTabId(initialTab) ? initialTab : "overview");
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    let active = true;
    // show the local copy right away then swap if cloud has a newer one
    const loaded = getProject(id);
    if (loaded) {
      setProject(loaded);
      setMissing(false);
    }
    void fetchProjectFromDb(id).then((remote) => {
      if (!active) return;
      if (remote) {
        setProject(remote);
        setMissing(false);
      } else if (!loaded) {
        setMissing(true);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (isTabId(initialTab)) setTab(initialTab);
  }, [initialTab]);

  const bottlenecks = useMemo(
    () => (project ? detectBottlenecks(project.roadmap.steps) : []),
    [project],
  );
  const upcoming = project ? nextAction(project.roadmap.steps) : undefined;
  const approved = project?.roadmap.steps.filter((step) => step.status === "approved").length ?? 0;
  const total = project?.roadmap.steps.length ?? 0;
  const isHarborKitchen = project?.config.name === "Harbor Kitchen";

  function persist(next: Project, message: string) {
    setProject(next);
    setAnnounce(message);
  }

  const handleResetDemo = useCallback(() => {
    const fresh = resetHarborKitchen(project?.id);
    setProject(fresh);
    setAnnounce("Harbor Kitchen demonstration reset to initial bottleneck state.");
  }, [project?.id]);

  const handleBeforeTourStart = useCallback(() => {
    setTab("graph");
    if (!project) return;
    const health = project.roadmap.steps.find((s) => s.id === "health-permit");
    if (isHarborKitchen && health && health.status === "approved") {
      const fresh = resetHarborKitchen(project.id);
      setProject(fresh);
    }
  }, [isHarborKitchen, project]);

  if (missing) {
    return (
      <AppShell>
        <main id="main" className="mx-auto max-w-xl px-4 py-16">
          <h1 className="font-serif text-3xl text-[var(--navy)]">{t("common.notFound")}</h1>
          <p className="mt-3 text-[var(--muted)]">{t("common.notFoundBody")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="button primary" href="/intake">
              {t("common.startNew")}
            </Link>
            <Link className="button secondary" href="/demo">
              {t("common.openDemo")}
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
          <p>{t("common.loading")}</p>
        </main>
      </AppShell>
    );
  }

  const occupantLoad = estimateOccupantLoad(project.config.squareFootage, project.config.occupancy);

  return (
    <AppShell eyebrow="Interactive demonstration project">
      <ProductTour
        activeTab={tab}
        setActiveTab={setTab}
        forceStart={initialTour}
        onBeforeStart={handleBeforeTourStart}
      />
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        <div className="sr-only" aria-live="polite">
          {announce}
        </div>
        <section className="panel mb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow">{t("dashboard.eyebrow")}</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ok)]">
                  <Database size={12} aria-hidden />
                  {t("common.dbSaved")}
                </span>
              </div>
              <h1 className="mt-1 font-serif text-3xl text-[var(--navy)] sm:text-4xl">
                {project.config.name}
              </h1>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">
                {project.config.squareFootage.toLocaleString()} sq ft · occupant load {occupantLoad} ·{" "}
                {t("dashboard.stepsApproved", { approved, total })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isHarborKitchen ? (
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="button secondary"
                >
                  <RotateCcw size={15} aria-hidden />
                  {t("common.resetDemo")}
                </button>
              ) : null}
              <div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("common.nextAction")}
                </p>
                <p className="mt-1 font-semibold text-[var(--navy)]">
                  {upcoming
                    ? t("dashboard.nextActionWork", {
                        title: upcoming.shortTitle,
                        department: upcoming.department,
                      })
                    : t("dashboard.allApproved")}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--paper-2)]" aria-hidden>
            <div
              className="h-full rounded-full bg-[var(--ok)]"
              style={{ width: `${total ? Math.round((approved / total) * 100) : 0}%` }}
            />
          </div>
          <p className="sr-only">{t("dashboard.stepsApproved", { approved, total })}</p>
        </section>

        <div
          role="tablist"
          aria-label={t("dashboard.tabsLabel")}
          data-tour="project-tabs"
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
                {t(`dashboard.tabs.${item.id}`)}
              </button>
            );
          })}
        </div>

        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "overview" ? <RoadmapOverview project={project} bottlenecks={bottlenecks} /> : null}
          {tab === "graph" ? (
            <PermitGraph
              project={project}
              bottlenecks={bottlenecks}
              onStatusChange={(stepId: string, status: PermitStepStatus) => {
                const next = updateStepStatus(project, stepId, status);
                persist(
                  next,
                  `${next.roadmap.steps.find((step) => step.id === stepId)?.shortTitle} set to ${status.replace("_", " ")}`,
                );
              }}
            />
          ) : null}
          {tab === "timeline" ? (
            <TimelineView
              project={project}
              bottlenecks={bottlenecks}
              onStatusChange={(stepId: string, status: PermitStepStatus) => {
                const next = updateStepStatus(project, stepId, status);
                persist(
                  next,
                  `${next.roadmap.steps.find((step) => step.id === stepId)?.shortTitle} set to ${status.replace("_", " ")}`,
                );
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
