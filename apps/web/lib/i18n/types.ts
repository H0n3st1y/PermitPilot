/**
 * Presentation-layer localization types.
 *
 * Nothing in this module may reach the rules engine. Locale and reading level
 * change how a requirement is *worded*, never whether it applies, what it
 * depends on, or which documents it needs. `lib/engine/*` deliberately imports
 * nothing from here, and a test asserts that stays true.
 */

/** The eight most spoken languages worldwide. English is the default UI language. */
export const LOCALES = ["en", "zh", "hi", "es", "fr", "ar", "bn", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_META: Record<Locale, { native: string; english: string; dir: "ltr" | "rtl" }> = {
  en: { native: "English", english: "English", dir: "ltr" },
  zh: { native: "中文", english: "Chinese", dir: "ltr" },
  hi: { native: "हिन्दी", english: "Hindi", dir: "ltr" },
  es: { native: "Español", english: "Spanish", dir: "ltr" },
  fr: { native: "Français", english: "French", dir: "ltr" },
  ar: { native: "العربية", english: "Arabic", dir: "rtl" },
  bn: { native: "বাংলা", english: "Bengali", dir: "ltr" },
  pt: { native: "Português", english: "Portuguese", dir: "ltr" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}

/**
 * One string at two reading levels.
 *
 * `standard` is the wording a municipality would use. `plain` is the same
 * meaning at a lower reading level, and is omitted when the standard wording is
 * already plain (a tab label does not need simplifying). Plain English must
 * never soften or broaden a legal obligation: "you must" does not become
 * "you may want to".
 */
export interface Copy {
  standard: string;
  plain?: string;
}

/** A phrase in English plus any other locales. Missing locales fall back to English. */
export type Phrase = Partial<Record<Locale, Copy>> & { en: Copy };

/** Values interpolated into `{placeholder}` slots. */
export type CopyVars = Record<string, string | number>;

export interface CopyOptions {
  locale: Locale;
  plainLanguage: boolean;
}

/** Resolves one phrase for the active locale and reading level. */
export function resolveCopy(phrase: Phrase, { locale, plainLanguage }: CopyOptions, vars?: CopyVars): string {
  // Fall back to English rather than showing a raw key if a translation is missing.
  const copy = phrase[locale] ?? phrase[DEFAULT_LOCALE];
  const text = plainLanguage ? (copy?.plain ?? copy?.standard ?? "") : (copy?.standard ?? "");
  return vars ? interpolate(text, vars) : text;
}

/** Replaces `{name}` with the matching value; unknown placeholders are left alone. */
export function interpolate(text: string, vars: CopyVars): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
