"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { StateMarker } from "@/components/common/StateMarker";
import { AppShell } from "@/components/layout/AppShell";
import type { DisplayState } from "@/lib/engine/progress";
import { deleteFiles } from "@/lib/storage/files";
import { deleteProject, listProjects, loadProject, type ProjectSummary } from "@/lib/storage/projects";

/** A static excerpt of the sample project's roadmap, used as a product preview. */
const PREVIEW: { stage: string; steps: { title: string; detail: string; state: DisplayState }[] }[] = [
  { stage: "Stage 1", steps: [{ title: "Zoning compatibility review", detail: "Approved", state: "completed" }] },
  {
    stage: "Stage 2",
    steps: [
      { title: "Fire-prevention review", detail: "Approved", state: "completed" },
      { title: "Food establishment health permit", detail: "Review overdue: follow up", state: "attention" },
      { title: "Electrical permit", detail: "1 document missing", state: "attention" },
    ],
  },
  { stage: "Stage 3", steps: [{ title: "Local business registration", detail: "Blocked by Health permit", state: "blocked" }] },
];

const ANSWERS = [
  {
    title: "What you need",
    body: "Permits, reviews, and documents chosen by fixed rules from your project's type, size, use, location, and trades. Each one says which rule selected it.",
  },
  {
    title: "What it costs and how long",
    body: "Itemized fees marked calculated, estimated, or unknown, and a timeline that re-forecasts from your real submission and approval dates.",
  },
  {
    title: "Where it's written",
    body: "Links to the official model-code sections behind each requirement. Anything we couldn't verify is labelled; nothing is invented.",
  },
];

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setProjects(listProjects());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Saved projects couldn't be read.");
      setProjects([]);
    }
  }, []);

  async function remove(summary: ProjectSummary) {
    if (!window.confirm(`Delete "${summary.name}" and its uploaded files from this browser? This can't be undone.`)) return;
    try {
      const result = loadProject(summary.id);
      deleteProject(summary.id);
      setProjects(listProjects());
      if (result.status === "ok") await deleteFiles(result.project.documents.map((doc) => doc.id));
    } catch (cause) {
      console.error("PermitPilot: delete failed", cause);
      setError(cause instanceof Error ? cause.message : "The project couldn't be deleted.");
    }
  }

  const hasProjects = Boolean(projects && projects.length);

  return (
    <AppShell>
      <main id="main">
        <section className="border-b border-[var(--line)]">
          <div className="container grid gap-10 py-8 md:py-16 lg:grid-cols-[1fr_27rem] lg:items-start lg:gap-16">
            <div className="max-w-xl">
              <h1 className="display">Every permit, document, and deadline, in order.</h1>
              <p className="mt-4 text-[var(--ink-2)] md:text-lg">
                Describe your project in a few questions. PermitPilot lays out what the city will ask for, what to do first,
                what it may cost, how long it may take, and where each rule is written.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className="btn btn-primary btn-lg" href="/intake">
                  Start a project <ArrowRight size={17} aria-hidden />
                </Link>
                <Link className="btn btn-secondary btn-lg" href="/demo">
                  Explore a sample
                </Link>
              </div>
              <p className="meta mt-4">No account needed. Your projects and files stay in this browser.</p>
            </div>

            {projects === null ? (
              <div className="skeleton h-72" aria-hidden />
            ) : hasProjects ? (
              <section aria-labelledby="projects-heading" className="fade-in">
                <h2 id="projects-heading" className="h3">
                  Continue where you left off
                </h2>
                <ul className="divided surface mt-2">
                  {projects!.map((project) => (
                    <li key={project.id} className="flex items-center gap-2 pl-4 pr-1">
                      <Link className="min-w-0 flex-1 py-3 no-underline" href={`/projects/${encodeURIComponent(project.id)}`}>
                        <span className="block truncate font-semibold text-[var(--ink)]">{project.name}</span>
                        <span className="meta num block">
                          {project.approved} of {project.total} approved · updated {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </Link>
                      <button type="button" className="icon-btn hover:text-[var(--blocked)]" onClick={() => void remove(project)} aria-label={`Delete ${project.name}`}>
                        <Trash2 size={17} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <figure className="surface fade-in overflow-hidden" aria-label="Example roadmap from the Harbor Kitchen sample project">
                <figcaption className="flex items-baseline justify-between border-b border-[var(--line)] px-4 py-3">
                  <span className="font-semibold">Harbor Kitchen</span>
                  <span className="meta">Sample roadmap</span>
                </figcaption>
                <ol className="divided">
                  {PREVIEW.map((group) => (
                    <li key={group.stage} className="px-4 py-3">
                      <p className="label mb-2">{group.stage}</p>
                      <ul className="space-y-2.5">
                        {group.steps.map((step) => (
                          <li key={step.title} className="flex items-start gap-2.5">
                            <span className="mt-0.5">
                              <StateMarker state={step.state} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-snug">{step.title}</span>
                              <span className={`block text-sm state-text-${step.state}`}>{step.detail}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </figure>
            )}
          </div>
        </section>

        {error ? (
          <div className="container mt-6">
            <p className="callout callout-blocked" role="alert">
              {error}
            </p>
          </div>
        ) : null}

        <section className="container py-12" aria-labelledby="answers-heading">
          <h2 id="answers-heading" className="h2">
            The answers you need before you apply
          </h2>
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            {ANSWERS.map((item) => (
              <div key={item.title} className="border-t-2 border-[var(--ink)] pt-3">
                <h3 className="h3">{item.title}</h3>
                <p className="mt-1 text-[var(--ink-2)]">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="callout callout-neutral mt-10 max-w-3xl">
            <p className="font-semibold">What PermitPilot won&apos;t do</p>
            <p className="mt-1 text-[var(--ink-2)]">
              It won&apos;t give legal advice, submit applications, or guess at fees and rules it can&apos;t source. Every
              requirement comes from deterministic rules, not AI. Confirm with your municipality before you rely on it.{" "}
              <Link href="/about">How it works</Link>
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
