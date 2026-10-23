import en from "@/messages/en.json";
import es from "@/messages/es.json";

export type Locale = "en" | "es";

const catalogs = { en, es } as const;

type MessageTree = { [key: string]: string | MessageTree };

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
  const primary = lookup(catalogs[locale] as MessageTree, path);
  const fallback = locale === "en" ? undefined : lookup(catalogs.en as MessageTree, path);
  const template = primary ?? fallback ?? path;
  return interpolate(template, vars);
}
