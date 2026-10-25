"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, CalendarRange, Check, FileCheck2, Route } from "lucide-react";
import { PermitPilotLogo } from "@/components/brand/PermitPilotLogo";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/timeline/StatusSelect";
import { useA11y } from "@/lib/a11y";
import { getDashboardSummary } from "@/lib/dashboardSummary";
import { detectBottlenecks } from "@/lib/engine/bottlenecks";
import { DB_SYNC_EVENT, listLocalProjectsForCurrentUser, listUserProjects, sampleProject } from "@/lib/store";
import { useAuth } from "@/lib/supabase";
import type { Project } from "@/lib/types";

// Use the real demonstration rules and a stable sample date for this preview.
const sampleDate = new Date("2026-10-24T12:00:00Z");
const example = sampleProject(sampleDate, "landing-preview");
const exampleSummary = getDashboardSummary(example, detectBottlenecks(example.roadmap.steps, sampleDate));
const BENEFITS = [
  { id: 1, icon: Route, href: "/demo?tab=overview" },
  { id: 2, icon: FileCheck2, href: "/demo?tab=documents" },
  { id: 3, icon: CalendarRange, href: "/demo?tab=fees" },
] as const;

// landing page: sample preview, saved projects, and the how-it-works bits
export default function HomePage() {
  const { user } = useAuth();
  const { t, locale } = useA11y();
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // show local projects first, then merge anything newer from the cloud
  useEffect(() => {
    // drop late results if the user changed or we unmounted
    let active = true;
    setProjects(listLocalProjectsForCurrentUser());
    setRefreshing(true);
    setLoadError(false);
    void listUserProjects().then((saved) => {
      if (!active) return;
      const merged = new Map(saved.map((project) => [project.id, project]));
      // local copy wins when it is newer than the remote one
      for (const project of listLocalProjectsForCurrentUser()) {
        const remote = merged.get(project.id);
        if (!remote || remote.updatedAt <= project.updatedAt) merged.set(project.id, project);
      }
      setProjects([...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setRefreshing(false); });
    // a save elsewhere in the tab should refresh this list
    const onSync = () => setProjects(listLocalProjectsForCurrentUser());
    window.addEventListener(DB_SYNC_EVENT, onSync);
    return () => { active = false; window.removeEventListener(DB_SYNC_EVENT, onSync); };
  }, [user?.id, attempt]);

  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "USD" });

  return (
    <AppShell variant="landing">
      <main id="main" className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <p className="landing-kicker"><span aria-hidden />{t("landing.eyebrow")}</p>
          <h1 id="landing-title">{t("landing.title")}</h1>
          <p className="landing-lede">{t("landing.lede")}</p>
          <div className="landing-actions">
            <Link className="button primary" href="/intake">{t("landing.start")}<ArrowRight size={18} aria-hidden /></Link>
            <Link className="button secondary" href="/demo?tab=overview">{t("landing.sample")}</Link>
          </div>
          <p className="landing-reassurance">{t("landing.reassurance")}</p>
          {/* jump link only shows up once they already have projects */}
          {projects.length > 0 ? <a className="landing-continue" href="#your-projects">{t("landing.continue")}<ArrowDown size={16} aria-hidden /></a> : null}
        </section>

        <section className="landing-product" aria-labelledby="preview-heading">
          <div className="landing-section-intro"><p className="eyebrow">{t("landing.previewLabel")}</p><h2 id="preview-heading">{t("landing.previewTitle")}</h2></div>
          <article className="landing-preview" aria-label={t("landing.sampleLabel")}>
            <div className="preview-toolbar"><PermitPilotLogo size={26} /><span className="preview-sample">{t("landing.sampleLabel")}</span></div>
            <div className="preview-body">
              <div className="preview-main">
                <p className="eyebrow">{t("landing.recorded")}</p><h3>{example.config.name}</h3>
                <div className="preview-progress"><span><strong dir="ltr">{exampleSummary.approved} / {exampleSummary.total}</strong> {t("landing.approved")}</span><div aria-hidden><span style={{ width: `${exampleSummary.approved / exampleSummary.total * 100}%` }} /></div></div>
                {/* first three sample steps, check mark if that one is already approved */}
                <ol className="preview-steps">{example.roadmap.steps.slice(0, 3).map((step, index) => <li key={step.id}><span className={`preview-step-number ${step.status === "approved" ? "is-complete" : ""}`} aria-hidden>{step.status === "approved" ? <Check size={15} /> : index + 1}</span><span>{step.shortTitle}</span><StatusBadge status={step.status} /></li>)}</ol>
              </div>
              <div className="preview-support">
                <div className="preview-next"><p className="eyebrow">{t("landing.next")}</p><h3>{exampleSummary.recommendedStep?.shortTitle}</h3>{exampleSummary.recommendedStep ? <StatusBadge status={exampleSummary.recommendedStep.status} /> : null}<Link href="/demo?tab=timeline" className="preview-step-link">{t("landing.review")}<ArrowRight size={17} aria-hidden /></Link></div>
                <dl className="preview-stats"><div><dt>{t("landing.attachments")}</dt><dd>{exampleSummary.missingRequired}</dd></div><div><dt>{t("landing.fees")}</dt><dd>{currency.format(example.fees.total)}</dd></div></dl>
              </div>
            </div>
          </article>
          <p className="preview-caption">{t("landing.estimates")}</p>
        </section>

        {/* workspace block for a signed-in user, saved projects, or a failed load */}
        {user || projects.length > 0 || loadError ? <section id="your-projects" className="landing-workspace" aria-labelledby="workspace-heading">
          <div className="landing-workspace-heading"><div><h2 id="workspace-heading">{t("landing.workspace")}</h2><p>{t("landing.workspaceBody")}</p></div><Link className="button secondary" href="/intake">{t("landing.newProject")}<ArrowRight size={16} aria-hidden /></Link></div>
          {/* retry bumps attempt so the load effect runs again */}
          {loadError ? <div className="landing-workspace-error" role="alert"><p>{t("landing.loadError")}</p><button className="button secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>{t("landing.retry")}</button></div> : null}
          <p className="sr-only" role="status">{refreshing ? t("landing.loading") : ""}</p>
          {/* one link per saved project, or the empty line */}
          {projects.length > 0 ? <ul className="landing-projects">{projects.map((project) => <li key={project.id}><Link href={`/projects/${project.id}?tab=overview`}><span>{project.config.name}</span><ArrowRight size={18} aria-hidden /></Link></li>)}</ul> : <p className="landing-empty">{t("landing.noProjects")}</p>}
        </section> : null}

        <section id="benefits" className="landing-benefits" aria-labelledby="benefits-heading">
          <div className="landing-section-intro"><p className="eyebrow">{t("landing.benefitsLabel")}</p><h2 id="benefits-heading">{t("landing.benefitsTitle")}</h2></div>
          {/* three benefit cards, each linking into a sample tab */}
          <div className="landing-benefit-grid">{BENEFITS.map(({ id, icon: Icon, href }) => <article key={id} className={`landing-benefit landing-benefit-${id}`}><div className="landing-benefit-icon"><Icon size={27} strokeWidth={1.6} aria-hidden /></div><h3>{t(`landing.benefit${id}Title`)}</h3><p>{t(`landing.benefit${id}Body`)}</p><Link href={href}>{t(`landing.benefit${id}Link`)}<ArrowRight size={17} aria-hidden /></Link></article>)}</div>
        </section>

        <section id="how-it-works" className="landing-how" aria-labelledby="how-heading">
          <div className="landing-section-intro"><p className="eyebrow">{t("landing.howLabel")}</p><h2 id="how-heading">{t("landing.howTitle")}</h2></div>
          {/* three numbered how-it-works steps */}
          <ol>{[1, 2, 3].map((step) => <li key={step}><span className="landing-step-index" aria-hidden>0{step}</span><h3>{t(`landing.step${step}Title`)}</h3><p>{t(`landing.step${step}Body`)}</p></li>)}</ol>
        </section>
        <section className="landing-trust" aria-labelledby="trust-heading"><div><h2 id="trust-heading">{t("landing.trustTitle")}</h2><p>{t("landing.trustBody")}</p></div><Link href="/about">{t("landing.methodology")}<ArrowRight size={18} aria-hidden /></Link></section>
        <section className="landing-closing" aria-labelledby="closing-heading"><PermitPilotLogo size={48} wordmark={false} decorative /><h2 id="closing-heading">{t("landing.closingTitle")}</h2><p>{t("landing.closingBody")}</p><Link className="button primary" href="/intake">{t("landing.start")}<ArrowRight size={18} aria-hidden /></Link></section>
      </main>
      <footer className="landing-footer"><div><Link href="/" aria-label="PermitPilot home"><PermitPilotLogo decorative /></Link><p>{t("landing.footerTagline")}</p></div><nav aria-label={t("landing.footerNav")}><Link href="/about">{t("landing.footerAbout")}</Link><Link href="/login">{t("landing.signIn")}</Link><Link href="/intake">{t("landing.newProject")}</Link></nav><p className="landing-footer-note">{t("landing.footerNote")}</p></footer>
    </AppShell>
  );
}
