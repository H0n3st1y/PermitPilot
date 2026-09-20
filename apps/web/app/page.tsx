"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { StateMarker } from "@/components/common/StateMarker";
import { AppShell } from "@/components/layout/AppShell";
import type { DisplayState } from "@/lib/engine/progress";
import { isPhraseKey } from "@/lib/i18n/labels";
import type { PhraseKey } from "@/lib/i18n/phrases";
import { useCopy } from "@/lib/i18n/useCopy";
import { deleteFiles } from "@/lib/storage/files";
import { deleteProject, listProjects, loadProject, type ProjectSummary } from "@/lib/storage/projects";

/** A static excerpt of the sample project's roadmap, used as a product preview. */
const PREVIEW: { stage: number; steps: { title: PhraseKey; detail: PhraseKey; state: DisplayState }[] }[] = [
  { stage: 1, steps: [{ title: "home.preview.zoning", detail: "home.preview.approved", state: "completed" }] },
  {
    stage: 2,
    steps: [
      { title: "home.preview.fire", detail: "home.preview.approved", state: "completed" },
      { title: "home.preview.health", detail: "home.preview.healthDetail", state: "attention" },
      { title: "home.preview.electrical", detail: "home.preview.electricalDetail", state: "attention" },
    ],
  },
  { stage: 3, steps: [{ title: "home.preview.business", detail: "home.preview.blocked", state: "blocked" }] },
];

const ANSWERS: { title: PhraseKey; body: PhraseKey }[] = [
  { title: "home.answer.need.title", body: "home.answer.need.body" },
  { title: "home.answer.cost.title", body: "home.answer.cost.body" },
  { title: "home.answer.source.title", body: "home.answer.source.body" },
];

export default function HomePage() {
  const { t } = useCopy();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setProjects(listProjects());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "home.readError");
      setProjects([]);
    }
  }, []);

  async function remove(summary: ProjectSummary) {
    if (!window.confirm(t("home.deleteConfirm", { name: summary.name }))) return;
    try {
      const result = loadProject(summary.id);
      deleteProject(summary.id);
      setProjects(listProjects());
      if (result.status === "ok") await deleteFiles(result.project.documents.map((doc) => doc.id));
    } catch (cause) {
      console.error("PermitPilot: delete failed", cause);
      setError(cause instanceof Error ? cause.message : "home.deleteError");
    }
  }

  const hasProjects = Boolean(projects && projects.length);

  return (
    <AppShell>
      <main id="main">
        <section className="border-b border-[var(--line)]">
          <div className="container grid gap-10 py-8 md:py-16 lg:grid-cols-[1fr_27rem] lg:items-start lg:gap-16">
            <div className="max-w-xl">
              <h1 className="display">{t("home.headline")}</h1>
              <p className="mt-4 text-[var(--ink-2)] md:text-lg">{t("home.lede")}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className="btn btn-primary btn-lg" href="/intake">
                  {t("home.startProject")} <ArrowRight size={17} aria-hidden />
                </Link>
                <Link className="btn btn-secondary btn-lg" href="/demo">
                  {t("nav.sampleProject")}
                </Link>
              </div>
              <p className="meta mt-4">{t("home.noAccount")}</p>
            </div>

            {projects === null ? (
              <div className="skeleton h-72" aria-hidden />
            ) : hasProjects ? (
              <section aria-labelledby="projects-heading" className="fade-in">
                <h2 id="projects-heading" className="h3">
                  {t("home.continueHeading")}
                </h2>
                <ul className="divided surface stagger mt-2">
                  {projects!.map((project) => (
                    <li key={project.id} className="flex items-center gap-2 pl-4 pr-1">
                      <Link className="min-w-0 flex-1 py-3 no-underline" href={`/projects/${encodeURIComponent(project.id)}`}>
                        <span className="block truncate font-semibold text-[var(--ink)]">{project.name}</span>
                        <span className="meta num block">
                          {t("home.projectMeta", {
                            approved: project.approved,
                            total: project.total,
                            date: new Date(project.updatedAt).toLocaleDateString(),
                          })}
                        </span>
                      </Link>
                      <button
                        type="button"
                        className="icon-btn hover:text-[var(--blocked)]"
                        onClick={() => void remove(project)}
                        aria-label={t("common.delete", { name: project.name })}
                      >
                        <Trash2 size={17} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <figure className="surface fade-in overflow-hidden" aria-label={t("home.sampleCaption")}>
                <figcaption className="flex items-baseline justify-between border-b border-[var(--line)] px-4 py-3">
                  <span className="font-semibold">{t("home.sampleName")}</span>
                  <span className="meta">{t("home.sampleRoadmap")}</span>
                </figcaption>
                <ol className="divided stagger">
                  {PREVIEW.map((group) => (
                    <li key={group.stage} className="px-4 py-3">
                      <p className="label mb-2">{t("home.preview.stage", { n: group.stage })}</p>
                      <ul className="space-y-2.5">
                        {group.steps.map((step) => (
                          <li key={step.title} className="flex items-start gap-2.5">
                            <span className="mt-0.5">
                              <StateMarker state={step.state} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-snug">{t(step.title)}</span>
                              <span className={`block text-sm state-text-${step.state}`}>{t(step.detail)}</span>
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
              {isPhraseKey(error) ? t(error) : error}
            </p>
          </div>
        ) : null}

        <section className="container py-12" aria-labelledby="answers-heading">
          <h2 id="answers-heading" className="h2">
            {t("home.answersHeading")}
          </h2>
          <div className="reveal mt-6 grid gap-8 md:grid-cols-3">
            {ANSWERS.map((item) => (
              <div key={item.title} className="border-t-2 border-[var(--ink)] pt-3">
                <h3 className="h3">{t(item.title)}</h3>
                <p className="mt-1 text-[var(--ink-2)]">{t(item.body)}</p>
              </div>
            ))}
          </div>
          <div className="callout callout-neutral reveal mt-10 max-w-3xl">
            <p className="font-semibold">{t("home.wontDo.title")}</p>
            <p className="mt-1 text-[var(--ink-2)]">
              {t("home.wontDo.body")}{" "}
              <Link href="/about">{t("nav.howItWorks")}</Link>
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
