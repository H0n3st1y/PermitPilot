"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import { StatusBadge } from "@/components/timeline/StatusSelect";
import { stepDocumentProgress } from "@/components/documents/DocumentVault";
import { formatShortDate } from "@/lib/dates";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import { useA11y } from "@/lib/a11y";
import {
  OCCUPANCY_LABELS,
  PROJECT_TYPE_LABELS,
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
    <div className="space-y-4">
      <section className="panel">
        <p className="eyebrow">Project parameters</p>
        <h2 className="font-serif text-2xl text-[var(--navy)]">{project.config.name}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Project type" value={PROJECT_TYPE_LABELS[project.config.projectType]} />
          <Fact label="Square footage" value={`${project.config.squareFootage.toLocaleString()} sq ft`} />
          <Fact label="Occupancy" value={OCCUPANCY_LABELS[project.config.occupancy]} />
          <Fact
            label={plainLanguage ? "People the space is sized for" : "Design occupant load"}
            value={`${occupantLoad} occupants`}
          />
          <Fact label="Zoning district" value={ZONE_LABELS[project.config.zone]} />
          <Fact label="Estimated valuation" value={`$${project.config.estimatedValuation.toLocaleString()}`} />
          <Fact
            label="Trades"
            value={
              project.config.trades.length
                ? project.config.trades.map((trade) => TRADE_LABELS[trade]).join(", ")
                : "None selected"
            }
          />
          <Fact
            label="Planning range"
            value={`${formatShortDate(project.roadmap.steps[0]?.estimatedStartDate ?? "")} – ${formatShortDate(
              [...project.roadmap.steps].sort((a, b) => b.estimatedEndDate.localeCompare(a.estimatedEndDate))[0]
                ?.estimatedEndDate ?? "",
            )}`}
          />
          <Fact label="Steps approved" value={`${approved} of ${total}`} />
        </dl>
        {project.roadmap.warnings.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {project.roadmap.warnings.map((warning) => (
              <li key={warning} className="bottleneck-flag">
                <AlertTriangle size={16} aria-hidden />
                {warning}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {bottlenecks.length > 0 ? (
        <section className="panel panel-warn" aria-live="polite">
          <h2 className="font-serif text-xl text-[var(--navy)]">Bottlenecks</h2>
          <ul className="mt-3 space-y-2">
            {bottlenecks.map((item) => {
              const step = project.roadmap.steps.find((entry) => entry.id === item.stepId);
              return (
                <li key={`${item.stepId}-${item.kind}`} className="text-sm">
                  <strong>{step?.shortTitle}: </strong>
                  {plainLanguage ? item.plainLanguage : item.message}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <ol className="space-y-3">
        {project.roadmap.steps.map((step) => {
          const docs = stepDocumentProgress(project, step);
          const bottleneck = bottlenecks.find((item) => item.stepId === step.id);
          return (
            <li key={step.id} className="panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">
                    Step {step.sequence} · {step.department}
                  </p>
                  <h3 className="font-serif text-xl text-[var(--navy)]">{step.title}</h3>
                </div>
                <StatusBadge status={step.status} />
              </div>
              <p className="mt-2 text-[var(--ink)]">{plainLanguage ? step.plainLanguage : step.whyRequired}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                <Clock size={15} aria-hidden />
                {step.estimatedMinDays}–{step.estimatedMaxDays} business days
                {docs.required > 0 ? (
                  <>
                    <span aria-hidden>·</span>
                    {docs.done ? (
                      <span className="inline-flex items-center gap-1 text-[var(--ok)]">
                        <CheckCircle2 size={15} aria-hidden />
                        Documents complete
                      </span>
                    ) : (
                      <span>
                        {docs.complete}/{docs.required} documents
                      </span>
                    )}
                  </>
                ) : null}
              </p>
              {bottleneck ? (
                <p className="bottleneck-flag mt-3">
                  <AlertTriangle size={16} aria-hidden />
                  {plainLanguage ? bottleneck.plainLanguage : bottleneck.message}
                </p>
              ) : null}
              <ul className="mt-3 flex flex-wrap gap-2">
                {step.citations.map((citation) => (
                  <li key={citation.id}>
                    <CodeCitationBadge citation={citation} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
