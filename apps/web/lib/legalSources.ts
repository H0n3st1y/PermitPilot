import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";

const MAX_CHARS = 14_000;

export function resolveSourceDir(state: string): string {
  const suffix = path.join("legal-sources", "raw", state.toUpperCase());
  const candidates = [
    path.join(process.cwd(), suffix),
    path.join(process.cwd(), "apps", "web", suffix),
  ];
  return candidates.find((dir) => existsSync(dir)) ?? candidates[0];
}

export function loadJurisdictionExcerpts(state: string): string {
  const dir = resolveSourceDir(state);
  if (!existsSync(dir)) return "";
  const files = readdirSync(dir).filter((name) => name.endsWith(".txt")).sort();
  const chunks: string[] = [];
  let used = 0;
  for (const file of files) {
    const text = readFileSync(path.join(dir, file), "utf8").trim();
    if (!text) continue;
    if (used + text.length > MAX_CHARS) {
      chunks.push(text.slice(0, Math.max(0, MAX_CHARS - used)));
      break;
    }
    chunks.push(`--- ${file} ---\n${text}`);
    used += text.length;
  }
  return chunks.join("\n\n");
}
