const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The calendar day a moment falls on in the user's own time zone (YYYY-MM-DD).
 * Use for "today" and for dating user actions; toISODate would give the UTC day,
 * which is already tomorrow on a US evening.
 */
export function localDay(moment: Date | string): string {
  const date = typeof moment === "string" ? new Date(moment) : moment;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Moves forward (or backward, for negative values) by weekdays. */
export function addBusinessDays(start: Date, days: number): Date {
  const current = new Date(start.getTime());
  const direction = days < 0 ? -1 : 1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + direction);
    if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) remaining -= 1;
  }
  return current;
}

export function differenceInCalendarDays(later: Date, earlier: Date): number {
  const utcLater = Date.UTC(later.getUTCFullYear(), later.getUTCMonth(), later.getUTCDate());
  const utcEarlier = Date.UTC(earlier.getUTCFullYear(), earlier.getUTCMonth(), earlier.getUTCDate());
  return Math.floor((utcLater - utcEarlier) / MS_PER_DAY);
}

export function formatShortDate(isoDate: string, reference = new Date()): string {
  if (!isoDate) return "—";
  const date = parseISODate(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getUTCFullYear() === reference.getUTCFullYear() ? undefined : "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .replace(/ /g, " "); // keep "Aug 17" together when text wraps
}

export function formatLongDate(isoDate: string): string {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseISODate(isoDate));
}

export function formatDateRange(start: string, end: string, reference = new Date()): string {
  if (start === end) return formatShortDate(start, reference);
  return `${formatShortDate(start, reference)} – ${formatShortDate(end, reference)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
