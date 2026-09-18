import type { PhraseKey } from "@/lib/i18n/phrases";

/** Primary navigation. Labels resolve through the copy dictionary at render time. */
export const NAV: { href: string; key: PhraseKey }[] = [
  { href: "/intake", key: "nav.newProject" },
  { href: "/demo", key: "nav.sampleProject" },
  { href: "/about", key: "nav.howItWorks" },
];
