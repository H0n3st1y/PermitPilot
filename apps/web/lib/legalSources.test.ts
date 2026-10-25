import { describe, expect, it } from "vitest";
import { loadJurisdictionExcerpts, resolveSourceDir } from "@/lib/legalSources";
import { existsSync } from "fs";

// finding and loading the raw text packs
describe("legal sources", () => {
  // the NH folder should resolve from this app
  it("finds the New Hampshire excerpt folder from either app cwd", () => {
    expect(existsSync(resolveSourceDir("NH"))).toBe(true);
  });

  // the pack has real excerpt text, not an empty file
  it("loads New Hampshire excerpts for citation matching", () => {
    const text = loadJurisdictionExcerpts("NH");
    expect(text.length).toBeGreaterThan(100);
    expect(text).toMatch(/food|barber|fire|homestead/i);
  });

  // a state we never downloaded comes back blank
  it("returns an empty string for a state with no downloaded pack", () => {
    expect(loadJurisdictionExcerpts("ZZ")).toBe("");
  });
});
