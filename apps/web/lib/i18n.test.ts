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

  it("covers the 8 language catalogs", () => {
    expect(translate("pt", "home.title")).toContain("licença");
    expect(translate("fr", "nav.signIn")).toBe("Connexion");
    expect(translate("zh", "dashboard.tabs.graph")).toBe("关系图");
    expect(translate("hi", "a11y.language")).toBe("भाषा");
    expect(translate("bn", "nav.newProject")).toBe("নতুন প্রকল্প");
    expect(translate("ar", "nav.signIn")).toBe("تسجيل الدخول");
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
