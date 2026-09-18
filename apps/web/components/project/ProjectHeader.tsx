"use client";

import Link from "next/link";
import { CalendarArrowDown, Pencil } from "lucide-react";
import { formatDateRange, formatLongDate } from "@/lib/dates";
import type { ProjectProgress } from "@/lib/engine/progress";
import type { TimelineForecast } from "@/lib/engine/timeline";
import { buildProjectCalendar, downloadBlob, slugify } from "@/lib/ics";
import { useCopy } from "@/lib/i18n/useCopy";
import { SAMPLE_PROJECT_ID } from "@/lib/sample";
import { PROJECT_TYPE_LABELS, ZONE_LABELS, type InspectionItem, type Project } from "@/lib/types";

/** Compact project identity and overall progress. The next action lives in the roadmap view. */
export function ProjectHeader({
  project,
  forecast,
  inspections,
  progress,
  now,
}: {
  project: Project;
  forecast: TimelineForecast;
  inspections: InspectionItem[];
  progress: ProjectProgress;
  now: Date;
}) {
  const { t } = useCopy();
  const target = project.config.targetDate;
  const lateForTarget = Boolean(target && !progress.complete && forecast.latestFinish > target);

  function exportCalendar() {
    const ics = buildProjectCalendar(project, forecast, inspections, now);
    downloadBlob(`${slugify(project.config.name)}-permits.ics`, new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  }

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="meta">
          {project.id === SAMPLE_PROJECT_ID ? `${t("header.sampleProject")} · ` : ""}
          {PROJECT_TYPE_LABELS[project.config.projectType]} · {t("header.squareFeet", { value: project.config.squareFootage.toLocaleString() })} ·{" "}
          {ZONE_LABELS[project.config.zone]}
        </p>
        <h1 className="page-title mt-1 break-words">{project.config.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="progress w-28"
              role="progressbar"
              aria-label={t("header.stepsApproved")}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.approved}
              aria-valuetext={`${progress.approved} of ${progress.total} steps approved`}
            >
              <span style={{ transform: `scaleX(${progress.total ? progress.approved / progress.total : 0})` }} />
            </div>
            <span className="num font-semibold">
              {t("header.approvedCount", { approved: progress.approved, total: progress.total })}
            </span>
          </div>
          <span className="num text-[var(--ink-2)]">
            {progress.complete
              ? t("header.allComplete")
              : t("header.projectedFinish", {
                  range: formatDateRange(forecast.earliestFinish, forecast.latestFinish, now),
                })}
          </span>
          {target ? (
            <span className={lateForTarget ? "font-semibold text-[var(--attention)]" : "text-[var(--muted)]"}>
              {t("header.target", { date: formatLongDate(target) })}
              {lateForTarget ? t("header.atRisk") : ""}
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Link className="btn btn-secondary btn-sm" href={`/intake?edit=${encodeURIComponent(project.id)}`}>
          <Pencil size={14} aria-hidden /> {t("header.editDetails")}
        </Link>
        <button type="button" className="btn btn-secondary btn-sm" onClick={exportCalendar}>
          <CalendarArrowDown size={14} aria-hidden /> {t("header.addToCalendar")}
        </button>
      </div>
    </header>
  );
}
