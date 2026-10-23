import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import hi from "@/messages/hi.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import ar from "@/messages/ar.json";
import bn from "@/messages/bn.json";
import pt from "@/messages/pt.json";

// eight langs, same set we used before
export const LOCALES = ["en", "zh", "hi", "es", "fr", "ar", "bn", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

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

const catalogs = { en, zh, hi, es, fr, ar, bn, pt } as const;

type MessageTree = { [key: string]: string | MessageTree };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// walk "graph.title" style keys
function lookup(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let node: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined ? `{${key}}` : String(vars[key]),
  );
}

export function translate(
  locale: Locale,
  path: string,
  vars?: Record<string, string | number>,
): string {
  // missing a key? fall back to english
  const primary = lookup(catalogs[locale] as MessageTree, path);
  const fallback = locale === "en" ? undefined : lookup(catalogs.en as MessageTree, path);
  const template = primary ?? fallback ?? path;
  return interpolate(template, vars);
}
