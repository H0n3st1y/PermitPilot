import { describe, expect, it } from "vitest";
import { interpolate, translate } from "@/lib/i18n";

describe("translate", () => {
  it("returns English chrome strings", () => {
    expect(translate("en", "dashboard.tabs.graph")).toBe("Graph");
    expect(translate("en", "a11y.plainEnglish")).toBe("Plain English");
  });

  it("returns Spanish chrome strings without changing English fallbacks", () => {
    expect(translate("es", "dashboard.tabs.graph")).toBe("Gráfico");
    expect(translate("es", "graph.ethics")).toContain("permiso");
  });

  it("falls back to English when a key is missing", () => {
    expect(translate("es", "does.not.exist")).toBe("does.not.exist");
  });

  it("interpolates placeholders", () => {
    expect(interpolate("Work on {title} ({department})", { title: "Health", department: "Health" })).toBe(
      "Work on Health (Health)",
    );
    expect(translate("en", "dashboard.nextActionWork", { title: "Health permit", department: "Health" })).toBe(
      "Work on Health permit (Health)",
    );
  });
});
