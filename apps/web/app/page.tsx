"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  FileStack,
  GitCommitHorizontal,
  KeyRound,
  Landmark,
  LogOut,
  Receipt,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  DB_SYNC_EVENT,
  listLocalProjectsForCurrentUser,
  listUserProjects,
  seedMockAccountWorkspace,
  workspaceAfterAuth,
} from "@/lib/store";
import {
  signInAsDemoJudge,
  signInWithEmail,
  signOutPermitPilot,
  signUpWithEmail,
  useAuth,
} from "@/lib/supabase";
import { useA11y } from "@/lib/a11y";
import type { Project } from "@/lib/types";

const PLATFORM_GUIDE = [
  {
    step: "1",
    href: "/intake",
    icon: Landmark,
    badge: "home.g1badge",
    title: "home.g1title",
    cta: "home.g1cta",
    does: "home.g1does",
    gets: ["home.g1get1", "home.g1get2"],
  },
  {
    step: "2",
    href: "/demo?tab=graph",
    icon: Share2,
    badge: "home.g2badge",
    title: "home.g2title",
    cta: "home.g2cta",
    does: "home.g2does",
    gets: ["home.g2get1", "home.g2get2", "home.g2get3"],
  },
  {
    step: "3",
    href: "/demo?tab=timeline",
    icon: GitCommitHorizontal,
    badge: "home.g3badge",
    title: "home.g3title",
    cta: "home.g3cta",
    does: "home.g3does",
    gets: ["home.g3get1", "home.g3get2"],
  },
  {
    step: "4",
    href: "/demo?tab=documents",
    icon: FileStack,
    badge: "home.g4badge",
    title: "home.g4title",
    cta: "home.g4cta",
    does: "home.g4does",
    gets: ["home.g4get1", "home.g4get2"],
  },
  {
    step: "5",
    href: "/demo?tab=fees",
    icon: Receipt,
    badge: "home.g5badge",
    title: "home.g5title",
    cta: "home.g5cta",
    does: "home.g5does",
    gets: ["home.g5get1"],
  },
  {
    step: "6",
    href: "/demo?tab=inspections",
    icon: ClipboardCheck,
    badge: "home.g6badge",
    title: "home.g6title",
    cta: "home.g6cta",
    does: "home.g6does",
    gets: ["home.g6get1", "home.g6get2"],
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useA11y();
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [authTab, setAuthTab] = useState<"mock" | "signin" | "signup">("mock");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSavedProjects(listLocalProjectsForCurrentUser());
    void listUserProjects().then((projects) => {
      setSavedProjects(projects);
    });

    const onSync = () => {
      setSavedProjects(listLocalProjectsForCurrentUser());
    };
    window.addEventListener(DB_SYNC_EVENT, onSync);
    return () => window.removeEventListener(DB_SYNC_EVENT, onSync);
  }, [user?.id]);

  async function handleEnterMockAccount(openTourImmediately: boolean) {
    // load the 3 sample shops for the judge account
    setBusy(true);
    setAuthError("");
    await signInAsDemoJudge();
    const { primary, projects } = seedMockAccountWorkspace();
    setSavedProjects(projects);
    setBusy(false);
    if (openTourImmediately) {
      router.push(`/projects/${primary.id}?tab=graph&tour=1`);
    }
  }

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    // real users should not get harbor kitchen dumped on them
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    const result =
      authTab === "signin"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(name, email, password);
    setBusy(false);

    if (result.error || !result.user) {
      setAuthError(result.error ?? "Unable to sign in.");
      return;
    }
    const { projects, nextPath } = await workspaceAfterAuth();
    setSavedProjects(projects);
    if (nextPath !== "/") {
      router.push(nextPath);
    }
  }

  return (
    <AppShell>
      <main id="main">
        {/* 1. HERO + SIMPLE MOCK ACCOUNT / SIGN-IN CARD */}
        <section className="border-b border-[var(--line)] bg-[var(--card)]">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:py-14">
            <div>
              <p className="eyebrow">{t("home.eyebrow")}</p>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
                {t("home.title")}
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">{t("home.lede")}</p>

              <div className="mt-6">
                <Link className="button secondary" href="/intake">
                  {t("home.startOwn")}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>

            {/* Right Column: Friendly Sample Account & Sign-In Box */}
            <aside className="panel" aria-label={t("home.accountLabel")}>
              {user ? (
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] pb-3">
                    <div>
                      <p className="eyebrow">{t("home.signedIn")}</p>
                      <h2 className="mt-0.5 font-serif text-2xl text-[var(--navy)]">
                        {user.isDemoJudge ? t("home.sampleAccount") : user.name}
                      </h2>
                    </div>
                    <span className="status-pill status-approved">{t("home.active")}</span>
                  </div>

                  {savedProjects.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {savedProjects.map((proj) => (
                        <li key={proj.id}>
                          <Link
                            href={`/projects/${proj.id}?tab=graph`}
                            className="block rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--paper-2)]"
                          >
                            {proj.config.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--muted)]">{t("home.noProjects")}</p>
                  )}

                  <div className="mt-4">
                    <Link
                      href={savedProjects.length === 0 ? "/intake?welcome=1" : "/intake"}
                      className="button secondary w-full text-sm"
                    >
                      {savedProjects.length === 0 ? t("home.setupProject") : t("home.newProject")}
                    </Link>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-[var(--ok)]" aria-hidden />
                      {t("home.saves")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void signOutPermitPilot()}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--danger)] hover:underline cursor-pointer"
                    >
                      <LogOut size={13} aria-hidden />
                      {t("home.signOut")}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
                    <div>
                      <p className="eyebrow">{t("home.getStarted")}</p>
                      <h2 className="mt-0.5 font-serif text-2xl text-[var(--navy)]">
                        {t("home.trySample")}
                      </h2>
                    </div>
                    <KeyRound size={20} className="text-[var(--navy)]" aria-hidden />
                  </div>

                  {/* Mode Switcher Tabs */}
                  <div className="mt-3 flex flex-wrap gap-1.5" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={authTab === "mock"}
                      onClick={() => {
                        setAuthTab("mock");
                        setAuthError("");
                      }}
                      className={`tab !min-h-[36px] !px-3 text-xs cursor-pointer ${
                        authTab === "mock" ? "is-active" : ""
                      }`}
                    >
                      <Sparkles size={13} aria-hidden />
                      {t("home.tabSample")}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={authTab === "signin"}
                      onClick={() => {
                        setAuthTab("signin");
                        setAuthError("");
                      }}
                      className={`tab !min-h-[36px] !px-3 text-xs cursor-pointer ${
                        authTab === "signin" ? "is-active" : ""
                      }`}
                    >
                      {t("home.tabSignIn")}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={authTab === "signup"}
                      onClick={() => {
                        setAuthTab("signup");
                        setAuthError("");
                      }}
                      className={`tab !min-h-[36px] !px-3 text-xs cursor-pointer ${
                        authTab === "signup" ? "is-active" : ""
                      }`}
                    >
                      {t("home.tabSignUp")}
                    </button>
                  </div>

                  {authTab === "mock" ? (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-[var(--ink)]">{t("home.sampleBlurb")}</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                        <li>{t("home.sampleHarbor")}</li>
                        <li>{t("home.sampleCafe")}</li>
                        <li>{t("home.sampleParty")}</li>
                      </ul>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleEnterMockAccount(true)}
                        className="button primary w-full cursor-pointer"
                      >
                        <Compass size={16} aria-hidden />
                        {t("home.openSamples")}
                      </button>
                    </div>
                  ) : (
                    <form className="mt-3 space-y-3" onSubmit={handleEmailAuth}>
                      <p className="text-sm text-[var(--muted)]">
                        {authTab === "signup" ? t("home.signupBlurb") : t("home.signinBlurb")}
                      </p>
                      {authTab === "signup" ? (
                        <label className="field !mt-2">
                          <span className="text-xs font-semibold">{t("home.yourName")}</span>
                          <input
                            type="text"
                            placeholder={t("home.namePlaceholder")}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </label>
                      ) : null}
                      <label className="field !mt-2">
                        <span className="text-xs font-semibold">{t("home.email")}</span>
                        <input
                          type="email"
                          placeholder={t("home.emailPlaceholder")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </label>
                      <label className="field !mt-2">
                        <span className="text-xs font-semibold">{t("home.password")}</span>
                        <input
                          type="password"
                          placeholder={t("home.passwordPlaceholder")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </label>
                      {authError ? (
                        <p className="bottleneck-flag text-xs" role="alert">
                          {authError}
                        </p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={busy}
                        className="button primary w-full cursor-pointer"
                      >
                        {authTab === "signin" ? t("home.tabSignIn") : t("home.createAccount")}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* 2. EVERYTHING YOU CAN DO WITH PERMITPILOT (PLAIN-ENGLISH GUIDE) */}
        <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="everything-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t("home.howHelps")}</p>
              <h2 id="everything-heading" className="mt-1 font-serif text-3xl text-[var(--navy)]">
                {t("home.everything")}
              </h2>
              <p className="mt-2 max-w-3xl text-[var(--muted)]">{t("home.everythingBody")}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {PLATFORM_GUIDE.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.step} className="panel flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--seal)]">
                        <Icon size={18} aria-hidden />
                        {item.step}. {t(item.badge)}
                      </span>
                      <Link
                        href={item.href}
                        className="text-xs font-bold text-[var(--navy)] underline"
                      >
                        {t(item.cta)} →
                      </Link>
                    </div>

                    <h3 className="mt-2 font-serif text-2xl text-[var(--navy)]">
                      {t(item.title)}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--ink)]">{t(item.does)}</p>

                    <ul className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-sm text-[var(--muted)]">
                      {item.gets.map((point) => (
                        <li key={point} className="flex items-start gap-2">
                          <CheckCircle2
                            size={15}
                            className="mt-0.5 shrink-0 text-[var(--ok)]"
                            aria-hidden
                          />
                          <span>{t(point)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 4. SIMPLE TRUST & TRANSPARENCY NOTE */}
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <div className="panel panel-warn">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="eyebrow inline-flex items-center gap-1.5">
                  <ShieldCheck size={15} aria-hidden />
                  {t("home.trustEyebrow")}
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[var(--navy)]">
                  {t("home.trustTitle")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-[var(--ink)]">{t("home.trustBody")}</p>
              </div>
              <Link href="/about" className="button secondary shrink-0">
                {t("home.howItWorks")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
