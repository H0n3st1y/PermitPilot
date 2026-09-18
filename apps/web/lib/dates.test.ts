import { afterEach, describe, expect, it } from "vitest";
import { addBusinessDays, formatShortDate, localDay, parseISODate, toISODate } from "@/lib/dates";

const originalTz = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTz;
});

describe("dates", () => {
  it("dates user actions by the local calendar day, not the UTC day", () => {
    process.env.TZ = "America/Los_Angeles";
    // 7pm Pacific on Sep 17 is already Sep 18 in UTC.
    expect(localDay("2026-09-18T02:00:00Z")).toBe("2026-09-17");
    expect(toISODate(new Date("2026-09-18T02:00:00Z"))).toBe("2026-09-18");
  });

  it("skips weekends in both directions", () => {
    expect(toISODate(addBusinessDays(parseISODate("2026-09-18"), 1))).toBe("2026-09-21"); // Fri -> Mon
    expect(toISODate(addBusinessDays(parseISODate("2026-09-21"), -1))).toBe("2026-09-18"); // Mon -> Fri
  });

  it("keeps short dates on one line and adds the year only when it differs", () => {
    const reference = new Date("2026-06-01T12:00:00Z");
    expect(formatShortDate("2026-08-17", reference)).toBe("Aug\u00a017");
    expect(formatShortDate("2027-01-04", reference)).toBe("Jan\u00a04,\u00a02027");
  });
});
