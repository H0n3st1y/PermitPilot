import { describe, expect, it } from "vitest";
import { interpolate, LOCALES, translate } from "@/lib/i18n";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import hi from "@/messages/hi.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import ar from "@/messages/ar.json";
import bn from "@/messages/bn.json";
import pt from "@/messages/pt.json";

const catalogs = { en, zh, hi, es, fr, ar, bn, pt };

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

  it.each(LOCALES)("provides every landing message directly in %s without relying on English fallback", (locale) => {
    const expected = Object.keys(en.landing).sort();
    const entries = catalogs[locale].landing;
    expect(Object.keys(entries).sort()).toEqual(expected);
    for (const key of expected) {
      const value = entries[key as keyof typeof entries];
      expect(value.trim().length).toBeGreaterThan(0);
      expect(translate(locale, `landing.${key}`)).toBe(value);
      if (locale !== "en") expect(value).not.toBe(en.landing[key as keyof typeof en.landing]);
    }
  });

  it("keeps the English landing expectations scoped to a demonstration planning tool", () => {
    expect(translate("en", "landing.trustBody")).toContain("fictional Demo Harbor");
    expect(translate("en", "landing.trustBody")).toContain("does not submit applications or grant approvals");
    expect(translate("en", "landing.estimates")).toContain("not a municipal quote or deadline");
    expect(translate("en", "landing.reassurance")).toContain("Nothing is submitted for you");
  });
});
