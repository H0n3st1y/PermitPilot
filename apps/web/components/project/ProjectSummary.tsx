"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Database, FileStack, GitBranch, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/timeline/StatusSelect";
import { displayProjectKind } from "@/fixtures/useCases";
import { stateName } from "@/fixtures/states";
import type { DashboardSummary } from "@/lib/dashboardSummary";
import { parseISODate } from "@/lib/dates";
import type { PermitStep, Project } from "@/lib/types";

export function RoadmapWelcome({ summary, onOpenTimeline, onDismiss }: {
  summary: DashboardSummary; onOpenTimeline: () => void; onDismiss: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <section className="panel roadmap-welcome" aria-labelledby="roadmap-ready-title">
      <div className="roadmap-welcome-copy">
        <p className="eyebrow">Roadmap generated</p>
        <h2 id="roadmap-ready-title" ref={heading} tabIndex={-1}>Your roadmap is ready</h2>
        <p>{summary.recommendedStep ? <>Start with <strong>{summary.recommendedStep.shortTitle}</strong> in the recommended action below. Review its requirements before applying.</> : "Review your permit checklist and confirm requirements with your municipality."}</p>
        <p>Timeline shows which steps depend on earlier approvals. Documents keeps each step’s required attachments together. This roadmap is a planning guide, not a submitted application.</p>
      </div>
      <div className="roadmap-welcome-actions">
        {summary.total > 0 ? <button className="button secondary" type="button" onClick={onOpenTimeline}>View dependencies<GitBranch size={16} aria-hidden /></button> : null}
        <button className="button secondary roadmap-welcome-dismiss" type="button" onClick={onDismiss}>Got it</button>
      </div>
    </section>
  );
}

export function ProjectHeader({ project, summary, saveState, onReset }: {
  project: Project; summary: DashboardSummary; saveState: string; onReset?: () => void;
}) {
  const complete = summary.total > 0 && summary.approved === summary.total;
  const active = summary.submitted + summary.inReview;
  const overall = summary.total === 0 ? "No permit steps" : complete ? "All steps marked approved" : active > 0 || summary.approved > 0 ? "In progress" : "Not started";
  return (
    <>
      <div className="project-toolbar">
        <Link href="/" className="project-back"><ArrowLeft size={16} aria-hidden /> All projects</Link>
        {onReset ? <button type="button" className="project-reset" onClick={onReset}><RotateCcw size={14} aria-hidden /> Reset demo</button> : null}
      </div>
      <header className="dashboard-heading">
        <div className="project-identity">
          <p className="eyebrow">Your permit roadmap</p>
          <h1>{project.config.name}</h1>
          <p className="project-description">{displayProjectKind(project.config)} <span aria-hidden>·</span> {project.config.state ? stateName(project.config.state) : "State not selected"} <span aria-hidden>·</span> {project.config.squareFootage.toLocaleString()} sq ft</p>
          <p className="project-save" role="status"><Database size={13} aria-hidden />{saveState === "supabase" ? "Saved to cloud" : saveState === "syncing" ? "Syncing to cloud…" : "Saved in this browser"}</p>
        </div>
        <section className="project-progress" aria-label="Recorded permit progress">
          <div className="project-progress-top"><span className="project-section-label">Permit progress</span><span className={`status-pill ${complete ? "status-approved" : active > 0 || summary.approved > 0 ? "status-submitted" : "status-not_started"}`}>{overall}</span></div>
          <p className="project-progress-count"><strong>{summary.approved}<span> / {summary.total}</span></strong> <span>steps marked approved</span></p>
          {summary.total > 0 ? <div className="project-progress-track" role="progressbar" aria-label="Steps marked approved" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.approved} aria-valuetext={`${summary.approved} of ${summary.total} steps marked approved`}>
            <span style={{ width: `${summary.approved / summary.total * 100}%` }} />
          </div> : null}
          <p className="project-progress-note">{summary.total === 0 ? "No steps in this roadmap yet." : complete ? "Recorded in your planning checklist." : `${active} submitted or in review · ${summary.notStarted} not started`}</p>
        </section>
      </header>
    </>
  );
}

