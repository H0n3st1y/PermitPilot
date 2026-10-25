"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import { StatusBadge } from "@/components/timeline/StatusSelect";
import { stepDocumentProgress } from "@/components/documents/DocumentVault";
import { formatShortDate } from "@/lib/dates";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import { useA11y } from "@/lib/a11y";
import { displayProjectKind } from "@/fixtures/useCases";
import { stateName } from "@/fixtures/states";
import {
  OCCUPANCY_LABELS,
  TRADE_LABELS,
  ZONE_LABELS,
  type Bottleneck,
  type Project,
} from "@/lib/types";

export function RoadmapOverview({
  project,
  bottlenecks,
}: {
  project: Project;
  bottlenecks: Bottleneck[];
}) {
  const { plainLanguage } = useA11y();
  const occupantLoad = estimateOccupantLoad(project.config.squareFootage, project.config.occupancy);
  const approved = project.roadmap.steps.filter((step) => step.status === "approved").length;
  const total = project.roadmap.steps.length;

  return (
    <div className="roadmap-layout">
      <section className="roadmap-checklist" aria-labelledby="permit-checklist-title">
        <div className="roadmap-checklist-heading">
          <div>
            <p className="eyebrow">Your roadmap</p>
            <h2 id="permit-checklist-title" className="font-serif text-2xl text-[var(--navy)]">
              Permit checklist
            </h2>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {total > 0 ? `${approved} of ${total} steps approved` : "No steps generated"}
          </p>
        </div>
        {total > 0 ? (
          <ol className="space-y-3">
            {project.roadmap.steps.map((step) => {
              const docs = stepDocumentProgress(project, step);
              const stepBottlenecks = bottlenecks.filter((item) => item.stepId === step.id);
              return (
                <li key={step.id} className="panel roadmap-step-card">
                  <div className="roadmap-step-heading">
                    <span className="roadmap-step-number" aria-label={`Step ${step.sequence}`}>
                      {step.sequence}
                    </span>
                    <div className="roadmap-step-title min-w-0">
                      <p className="eyebrow">{step.department}</p>
                      <h3 className="break-words font-serif text-xl text-[var(--navy)]">{step.title}</h3>
                    </div>
                    <StatusBadge status={step.status} />
                  </div>
                  <p className="mt-2 text-[var(--ink)]">{plainLanguage ? step.plainLanguage : step.whyRequired}</p>
                  <p className="roadmap-step-meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={15} aria-hidden />
                      {step.estimatedMinDays}–{step.estimatedMaxDays} business days
                    </span>
                    {docs.required > 0 ? (
                      docs.done ? (
                        <span className="inline-flex items-center gap-1 text-[var(--ok)]">
                          <CheckCircle2 size={15} aria-hidden />
                          Required documents attached
                        </span>
                      ) : (
                        <span>{docs.complete}/{docs.required} documents attached</span>
                      )
                    ) : null}
                  </p>
                  {stepBottlenecks.map((bottleneck) => (
                    <p key={`${bottleneck.stepId}-${bottleneck.kind}`} className="bottleneck-flag mt-3">
                      <AlertTriangle size={16} aria-hidden />
                      {plainLanguage || bottleneck.kind === "critical_path_delay" ? bottleneck.plainLanguage : bottleneck.message}
                    </p>
                  ))}
                  {step.citations.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Sources for ${step.title}`}>
                      {step.citations.map((citation) => (
                        <li key={citation.id}>
                          <CodeCitationBadge citation={citation} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="panel">
            <p className="font-medium text-[var(--navy)]">No permit steps yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Generate a roadmap from your project details to see the permits and documents to plan for.</p>
          </div>
        )}
      </section>

      <details className="panel project-details">
        <summary>
          <span className="font-serif text-xl text-[var(--navy)]">Project details</span>
          <span className="mt-1 block text-sm text-[var(--muted)]">Space, zoning, trades and planning estimates</span>
          {project.roadmap.warnings.length > 0 ? <span className="project-details-note-count">{project.roadmap.warnings.length} planning {project.roadmap.warnings.length === 1 ? "note" : "notes"}</span> : null}
        </summary>
        <p className="mt-4 break-words font-semibold text-[var(--navy)]">{project.config.name}</p>
        <dl className="project-facts mt-3">
          <Fact label="Project type" value={displayProjectKind(project.config)} />
          <Fact label="State" value={stateName(project.config.state)} />
          <Fact label="Square footage" value={`${project.config.squareFootage.toLocaleString()} sq ft`} />
          <Fact label="Occupancy" value={OCCUPANCY_LABELS[project.config.occupancy]} />
          <Fact label={plainLanguage ? "People the space is sized for" : "Design occupant load"} value={`${occupantLoad} occupants`} />
          <Fact label="Zoning district" value={ZONE_LABELS[project.config.zone]} />
          <Fact label="Estimated valuation" value={`$${project.config.estimatedValuation.toLocaleString()}`} />
          <Fact label="Trades" value={project.config.trades.length ? project.config.trades.map((trade) => TRADE_LABELS[trade]).join(", ") : "None selected"} />
          <Fact label="Planning range" value={total > 0 ? `${formatShortDate(project.roadmap.steps[0]?.estimatedStartDate ?? "")} – ${formatShortDate([...project.roadmap.steps].sort((a, b) => b.estimatedEndDate.localeCompare(a.estimatedEndDate))[0]?.estimatedEndDate ?? "")}` : "No dates estimated yet"} />
          <Fact label="Steps approved" value={`${approved} of ${total}`} />
        </dl>
        {project.roadmap.warnings.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-[var(--navy)]">Planning notes</p>
            <ul className="mt-2 space-y-2">
              {project.roadmap.warnings.map((warning) => (
                <li key={warning} className="bottleneck-flag">
                  <AlertTriangle size={16} aria-hidden />
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </details>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}

