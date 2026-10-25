import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";

// dont dump a whole law book into the prompt
const MAX_CHARS = 14_000;

export function resolveSourceDir(state: string): string {
  // next sometimes starts from the repo root and sometimes from apps/web so try both
  const suffix = path.join("legal-sources", "raw", state.toUpperCase());
  const candidates = [
    path.join(process.cwd(), suffix),
    path.join(process.cwd(), "apps", "web", suffix),
  ];
  // first folder that exists, otherwise the repo-root guess
  return candidates.find((dir) => existsSync(dir)) ?? candidates[0];
}

// pull a state's text files, trimmed so they stay small enough to send
export function loadJurisdictionExcerpts(state: string): string {
  const dir = resolveSourceDir(state);
  // no pack for that state, just skip
  if (!existsSync(dir)) return "";
  const files = readdirSync(dir).filter((name) => name.endsWith(".txt")).sort();
  const chunks: string[] = [];
  let used = 0;
  // read text files until we hit the character cap
  for (const file of files) {
    const text = readFileSync(path.join(dir, file), "utf8").trim();
    // skip empty files
    if (!text) continue;
    // last file may only partly fit
    if (used + text.length > MAX_CHARS) {
      chunks.push(text.slice(0, Math.max(0, MAX_CHARS - used)));
      break;
    }
    chunks.push(`--- ${file} ---\n${text}`);
    used += text.length;
  }
  return chunks.join("\n\n");
}
