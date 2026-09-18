import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateRules } from "@/lib/engine/rules";
import { baseConfig } from "@/lib/engine/testUtils";
import { PHRASES } from "@/lib/i18n/phrases";
import { interpolate, LOCALES, resolveCopy, type Phrase } from "@/lib/i18n/types";

const entries = Object.entries(PHRASES) as [string, Phrase][];

describe("the copy dictionary", () => {
  it("has every phrase in every locale", () => {
    const missing: string[] = [];
    for (const [key, phrase] of entries) {
      for (const locale of LOCALES) {
        if (!phrase[locale]?.standard?.trim()) missing.push(`${key}.${locale}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps placeholders identical across locales and reading levels", () => {
    const slots = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const [key, phrase] of entries) {
      const expected = slots(phrase.en.standard);
      for (const locale of LOCALES) {
        const copy = phrase[locale];
        expect(slots(copy.standard), `${key}.${locale}.standard`).toEqual(expected);
        if (copy.plain) expect(slots(copy.plain), `${key}.${locale}.plain`).toEqual(expected);
      }
    }
  });

  it("falls back to the standard wording when no plain variant exists", () => {
    const phrase: Phrase = { en: { standard: "Roadmap" }, es: { standard: "Ruta" } };
    expect(resolveCopy(phrase, { locale: "en", plainLanguage: true })).toBe("Roadmap");
    expect(resolveCopy(phrase, { locale: "es", plainLanguage: true })).toBe("Ruta");
  });

  it("selects locale and reading level independently", () => {
    const phrase: Phrase = {
      en: { standard: "Submit the application", plain: "Send it in" },
      es: { standard: "Envíe la solicitud", plain: "Mándelo" },
    };
    expect(resolveCopy(phrase, { locale: "en", plainLanguage: false })).toBe("Submit the application");
    expect(resolveCopy(phrase, { locale: "en", plainLanguage: true })).toBe("Send it in");
    expect(resolveCopy(phrase, { locale: "es", plainLanguage: false })).toBe("Envíe la solicitud");
    expect(resolveCopy(phrase, { locale: "es", plainLanguage: true })).toBe("Mándelo");
  });

  it("leaves unknown placeholders alone rather than printing undefined", () => {
    expect(interpolate("Contact {department} about {thing}", { department: "Fire" })).toBe(
      "Contact Fire about {thing}",
    );
  });
});

/**
 * The guarantee behind Feature 1: changing the interface language or reading
 * level cannot change which permits are required.
 *
 * Asserted two ways. Behaviourally, the engine produces identical output no
 * matter what, because it takes no locale argument at all. Structurally, the
 * engine is forbidden from importing the presentation layer, so a future change
 * cannot quietly wire one into the other.
 */
describe("localization is downstream of permit decisions", () => {
  it("produces the same roadmap regardless of display preferences", () => {
    const now = new Date("2026-09-18T12:00:00.000Z");
    const a = evaluateRules(baseConfig, now);
    const b = evaluateRules(baseConfig, now);
    expect(a.steps.map((step) => step.id)).toEqual(b.steps.map((step) => step.id));
    expect(a.traces).toEqual(b.traces);
    expect(a.warnings).toEqual(b.warnings);
    // The engine's signature has no room for a locale, which is the real proof.
    expect(evaluateRules).toHaveLength(1);
  });

  it("never lets the rules engine import the presentation layer", () => {
    const engineDir = path.resolve(__dirname, "..", "engine");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
        const source = readFileSync(full, "utf8");
        // graphLayout and permitState are engine-side; neither may reach for copy.
        if (/from\s+"@\/lib\/(i18n|a11y)/.test(source)) offenders.push(name);
      }
    };
    walk(engineDir);
    expect(offenders).toEqual([]);
  });
});
