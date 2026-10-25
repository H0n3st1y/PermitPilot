// milliseconds in one calendar day
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// yyyy-mm-dd from a Date
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// parse yyyy-mm-dd as UTC so the timezone doesn't shift the day
export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  // Date months are 0-based
  return new Date(Date.UTC(year, month - 1, day));
}

// skip sat/sun
export function addBusinessDays(start: Date, days: number): Date {
  const current = new Date(start.getTime());
  let added = 0;
  // walk forward until we've counted enough weekdays
  while (added < days) {
    current.setUTCDate(current.getUTCDate() + 1);
    // sunday is 0 and saturday is 6
    if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) {
      added += 1;
    }
  }
  return current;
}

// whole calendar days from earlier to later, ignoring the clock time
export function differenceInCalendarDays(later: Date, earlier: Date): number {
  const utcLater = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const utcEarlier = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.floor((utcLater - utcEarlier) / MS_PER_DAY);
}

// short month-and-day label, or a dash when the date is blank
export function formatShortDate(isoDate: string): string {
  // nothing to format
  if (!isoDate) return "—";
  const date = parseISODate(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// dollars and cents for the fee tables
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
