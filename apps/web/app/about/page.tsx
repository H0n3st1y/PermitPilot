"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import type { PhraseKey } from "@/lib/i18n/phrases";
import { useCopy } from "@/lib/i18n/useCopy";

const SECTIONS: { title: PhraseKey; body: PhraseKey }[] = [
  { title: "about.rules.title", body: "about.rules.body" },
  { title: "about.demo.title", body: "about.demo.body" },
  { title: "about.transfer.title", body: "about.transfer.body" },
  { title: "about.sources.title", body: "about.sources.body" },
  { title: "about.timelines.title", body: "about.timelines.body" },
  { title: "about.fees.title", body: "about.fees.body" },
  { title: "about.data.title", body: "about.data.body" },
];

export default function AboutPage() {
  const { t } = useCopy();
  return (
    <AppShell>
      <main id="main" className="container-narrow pb-16 pt-10">
        <p className="meta">{t("about.eyebrow")}</p>
        <h1 className="page-title mt-1">{t("about.title")}</h1>
        <div className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {SECTIONS.map((section) => (
            <section key={section.title} className="reveal py-5">
              <h2 className="h3">{t(section.title)}</h2>
              <p className="mt-1 text-[var(--ink-2)]">{t(section.body)}</p>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn-primary" href="/intake">
            {t("home.startProject")}
          </Link>
          <Link className="btn btn-secondary" href="/demo">
            {t("nav.sampleProject")}
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
