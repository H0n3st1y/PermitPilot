import { addBusinessDays, parseISODate, toISODate } from "@/lib/dates";
import type { TimelineForecast } from "@/lib/engine/timeline";
import type { InspectionItem, Project } from "@/lib/types";

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function compactDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function nextDay(isoDate: string): string {
  const date = parseISODate(isoDate);
  date.setUTCDate(date.getUTCDate() + 1);
  return toISODate(date);
}

/** RFC 5545: lines longer than 75 octets are folded with a leading space. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

interface CalendarEvent {
  uid: string;
  date: string;
  summary: string;
  description: string;
}

/**
 * All-day reminders for projected start dates, expected decisions, inspection
 * preparation, and the user's target date. Descriptions state that dates are
 * planning estimates.
 */
export function buildProjectCalendar(
  project: Project,
  forecast: TimelineForecast,
  inspections: InspectionItem[],
  now = new Date(),
): string {
  const events: CalendarEvent[] = [];
  const disclaimer = "Planning estimate from PermitPilot demonstration rules, not an official deadline.";

  for (const step of project.roadmap.steps) {
    if (step.status === "approved") continue;
    const entry = forecast.steps.get(step.id);
    if (!entry) continue;
    if (step.status === "not_started" || step.status === "preparing") {
      events.push({
        uid: `${project.id}-${step.id}-start`,
        date: entry.start,
        summary: `Start: ${step.shortTitle} (${step.department})`,
        description: `Begin preparing ${step.title}. ${disclaimer}`,
      });
    }
    events.push({
      uid: `${project.id}-${step.id}-decision`,
      date: entry.latestEnd,
      summary: `Expected decision: ${step.shortTitle}`,
      description: `Latest projected completion for ${step.title} (${step.department}). If you have not heard back, follow up. ${disclaimer}`,
    });
  }

  const openItems = inspections.filter((item) => !item.completed);
  if (openItems.length > 0 && forecast.latestFinish) {
    events.push({
      uid: `${project.id}-inspection-prep`,
      date: toISODate(addBusinessDays(parseISODate(forecast.latestFinish), -5)),
      summary: `Inspection prep: ${openItems.length} checklist item${openItems.length === 1 ? "" : "s"} open`,
      description: openItems.map((item) => `- ${item.title}`).join("\n"),
    });
  }

  if (project.config.targetDate) {
    events.push({
      uid: `${project.id}-target`,
      date: project.config.targetDate,
      summary: `Target date: ${project.config.name}`,
      description: "The opening, event, or move-in date you set in PermitPilot.",
    });
  }

  const stamp = `${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PermitPilot//Permit Roadmap//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`PermitPilot: ${project.config.name}`)}`,
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.uid}@permitpilot`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(event.date))}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}
