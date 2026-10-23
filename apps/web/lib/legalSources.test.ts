import { describe, expect, it } from "vitest";
import { loadJurisdictionExcerpts, resolveSourceDir } from "@/lib/legalSources";
import { existsSync } from "fs";

describe("legal sources", () => {
  it("finds the New Hampshire excerpt folder from either app cwd", () => {
    expect(existsSync(resolveSourceDir("NH"))).toBe(true);
  });

  it("loads New Hampshire excerpts for citation matching", () => {
    const text = loadJurisdictionExcerpts("NH");
    expect(text.length).toBeGreaterThan(100);
    expect(text).toMatch(/food|barber|fire|homestead/i);
  });

  it("returns an empty string for a state with no downloaded pack", () => {
    expect(loadJurisdictionExcerpts("ZZ")).toBe("");
  });
});
