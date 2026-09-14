"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Contrast,
  FileStack,
  GitCommitHorizontal,
  Landmark,
  Receipt,
  Scale,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getLastProjectId, getProject } from "@/lib/store";

const FEATURES = [
  {
    icon: Landmark,
    title: "Personalized roadmap",
    body: "A deterministic rules engine turns project type, size, occupancy, and location into required permits, documents, and department steps.",
  },
  {
    icon: GitCommitHorizontal,
    title: "Interactive timeline",
    body: "See planning ranges, update Not Started / Submitted / In Review / Approved, and flag reviews that stall or block later work.",
  },
  {
    icon: Scale,
    title: "Code citation badges",
    body: "Every step carries model-code references such as IBC § 1004.1, with plain-language explanations and outbound official text.",
  },
  {
    icon: FileStack,
    title: "Document vault",
    body: "Upload floor plans, menus, IDs, and trade scopes beside each permit step, with verification checkmarks for required files.",
  },
  {
    icon: Receipt,
    title: "Fee calculator",
    body: "Itemized base fees and departmental surcharges driven by valuation, square footage, occupancy, and selected trades.",
  },
  {
    icon: ClipboardCheck,
    title: "Inspection checklists",
    body: "Building, Fire, and Health readiness lists with passing criteria so you can prepare before an inspector arrives.",
  },
  {
    icon: Contrast,
    title: "Accessibility mode",
    body: "High-contrast theme, Plain English summaries, keyboard-first controls, and a thumb-friendly layout on small screens.",
  },
];

export default function HomePage() {
  const [resumeHref, setResumeHref] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);

  useEffect(() => {
    const id = getLastProjectId();
    if (!id) return;
    const project = getProject(id);
    if (!project) return;
    setResumeHref(`/projects/${id}`);
    setResumeName(project.config.name);
  }, []);

  return (
    <AppShell>
      <main id="main">
        <section className="border-b border-[var(--line)] bg-[var(--card)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-16">
            <div>
              <p className="eyebrow">Municipal permit operations · Demo Harbor, MA</p>
              <h1 className="mt-3 font-serif text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
                Know the path. Track the progress.
              </h1>
              <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
                PermitPilot turns configured municipal rules into one roadmap: required permits, sequential department
                steps, citations, fees, and inspection prep. This is a demonstration, not a legal determination.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="button primary" href="/intake">
                  Start a project
                </Link>
                <Link className="button secondary" href="/demo">
                  Open Harbor Kitchen demo
                </Link>
                <Link className="button secondary" href="/about">
                  How it works
                </Link>
              </div>
              {resumeHref ? (
                <p className="mt-4 text-sm">
                  Resume{" "}
                  <Link className="font-semibold text-[var(--navy)] underline" href={resumeHref}>
                    {resumeName}
                  </Link>
                </p>
              ) : null}
            </div>
            <aside className="panel" aria-label="Sample roadmap preview">
              <p className="eyebrow">Sample sequence</p>
              <ol className="mt-4 space-y-3">
                {[
                  ["Zoning review", "Approved", "DHZO § 4.2"],
                  ["Health permit", "In Review", "Food Code § 8-301.11"],
                  ["Fire review", "Not Started", "IFC § 105.5"],
                  ["Business license", "Not Started", "DHMC § 12-18"],
                ].map(([title, status, code]) => (
                  <li key={title} className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0">
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="font-mono text-xs text-[var(--muted)]">{code}</p>
                    </div>
                    <span className={`status-pill status-${status === "Approved" ? "approved" : status === "In Review" ? "in_review" : "not_started"}`}>
                      {status}
                    </span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-serif text-3xl text-[var(--navy)]">Core MVP</h2>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Rules are evaluated in a fixed order. The same inputs always produce the same permits, documents, fees, and
            department sequence.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="panel">
                  <Icon className="text-[var(--seal)]" size={22} aria-hidden />
                  <h3 className="mt-3 font-serif text-xl text-[var(--navy)]">{feature.title}</h3>
                  <p className="mt-2 text-[var(--muted)]">{feature.body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