export function ProjectPriorities({ project, summary, onOpenStep, onOpenDocuments, onOpenTimeline }: {
  project: Project; summary: DashboardSummary; onOpenStep: (step: PermitStep) => void; onOpenDocuments: () => void; onOpenTimeline: () => void;
}) {
  const step = summary.recommendedStep;
  const complete = summary.total > 0 && summary.approved === summary.total;
  const title = step ? step.status === "not_started" ? `Prepare ${step.shortTitle}` : `Check on ${step.shortTitle}` : complete ? "Your permit steps are marked approved" : summary.total === 0 ? "Your roadmap has no permit steps yet" : "Review the remaining dependencies";
  const description = step ? step.status === "not_started" ? `${step.dependencies.length ? "The earlier approvals are marked approved in your checklist." : "This step does not depend on earlier approvals."} Review this step’s requirements before you apply.` : summary.reviewSteps.some((item) => item.id === step.id) ? `This review may need a follow-up. Check with ${step.department} for an update before moving on.` : "Review the recorded status and confirm any updates with the department." : complete ? "Keep your documents and approval records together. Confirm final requirements with your municipality." : summary.total === 0 ? "Check your project details and confirm requirements with your municipality." : "Some steps are still waiting on earlier approvals. Open the timeline to see what they depend on.";
  const estimatedEnd = project.roadmap.steps.map((item) => item.estimatedEndDate).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().at(-1);
  const parsedEnd = estimatedEnd ? parseISODate(estimatedEnd) : null;
  const finish = parsedEnd && Number.isFinite(parsedEnd.getTime()) ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parsedEnd) : null;

  return (
    <div className="dashboard-priorities">
      <section className="panel next-action-card" aria-labelledby="next-action-title">
        <p className="eyebrow">Next recommended action</p>
        <h2 id="next-action-title" tabIndex={-1}>{title}</h2>
        {step ? <div className="next-action-meta"><StatusBadge status={step.status} /><span>{step.department}</span></div> : null}
        <p className="next-action-description">{description}</p>
        <div className="next-action-footer">
          {step ? <button type="button" className="button primary" onClick={() => onOpenStep(step)}>Review {step.shortTitle}<ArrowRight size={17} aria-hidden /></button> : summary.total > 0 ? <button type="button" className="button primary" onClick={complete ? onOpenDocuments : onOpenTimeline}>{complete ? "Review document records" : "Review timeline"}<ArrowRight size={17} aria-hidden /></button> : <Link href="/intake" className="button primary">Start a new project<ArrowRight size={17} aria-hidden /></Link>}
          <span className="next-action-hint">{step ? `Step ${step.sequence} of ${summary.total}` : "Planning checklist"}</span>
        </div>
      </section>
      <section className="panel attention-card" aria-labelledby="attention-title">
        <h2 id="attention-title">At a glance</h2>
        <button type="button" className="attention-row" onClick={onOpenDocuments} aria-label={summary.missingRequired ? `Review ${summary.missingRequired} missing required attachments` : "Review required attachment records"}>
          <span className={`attention-icon ${summary.missingRequired ? "needs-attention" : "is-clear"}`}>{summary.missingRequired ? <FileStack size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}</span>
          <span><strong>{summary.missingRequired ? `${summary.missingRequired} missing ${summary.missingRequired === 1 ? "attachment" : "attachments"}` : summary.requiredTotal ? "Required attachments added" : "No required attachments"}</strong><small>{summary.requiredTotal ? `${summary.attachedRequired} of ${summary.requiredTotal} required files attached` : "No file requirements in this roadmap"}</small></span>
          <ChevronRight size={17} aria-hidden />
        </button>
        {summary.blockedSteps.length ? <button type="button" className="attention-row" onClick={() => onOpenStep(summary.blockedSteps[0])} aria-label="Review blocked steps">
          <span className="attention-icon needs-attention"><GitBranch size={18} aria-hidden /></span><span><strong>{summary.blockedSteps.length} blocked {summary.blockedSteps.length === 1 ? "step" : "steps"}</strong><small>{summary.blockedSteps[0].shortTitle}{summary.blockedSteps.length > 1 ? ` + ${summary.blockedSteps.length - 1} more` : " · waiting on earlier approvals"}</small></span><ChevronRight size={17} aria-hidden />
        </button> : <div className="attention-row"><span className="attention-icon is-clear"><CheckCircle2 size={18} aria-hidden /></span><span><strong>No dependency blockers</strong><small>{summary.total ? "No steps waiting on earlier approvals" : "No steps to check yet"}</small></span></div>}
        {finish ? <button type="button" className="attention-row" onClick={onOpenTimeline} aria-label="View estimated project timeline"><span className="attention-icon"><CalendarDays size={18} aria-hidden /></span><span><strong>Estimated finish · {finish}</strong><small>Planning estimate, not a deadline</small></span><ChevronRight size={17} aria-hidden /></button> : <div className="attention-row"><span className="attention-icon"><CalendarDays size={18} aria-hidden /></span><span><strong>No schedule yet</strong><small>Estimates appear with your permit steps</small></span></div>}
      </section>
    </div>
  );
}
