"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ClipboardCheck,
  FileStack,
  GitCommitHorizontal,
  Landmark,
  Receipt,
  Share2,
} from "lucide-react";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { FeeSummary } from "@/components/fees/FeeSummary";
import { InspectionChecklists } from "@/components/inspections/InspectionChecklists";
import { AppShell } from "@/components/layout/AppShell";
import { RoadmapOverview } from "@/components/roadmap/RoadmapOverview";
import { TimelineView } from "@/components/timeline/TimelineView";
import { ProductTour } from "@/components/tour/ProductTour";
import { ProjectHeader, ProjectPriorities, RoadmapWelcome } from "@/components/project/ProjectSummary";
import { useA11y } from "@/lib/a11y";
import { detectBottlenecks } from "@/lib/engine/bottlenecks";
import { getDashboardSummary } from "@/lib/dashboardSummary";
import {
  fetchProjectFromDb,
  DB_SYNC_EVENT,
  getProject,
  isProjectStorageReadable,
  removeDocument,
  resetHarborKitchen,
  syncProjectToSupabase,
  toggleInspection,
  updateStepStatus,
  upsertDocument,
} from "@/lib/store";
import type { PermitStepStatus, Project, UploadedDocument } from "@/lib/types";

// graph is client-only, with a loading line while the chunk arrives
const PermitGraph = dynamic(
  () => import("@/components/graph/PermitGraph").then((mod) => mod.PermitGraph),
  {
    ssr: false,
    loading: () => <p className="panel" role="status">Loading graph…</p>,
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

// true when the query value is one of our tab ids
function isTabId(value: string | undefined): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

// project page: load it, switch sections, and save edits
export function ProjectDashboard({
  id,
  initialTab,
  initialTour = false,
  initialCreated = false,
}: {
  id: string;
  initialTab?: string;
  initialTour?: boolean;
  initialCreated?: boolean;
}) {
  const { t } = useA11y();
  const [project, setProject] = useState<Project | null>(null);
  // File reads can finish together or after another edit. Merge with the latest
  // saved snapshot synchronously, rather than the render that started the read.
  const projectRef = useRef<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<TabId>(isTabId(initialTab) ? initialTab : "overview");
  const [announce, setAnnounce] = useState("");
  const [saveState, setSaveState] = useState("local");
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showWelcome, setShowWelcome] = useState(initialCreated);

  // update the save label when this project syncs
  useEffect(() => {
    function handleSync(event: Event) {
      const detail = (event as CustomEvent<{ projectId: string; source: string; updatedAt?: string }>).detail;
      // ignore saves for a different project
      if (detail.projectId !== id) return;
      const current = getProject(id);
      // a stale event should not overwrite a newer local save
      if (current && detail.updatedAt && detail.updatedAt < current.updatedAt) return;
      setSaveState(detail.source);
    }
    window.addEventListener(DB_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(DB_SYNC_EVENT, handleSync);
  }, [id]);

  // switch tabs and keep the url in sync
  const selectTab = useCallback((next: TabId) => {
    const sections = document.querySelector('[data-tour="project-tabs"]');
    // sticky phone tabs are pinned when they sit at the top of the viewport
    const wasPinned = sections && window.getComputedStyle(sections).position === "sticky" && sections.getBoundingClientRect().top <= 1;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
    // A section switch from the pinned phone navigation starts at its content.
    if (wasPinned) window.setTimeout(() => document.getElementById(`panel-${next}`)?.scrollIntoView({ block: "start" }), 0);
  }, []);

  // show the local project, then replace it if the cloud copy is newer
  useEffect(() => {
    let active = true;
    setLoadError(false);
    setMissing(false);
    // show the local copy right away then swap if cloud has a newer one
    const loaded = getProject(id);
    projectRef.current = loaded ?? null;
    setProject(loaded ?? null);
    if (loaded) {
      setMissing(false);
    }
    void fetchProjectFromDb(id).then((remote) => {
      if (!active) return;
      if (remote) {
        const current = projectRef.current;
        // keep the local copy when it is newer than the cloud one
        const next = current && current.id === remote.id && current.updatedAt > remote.updatedAt ? current : remote;
        projectRef.current = next;
        setProject(next);
        setMissing(false);
      } else if (!loaded) {
        // missing project vs storage we could not read
        if (isProjectStorageReadable()) setMissing(true);
        else setLoadError(true);
      }
    }).catch(() => { if (active && !loaded) setLoadError(true); });
    return () => {
      active = false;
    };
  }, [id, loadAttempt]);

  // follow a tab that arrives from the url
  useEffect(() => {
    if (isTabId(initialTab)) setTab(initialTab);
  }, [initialTab]);

  // recompute bottlenecks when the project changes
  const bottlenecks = useMemo(
    () => (project ? detectBottlenecks(project.roadmap.steps) : []),
    [project],
  );
  const isHarborKitchen = project?.config.name === "Harbor Kitchen";

  // keep the ref and the screen on the project we just saved
  function persist(next: Project, message: string) {
    projectRef.current = next;
    setProject(next);
    setAnnounce(message);
    setSaveError("");
  }

  // the project the in-flight edit should write to
  function latestProject() {
    const current = projectRef.current;
    if (!current || current.id !== id) throw new Error("The project changed before the action finished.");
    return current;
  }

  // run a save and report it, or show the storage error
  function mutate(action: () => Project, message: string) {
    try {
      persist(action(), message);
      return true;
    } catch {
      setSaveError("Your change could not be saved. Browser storage may be full or unavailable. Free up storage and try the action again.");
      return false;
    }
  }

  // put harbor kitchen back to its starting bottleneck
  const handleResetDemo = useCallback(() => {
    try {
      const fresh = resetHarborKitchen(project?.id);
      projectRef.current = fresh;
      setProject(fresh);
      setSaveError("");
      setAnnounce("Harbor Kitchen demonstration reset to initial bottleneck state.");
    } catch {
      setSaveError("The demonstration could not be reset. Check browser storage and try again.");
    }
  }, [project?.id]);

  // tour starts on the graph, and resets harbor kitchen if health is already approved
  const handleBeforeTourStart = useCallback(() => {
    selectTab("graph");
    if (!project) return;
    const health = project.roadmap.steps.find((s) => s.id === "health-permit");
    // the demo bottleneck only shows while health is not approved
    if (isHarborKitchen && health && health.status === "approved") {
      try {
        const fresh = resetHarborKitchen(project.id);
        projectRef.current = fresh;
        setProject(fresh);
      } catch { setSaveError("The demonstration could not be reset. Check browser storage and try again."); }
    }
  }, [isHarborKitchen, project, selectTab]);

  // unknown id
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

  // still loading, or the load failed
  if (!project) {
    return (
      <AppShell>
        <main id="main" className="mx-auto max-w-xl px-4 py-16">
          {/* retry bumps the attempt so the load effect runs again */}
          {loadError ? <div role="alert"><p>We could not load this project. Check your connection and allow browser storage, then try again.</p><button className="button secondary mt-4" type="button" onClick={() => setLoadAttempt((value) => value + 1)}>Try again</button></div> : <p role="status">{t("common.loading")}</p>}
        </main>
      </AppShell>
    );
  }

  const summary = getDashboardSummary(project, bottlenecks);

  // switch tabs, then focus and scroll the target
  function openSection(next: TabId, targetId?: string) {
    selectTab(next);
    window.setTimeout(() => {
      const target = document.getElementById(targetId ?? `panel-${next}`);
      target?.focus();
      target?.scrollIntoView({ block: "start" });
    }, 0);
  }

  // open documents on the first step that is still missing a required file
  function openMissingDocuments() {
    if (!project) return;
    const { roadmap, documents } = project;
    const firstMissing = roadmap.steps.find((step) => step.documents.some((requirement) => requirement.required && !documents.some((document) => document.stepId === step.id && document.requirementId === requirement.id)));
    openSection("documents", firstMissing ? `documents-${firstMissing.id}` : undefined);
  }

  // hide the welcome card and drop the created flag from the url
  function dismissWelcome() {
    setShowWelcome(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("created");
    window.history.replaceState(null, "", url);
    document.getElementById("next-action-title")?.focus();
  }

  return (
    <AppShell eyebrow={isHarborKitchen ? "Interactive demonstration project" : "Project workspace"}>
      {/* ignore a tab name the tour does not know */}
      <ProductTour
        activeTab={tab}
        setActiveTab={(value) => { if (isTabId(value)) selectTab(value); }}
        forceStart={initialTour}
        autoStart={initialTab === "graph"}
        onBeforeStart={handleBeforeTourStart}
      />
      <main id="main" className="project-workspace mx-auto max-w-6xl px-4 py-6">
        <div className="sr-only" role="status" aria-live="polite">
          {announce}
        </div>
        {/* local save failed */}
        {saveError ? <p className="panel mb-4 text-[var(--danger)]" role="alert">{saveError}</p> : null}
        {/* saved here, but the cloud copy did not update */}
        {saveState === "error" ? <div className="panel panel-warn mb-4" role="status"><p>Saved in this browser. Cloud sync failed. Keep using this device or retry to save across devices.</p><button type="button" className="button secondary mt-3" onClick={() => void syncProjectToSupabase(project)}>Retry cloud sync</button></div> : null}
        <ProjectHeader project={project} summary={summary} saveState={saveState} onReset={isHarborKitchen ? handleResetDemo : undefined} />

        <div
          role="tablist"
          aria-label={t("dashboard.tabsLabel")}
          data-tour="project-tabs"
          className="project-sections"
        >
          {/* one tab button per section */}
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
                onClick={() => selectTab(item.id)}
                onKeyDown={(event) => {
                  // arrows, home, and end move between the section tabs
                  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const index = TABS.findIndex((entry) => entry.id === tab);
                  const delta = event.key === "ArrowRight" ? 1 : -1;
                  // home and end jump; arrows wrap
                  const next = event.key === "Home" ? TABS[0] : event.key === "End" ? TABS[TABS.length - 1] : TABS[(index + delta + TABS.length) % TABS.length];
                  selectTab(next.id);
                  document.getElementById(`tab-${next.id}`)?.focus();
                }}
              >
                <Icon size={16} aria-hidden />
                {t(`dashboard.tabs.${item.id}`)}
              </button>
            );
          })}
        </div>

        <div id={`panel-${tab}`} role="tabpanel" tabIndex={0} aria-labelledby={`tab-${tab}`} className="project-section-panel min-w-0">
          {/* welcome card only right after a roadmap is created */}
          {tab === "overview" ? <>{showWelcome ? <RoadmapWelcome summary={summary} onOpenTimeline={() => openSection("timeline")} onDismiss={dismissWelcome} /> : null}<ProjectPriorities project={project} summary={summary} onOpenStep={(step) => openSection("timeline", `step-${step.id}`)} onOpenDocuments={openMissingDocuments} onOpenTimeline={() => openSection("timeline")} /><RoadmapOverview project={project} bottlenecks={bottlenecks} /></> : null}
          {/* each panel below is the active tab */}
          {tab === "graph" ? (
            <PermitGraph
              project={project}
              bottlenecks={bottlenecks}
              onStatusChange={(stepId: string, status: PermitStepStatus) => {
                // save the new status and announce the step name
                return mutate(() => updateStepStatus(latestProject(), stepId, status), `${project.roadmap.steps.find((step) => step.id === stepId)?.shortTitle} set to ${status.replace("_", " ")}`);
              }}
            />
          ) : null}
          {tab === "timeline" ? (
            <TimelineView
              project={project}
              bottlenecks={bottlenecks}
              onStatusChange={(stepId: string, status: PermitStepStatus) => {
                // same status save from the timeline
                mutate(() => updateStepStatus(latestProject(), stepId, status), `${project.roadmap.steps.find((step) => step.id === stepId)?.shortTitle} set to ${status.replace("_", " ")}`);
              }}
            />
          ) : null}
          {tab === "documents" ? (
            <DocumentVault
              project={project}
              onUpload={(document: UploadedDocument) => {
                // attach against the latest project, not a stale render
                persist(upsertDocument(latestProject(), document), `${document.name} attached`);
              }}
              onRemove={(documentId: string) => {
                persist(removeDocument(latestProject(), documentId), "Document removed");
              }}
            />
          ) : null}
          {tab === "fees" ? <FeeSummary fees={project.fees} config={project.config} /> : null}
          {tab === "inspections" ? (
            <InspectionChecklists
              items={project.inspections}
              onToggle={(itemId, completed) => {
                // save the checkbox without treating it as a passed inspection
                mutate(() => toggleInspection(latestProject(), itemId, completed), "Inspection checklist updated");
              }}
            />
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
