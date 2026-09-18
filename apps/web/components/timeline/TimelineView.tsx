"use client";

import { useMemo, type RefObject } from "react";
import { StateMarker } from "@/components/common/StateMarker";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StatusSelect } from "@/components/timeline/StatusSelect";
import { differenceInCalendarDays, formatDateRange, formatShortDate, localDay, parseISODate, toISODate } from "@/lib/dates";
import type { DisplayState } from "@/lib/engine/progress";
import type { TimelineForecast } from "@/lib/engine/timeline";
import type { PermitStepStatus, Project } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

function addCalendarDays(iso: string, days: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + days * DAY));
}

/** Evenly spaced, readable ticks: weekly for short spans, then every 2 or 4 weeks, then monthly. */
function buildTicks(start: string, end: string): string[] {
  const span = differenceInCalendarDays(parseISODate(end), parseISODate(start));
  const stepDays = span <= 42 ? 7 : span <= 90 ? 14 : span <= 180 ? 28 : 56;
  const first = parseISODate(start);
  const offset = (8 - first.getUTCDay()) % 7; // next Monday
  const ticks: string[] = [];
  for (let day = offset; day <= span; day += stepDays) ticks.push(addCalendarDays(start, day));
  return ticks;
}

export function TimelineView({
  headingRef,
  project,
  forecast,
  display,
  critical,
  now,
  onOpenStep,
  onStatusChange,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  project: Project;
  forecast: TimelineForecast;
  display: Map<string, DisplayState>;
  critical: Set<string>;
  now: Date;
  onOpenStep: (stepId: string) => void;
  onStatusChange: (stepId: string, status: PermitStepStatus) => void;
}) {
  const steps = project.roadmap.steps;
  const today = localDay(now);
  const target = project.config.targetDate;
  const complete = steps.every((step) => step.status === "approved");

  const axis = useMemo(() => {
    const entries = [...forecast.steps.values()];
    const starts = entries.map((entry) => entry.start);
    const ends = [...entries.map((entry) => entry.latestEnd), today, ...(target ? [target] : [])];
    const min = addCalendarDays(starts.reduce((a, b) => (a < b ? a : b), today), -2);
    const max = addCalendarDays(ends.reduce((a, b) => (a > b ? a : b), today), 2);
    const span = Math.max(1, differenceInCalendarDays(parseISODate(max), parseISODate(min)));
    const pct = (iso: string) => (differenceInCalendarDays(parseISODate(iso), parseISODate(min)) / span) * 100;
    return { min, max, pct, ticks: buildTicks(min, max) };
  }, [forecast, today, target]);

  return (
    <div>
      <SectionHeading
        headingRef={headingRef}
        title={
          complete
            ? `All steps approved, last on ${formatShortDate(forecast.latestFinish, now)}`
            : `Projected finish ${formatDateRange(forecast.earliestFinish, forecast.latestFinish, now)}`
        }
      >
        Solid bars run to the earliest expected decision; the lighter extension is the latest. Dates start from today or
        from your real submission and approval dates. Estimates, not department commitments.
      </SectionHeading>

      <div className="surface px-4 sm:px-5">
        <div className="schedule-head sticky top-[6.4rem] z-10 -mx-4 bg-[var(--surface)] px-4 pt-3 max-md:top-[2.9rem] sm:-mx-5 sm:px-5">
          <div className="label hidden self-end pb-1 md:block">Step</div>
          <div className="schedule-axis" aria-hidden>
            {axis.ticks.map((tick) => (
              <span key={tick} className="schedule-tick" style={{ left: `${axis.pct(tick)}%` }}>
                {formatShortDate(tick, now)}
              </span>
            ))}
          </div>
        </div>
        <ol className="divided">
          {steps.map((step) => {
            const entry = forecast.steps.get(step.id);
            const state = display.get(step.id) ?? "upcoming";
            if (!entry) return null;
            const left = axis.pct(entry.start);
            const solidEnd = axis.pct(entry.actual ? entry.latestEnd : entry.earliestEnd);
            const rangeEnd = axis.pct(entry.latestEnd);
            return (
              <li key={step.id} className="schedule-row">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5">
                    <StateMarker state={state} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button type="button" className="link hit text-left text-[var(--ink)]" onClick={() => onOpenStep(step.id)}>
                      {step.title}
                    </button>
                    <p className="meta num">
                      {entry.actual
                        ? `Approved ${formatShortDate(entry.latestEnd, now)}`
                        : `${step.status === "submitted" || step.status === "in_review" ? "Submitted" : "Starts"} ${formatShortDate(entry.start, now)} · decision ${formatDateRange(entry.earliestEnd, entry.latestEnd, now)}`}
                      {critical.has(step.id) && state !== "completed" ? " · sets finish" : ""}
                    </p>
                    <label className="sr-only" htmlFor={`status-${step.id}`}>
                      Status for {step.title}
                    </label>
                    <StatusSelect id={`status-${step.id}`} step={step} className="input-compact mt-1.5 max-w-[12rem] text-sm" onChange={(status) => onStatusChange(step.id, status)} />
                  </div>
                </div>
                <div className="schedule-track" aria-hidden>
                  {axis.pct(today) >= 0 && axis.pct(today) <= 100 ? <span className="today-line" style={{ left: `${axis.pct(today)}%` }} /> : null}
                  {target ? <span className="today-line !border-dashed !border-[var(--primary)]" style={{ left: `${axis.pct(target)}%` }} /> : null}
                  {!entry.actual && rangeEnd > solidEnd ? (
                    <span className="bar-range" style={{ left: `${solidEnd}%`, width: `${rangeEnd - solidEnd}%` }} />
                  ) : null}
                  <span className={`bar bar-${state === "current" ? "current" : state}`} style={{ left: `${left}%`, width: `${Math.max(0.8, solidEnd - left)}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <ul className="meta mt-3 flex flex-wrap gap-x-5 gap-y-1" aria-hidden>
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0 border-l-2 border-[var(--blocked)]" /> Today
        </li>
        {target ? (
          <li className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-0 border-l-2 border-dashed border-[var(--primary)]" /> Your target date
          </li>
        ) : null}
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-5 rounded-sm bg-[color-mix(in_srgb,var(--primary)_25%,transparent)]" /> Could take until
        </li>
      </ul>
    </div>
  );
}
