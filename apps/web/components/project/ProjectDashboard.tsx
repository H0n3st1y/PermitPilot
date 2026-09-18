"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { FeeSummary } from "@/components/fees/FeeSummary";
import { InspectionChecklists } from "@/components/inspections/InspectionChecklists";
import { AppShell } from "@/components/layout/AppShell";
import { FeedbackToast } from "@/components/project/FeedbackToast";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { StepDetail } from "@/components/project/StepDetail";
import { RoadmapOverview, type StepFocus } from "@/components/roadmap/RoadmapOverview";
import { TimelineView } from "@/components/timeline/TimelineView";
import { formatCurrency } from "@/lib/dates";
import {
  classifySteps,
  detectBottlenecks,
  displayStates,
  nextActions,
  projectProgress,
  stepDocumentProgress,
} from "@/lib/engine/progress";
import { criticalPathIds } from "@/lib/engine/timeline";
import { useProject } from "@/lib/hooks/useProject";

const VIEWS = [
  { id: "overview", label: "Roadmap" },
  { id: "timeline", label: "Timeline" },
  { id: "documents", label: "Documents" },
  { id: "fees", label: "Fees" },
  { id: "inspections", label: "Inspections" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

function isView(value: string | null): value is ViewId {
  return VIEWS.some((view) => view.id === value);
}

export function ProjectDashboard({ id }: { id: string }) {
  const params = useSearchParams();
  const { state, view: derived, now, feedback, clearFeedback, ...actions } = useProject(id);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const [focusIntent, setFocusIntent] = useState<{ stepId: string; focus: StepFocus } | null>(null);

  const requested = params.get("view");
  const view: ViewId = isView(requested) ? requested : "overview";
  const stepId = params.get("step");

  /**
   * Views are URL state. history.pushState keeps Back/Forward working and, unlike a
   * router navigation, needs no server round-trip, so switching views is instant.
   */
  const navigate = useCallback(
    (next: { view?: ViewId; step?: string | null }) => {
      const search = new URLSearchParams(params.toString());
      if (next.view) search.set("view", next.view);
      if (next.view === "overview") search.delete("view");
      if (next.step === null) search.delete("step");
      else if (next.step) search.set("step", next.step);
      const query = search.toString();
      window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
      // Keep the tab bar in view without jumping to the top of the page.
      const tabs = tabsRef.current;
      if (tabs && tabs.getBoundingClientRect().top < 0) {
        window.scrollTo({ top: tabs.offsetTop - 8 });
      }
    },
    [params],
  );

  // After navigating, move focus to the new view's heading (not on first load).
  const lastLocation = useRef<string | null>(null);
  useEffect(() => {
    const location = `${view}:${stepId ?? ""}`;
    if (lastLocation.current !== null && lastLocation.current !== location) {
      headingRef.current?.focus({ preventScroll: true });
    }
    lastLocation.current = location;
  }, [view, stepId]);

  const project = state.status === "ready" ? state.project : null;
  const analysis = useMemo(() => {
    if (!project || !derived) return null;
    const { steps } = project.roadmap;
    const states = classifySteps(steps, derived.forecast);
    const bottlenecks = detectBottlenecks(steps, project.documents, derived.forecast, now);
    const docTotals = steps.reduce(
      (sum, step) => {
        const progress = stepDocumentProgress(project.documents, step);
        return { required: sum.required + progress.required, complete: sum.complete + progress.complete };
      },
      { required: 0, complete: 0 },
    );
    return {
      states,
      display: displayStates(states, bottlenecks),
      bottlenecks,
      actions: nextActions(steps, derived.forecast),
      progress: projectProgress(steps),
      critical: criticalPathIds(steps, derived.forecast),
      docTotals,
    };
  }, [project, derived, now]);

  if (state.status === "loading") {
    return (
      <AppShell>
        <main id="main" className="container pb-16 pt-6" aria-busy="true">
          <p className="sr-only" role="status">
            Loading your roadmap…
          </p>
          <div className="skeleton h-4 w-40" />
          <div className="skeleton mt-3 h-8 w-72 max-w-full" />
          <div className="skeleton mt-4 h-1.5 w-full max-w-md" />
          <div className="skeleton mt-8 h-11 w-full" />
          <div className="skeleton mt-6 h-28 w-full" />
          <div className="skeleton mt-6 h-64 w-full" />
        </main>
      </AppShell>
    );
  }

  if (state.status !== "ready" || !project || !derived || !analysis) {
    const corrupt = state.status === "corrupt";
    return (
      <AppShell>
        <main id="main" className="container-narrow py-16">
          <h1 className="page-title">{corrupt ? "This project couldn't be opened" : "Project not found"}</h1>
          <p className="mt-3 text-[var(--ink-2)]">
            {corrupt
              ? "The copy saved in this browser is damaged or from an incompatible version. Your other projects are not affected."
              : "Projects are saved only in the browser where they were created. This one may have been deleted, or the link came from another device."}
          </p>
          {corrupt ? <p className="meta mt-2 font-mono">{state.error}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/intake">
              Start a new project
            </Link>
            <Link className="btn btn-secondary" href="/">
              Your projects
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const selectedStep = stepId ? project.roadmap.steps.find((step) => step.id === stepId) : undefined;
  const openStep = (next: string, focus?: StepFocus) => {
    setFocusIntent(focus ? { stepId: next, focus } : null);
    navigate({ step: next });
  };
  const inspectionsDone = derived.inspections.filter((item) => item.completed).length;
  const counts: Partial<Record<ViewId, string>> = {
    documents: `${analysis.docTotals.complete}/${analysis.docTotals.required}`,
    fees: formatCurrency(derived.fees.total).replace(/\.00$/, ""),
    inspections: derived.inspections.length ? `${inspectionsDone}/${derived.inspections.length}` : undefined,
  };

  return (
    <AppShell>
      <main id="main" className="container pb-16 pt-6">
        <ProjectHeader
          project={project}
          forecast={derived.forecast}
          inspections={derived.inspections}
          progress={analysis.progress}
          now={now}
        />

        <nav ref={tabsRef} className="tabs mt-6" aria-label="Project sections">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tab"
              aria-current={view === item.id ? (selectedStep ? "true" : "page") : undefined}
              onClick={() => navigate({ view: item.id, step: null })}
            >
              {item.label}
              {counts[item.id] ? <span className="tab-count">{counts[item.id]}</span> : null}
            </button>
          ))}
        </nav>

        <div className="pt-6" key={selectedStep ? `step-${selectedStep.id}` : view}>
          <div className="fade-in">
            {stepId && !selectedStep ? (
              <div className="callout callout-attention">
                <h2 id="section-heading" ref={headingRef} tabIndex={-1} className="h3">
                  That step isn&apos;t on this roadmap
                </h2>
                <p className="mt-1">It may have been removed when the project details were edited.</p>
                <button type="button" className="link link-target" onClick={() => navigate({ step: null })}>
                  Back to the roadmap
                </button>
              </div>
            ) : null}
            {selectedStep ? (
              <StepDetail
                headingRef={headingRef}
                project={project}
                step={selectedStep}
                forecast={derived.forecast.steps.get(selectedStep.id)}
                state={analysis.display.get(selectedStep.id) ?? "upcoming"}
                critical={analysis.critical.has(selectedStep.id)}
                bottlenecks={analysis.bottlenecks.filter((item) => item.stepId === selectedStep.id)}
                fees={derived.fees}
                inspections={derived.inspections.filter((item) => item.stepIds.includes(selectedStep.id))}
                now={now}
                backLabel={VIEWS.find((item) => item.id === view)?.label ?? "Roadmap"}
                initialFocus={focusIntent?.stepId === selectedStep.id ? focusIntent.focus : undefined}
                onBack={() => navigate({ step: null })}
                onOpenStep={openStep}
                onStatusChange={actions.changeStatus}
                onUpload={actions.uploadDocument}
                onRemove={actions.deleteDocument}
                onToggleInspection={actions.toggleInspection}
              />
            ) : null}
            {!stepId && view === "overview" ? (
              <RoadmapOverview
                headingRef={headingRef}
                project={project}
                forecast={derived.forecast}
                display={analysis.display}
                bottlenecks={analysis.bottlenecks}
                actions={analysis.actions}
                progress={analysis.progress}
                critical={analysis.critical}
                now={now}
                onOpenStep={openStep}
                onStatusChange={actions.changeStatus}
              />
            ) : null}
            {!stepId && view === "timeline" ? (
              <TimelineView
                headingRef={headingRef}
                project={project}
                forecast={derived.forecast}
                display={analysis.display}
                critical={analysis.critical}
                now={now}
                onOpenStep={openStep}
                onStatusChange={actions.changeStatus}
              />
            ) : null}
            {!stepId && view === "documents" ? (
              <DocumentVault
                headingRef={headingRef}
                project={project}
                onOpenStep={openStep}
                onUpload={actions.uploadDocument}
                onRemove={actions.deleteDocument}
              />
            ) : null}
            {!stepId && view === "fees" ? (
              <FeeSummary headingRef={headingRef} fees={derived.fees} project={project} onOpenStep={openStep} />
            ) : null}
            {!stepId && view === "inspections" ? (
              <InspectionChecklists
                headingRef={headingRef}
                items={derived.inspections}
                project={project}
                onOpenStep={openStep}
                onToggle={actions.toggleInspection}
              />
            ) : null}
          </div>
        </div>
        <FeedbackToast feedback={feedback} onDismiss={clearFeedback} />
      </main>
    </AppShell>
  );
}
