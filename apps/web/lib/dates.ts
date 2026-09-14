const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addBusinessDays(start: Date, days: number): Date {
  const current = new Date(start.getTime());
  let added = 0;
  while (added < days) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) {
      added += 1;
    }
  }
  return current;
}

export function differenceInCalendarDays(later: Date, earlier: Date): number {
  const utcLater = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const utcEarlier = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.floor((utcLater - utcEarlier) / MS_PER_DAY);
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return "—";
  const date = parseISODate(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
