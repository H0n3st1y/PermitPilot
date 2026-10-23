"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useA11y } from "@/lib/a11y";

export default function AboutPage() {
  // methodology page so we dont pretend this is real law
  const { t } = useA11y();

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-3xl px-4 py-12">
        <p className="eyebrow">Methodology and limitations</p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--navy)]">Clear boundaries build trust.</h1>
        <div className="mt-8 space-y-6 text-[var(--ink)]">
          <section>
            <h2 className="font-serif text-2xl text-[var(--navy)]">Deterministic selection</h2>
            <p className="mt-2 text-[var(--muted)]">
              Permit requirements are selected by versioned rules, never by a language model. The evaluation trace
              records the matching rule, fields, and reason. The same project parameters always produce the same roadmap.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-2xl text-[var(--navy)]">Planning ranges</h2>
            <p className="mt-2 text-[var(--muted)]">
              Timeline dates are configurable business-day ranges. They are not guarantees or live municipal data.
              Dependent steps cannot begin before their prerequisites finish.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-2xl text-[var(--navy)]">Citations</h2>
            <p className="mt-2 text-[var(--muted)]">
              Code badges such as IBC § 1004.1 are demonstration references to published model codes or fictional Demo
              Harbor sections. They are not an official determination of what Demo Harbor or any other municipality
              requires.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-2xl text-[var(--navy)]">Fees and files</h2>
            <p className="mt-2 text-[var(--muted)]">
              Fee totals are estimates from demonstration rates. Uploaded files stay in this browser session and are
              limited to PDF, PNG, JPEG, and WebP files of 10 MB or less.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-2xl text-[var(--navy)]">State sources and citations</h2>
            <p className="mt-2 text-[var(--muted)]">
              Permit steps are chosen by versioned rules. Optional citation matching can read downloaded New Hampshire
              (and other) source excerpts through a language-model API. That API cannot add a permit to the map. Sources
              live in the legal-sources folder and are demonstration pointers, not official determinations.
            </p>
          </section>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="button primary" href="/demo">
            {t("common.openDemo")}
          </Link>
          <Link className="button secondary" href="/intake">
            {t("common.startNew")}
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
