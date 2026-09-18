"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { FeeSummary } from "@/components/fees/FeeSummary";
import { WhyThisStepDrawer } from "@/components/graph/WhyThisStepDrawer";
import { InspectionChecklists } from "@/components/inspections/InspectionChecklists";
import { AppShell } from "@/components/layout/AppShell";
import { FeedbackToast } from "@/components/project/FeedbackToast";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { StepDetail } from "@/components/project/StepDetail";
import { RoadmapOverview, type StepFocus } from "@/components/roadmap/RoadmapOverview";
import { TimelineView } from "@/components/timeline/TimelineView";
import { formatCurrency } from "@/lib/dates";
import { derivePermitState } from "@/lib/engine/permitState";
import { useProject } from "@/lib/hooks/useProject";
import type { PhraseKey } from "@/lib/i18n/phrases";
import { useCopy } from "@/lib/i18n/useCopy";

/**
 * The graph pulls in a rendering library that nothing else needs, so it is
 * fetched only when the Graph tab is opened. That keeps the roadmap, which is
 * what most visitors land on, off the hook for the extra bytes.
 */
const PermitGraph = dynamic(
  () => import("@/components/graph/PermitGraph").then((mod) => mod.PermitGraph),
  { ssr: false, loading: () => <div className="skeleton h-96 w-full" aria-hidden /> },
);

const VIEWS = [
  { id: "overview", key: "tab.roadmap" },
  { id: "graph", key: "tab.graph" },
  { id: "timeline", key: "tab.timeline" },
  { id: "documents", key: "tab.documents" },
  { id: "fees", key: "tab.fees" },
  { id: "inspections", key: "tab.inspections" },
] as const satisfies readonly { id: string; key: PhraseKey }[];

export type ViewId = (typeof VIEWS)[number]["id"];

function isView(value: string | null): value is ViewId {
  return VIEWS.some((view) => view.id === value);
}

export function ProjectDashboard({ id }: { id: string }) {
  const params = useSearchParams();
  const { state, view: derived, now, feedback, clearFeedback, ...actions } = useProject(id);
  const { t } = useCopy();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const [focusIntent, setFocusIntent] = useState<{ stepId: string; focus: StepFocus } | null>(null);
  const [whyStepId, setWhyStepId] = useState<string | null>(null);

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

  /**
   * The single source of truth. Every view below reads this one object, so a
   * status change recomputes the roadmap, graph, timeline, and radar together
   * and they can never disagree about what is blocked.
   */
  const permitState = useMemo(
    () => (project && derived ? derivePermitState(project, derived.forecast, now) : null),
    [project, derived, now],
  );

  const openStep = useCallback(
    (next: string, focus?: StepFocus) => {
      setFocusIntent(focus ? { stepId: next, focus } : null);
      setWhyStepId(null);
      navigate({ step: next });
    },
    [navigate],
  );

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

  if (state.status !== "ready" || !project || !derived || !permitState) {
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

  const selectedStep = stepId ? permitState.byId.get(stepId) : undefined;
  const whyStep = whyStepId ? permitState.byId.get(whyStepId) : undefined;
  const inspectionsDone = derived.inspections.filter((item) => item.completed).length;
  const counts: Partial<Record<ViewId, string>> = {
    documents: `${permitState.docTotals.complete}/${permitState.docTotals.required}`,
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
          progress={permitState.progress}
          now={now}
        />

        <nav ref={tabsRef} className="tabs mt-6" aria-label={t("tab.sections")}>
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tab"
              aria-current={view === item.id ? (selectedStep ? "true" : "page") : undefined}
              onClick={() => navigate({ view: item.id, step: null })}
            >
              {t(item.key)}
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
                state={permitState.display.get(selectedStep.id) ?? "upcoming"}
                critical={permitState.critical.has(selectedStep.id)}
                bottlenecks={permitState.bottlenecksByStep.get(selectedStep.id) ?? []}
                fees={derived.fees}
                inspections={derived.inspections.filter((item) => item.stepIds.includes(selectedStep.id))}
                now={now}
                backLabel={t(VIEWS.find((item) => item.id === view)?.key ?? "tab.roadmap")}
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
                permitState={permitState}
                now={now}
                onOpenStep={openStep}
                onStatusChange={actions.changeStatus}
              />
            ) : null}
            {!stepId && view === "graph" ? (
              <PermitGraph headingRef={headingRef} state={permitState} onOpenNode={setWhyStepId} />
            ) : null}
            {!stepId && view === "timeline" ? (
              <TimelineView
                headingRef={headingRef}
                project={project}
                forecast={derived.forecast}
                display={permitState.display}
                critical={permitState.critical}
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

        {whyStep ? (
          <WhyThisStepDrawer
            step={whyStep}
            project={project}
            state={permitState}
            onClose={() => setWhyStepId(null)}
            onOpenStep={openStep}
          />
        ) : null}

        <FeedbackToast feedback={feedback} onDismiss={clearFeedback} />
      </main>
    </AppShell>
  );
}
