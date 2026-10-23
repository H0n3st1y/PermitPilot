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
import type { Project } from "@/lib/types";

const PLATFORM_GUIDE = [
  {
    step: "1",
    badge: "Quick 3-Question Setup",
    title: "Tell us what you are building or opening",
    href: "/intake",
    cta: "Try the 3-step form",
    icon: Landmark,
    whatItDoes:
      "Answer 3 simple questions about your project—like opening a home bakery, remodeling a shop, adding a room, or hosting a neighborhood event.",
    whatYouGet: [
      "Pick a ready-made example (Home Bakery, Corner Cafe, or Block Party) if you don't want to type.",
      "Instantly builds a custom checklist of every city permit you need.",
    ],
  },
  {
    step: "2",
    badge: "Visual Map",
    title: "See which permits come first (and what is holding you up)",
    href: "/demo?tab=graph",
    cta: "See the visual map",
    icon: Share2,
    whatItDoes:
      "Shows your permits as a step-by-step map so you never apply for the wrong permit first or get stuck waiting in the wrong line.",
    whatYouGet: [
      "Highlights any step that is slowing down your project in gold.",
      "Click any step to see a plain-English explanation of why the town requires it.",
      "Includes a ready-to-copy follow-up email you can send to the city department.",
    ],
  },
  {
    step: "3",
    badge: "Schedule & Dates",
    title: "Track your progress and estimated dates",
    href: "/demo?tab=timeline",
    cta: "View sample schedule",
    icon: GitCommitHorizontal,
    whatItDoes:
      "Gives you a realistic time range for each department review and updates your next recommended step as approvals come in.",
    whatYouGet: [
      "Mark steps as Not Started, Submitted, In Review, or Approved.",
      "See which permits you can work on at the same time to save weeks.",
    ],
  },
  {
    step: "4",
    badge: "Paperwork Checklist",
    title: "Keep all required documents in one place",
    href: "/demo?tab=documents",
    cta: "Open document checklist",
    icon: FileStack,
    whatItDoes:
      "Lists the exact files each department asks for—like a floor plan, menu, or food safety certificate—before you submit.",
    whatYouGet: [
      "Upload your own PDFs or photos, or click 'Attach sample PDF' to test how it works.",
      "Checks off each requirement as you go so nothing is missing.",
    ],
  },
  {
    step: "5",
    badge: "No Surprise Costs",
    title: "See what your permits will cost upfront",
    href: "/demo?tab=fees",
    cta: "See fee breakdown",
    icon: Receipt,
    whatItDoes:
      "Adds up the town’s permit fees based on your project size and work type so you can budget before spending money.",
    whatYouGet: [
      "Shows every fee line-by-line in plain numbers—no hidden math.",
    ],
  },
  {
    step: "6",
    badge: "Inspection Prep",
    title: "Pass your city inspections the first time",
    href: "/demo?tab=inspections",
    cta: "View inspection prep",
    icon: ClipboardCheck,
    whatItDoes:
      "Gives you a simple pre-inspection checklist for Building, Fire, and Health before the inspector visits your site.",
    whatYouGet: [
      "Check off items as you prepare your space.",
      "Switch between English and Español, Plain English, or High-Contrast mode anytime at the top of the page.",
    ],
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
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
              <p className="eyebrow">Permit Guide for Residents &amp; Small Businesses</p>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
                Know every permit, fee, and step before you apply.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
                Starting a home food business, renovating a shop, or planning a community event?{" "}
                <strong>PermitPilot</strong> turns confusing city rules into a simple, step-by-step checklist—showing you what to file first, what it costs, and how long it takes.
              </p>

              <div className="mt-6">
                <Link className="button secondary" href="/intake">
                  Start Your Own Project
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>

            {/* Right Column: Friendly Sample Account & Sign-In Box */}
            <aside className="panel" aria-label="Account and Sample Access">
              {user ? (
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] pb-3">
                    <div>
                      <p className="eyebrow">You Are Signed In</p>
                      <h2 className="mt-0.5 font-serif text-2xl text-[var(--navy)]">
                        {user.isDemoJudge ? "Sample Explorer Account" : user.name}
                      </h2>
                    </div>
                    <span className="status-pill status-approved">Active</span>
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
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      No projects yet. Answer a few questions and we’ll build your permit roadmap.
                    </p>
                  )}

                  <div className="mt-4">
                    <Link
                      href={savedProjects.length === 0 ? "/intake?welcome=1" : "/intake"}
                      className="button secondary w-full text-sm"
                    >
                      {savedProjects.length === 0 ? "Set up my project" : "+ Start a New Project"}
                    </Link>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-[var(--ok)]" aria-hidden />
                      Progress saves automatically
                    </span>
                    <button
                      type="button"
                      onClick={() => void signOutPermitPilot()}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--danger)] hover:underline cursor-pointer"
                    >
                      <LogOut size={13} aria-hidden />
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
                    <div>
                      <p className="eyebrow">Get Started</p>
                      <h2 className="mt-0.5 font-serif text-2xl text-[var(--navy)]">
                        Try a sample, or create an account
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
                      Sample
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
                      Sign in
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
                      Create account
                    </button>
                  </div>

                  {authTab === "mock" ? (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-[var(--ink)]">
                        No email needed. This opens three example projects so you can click around:
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                        <li>
                          <strong className="text-[var(--ink)]">Harbor Kitchen</strong> — a home bakery
                        </li>
                        <li>
                          <strong className="text-[var(--ink)]">Beacon Corner Cafe</strong> — a shop remodel
                        </li>
                        <li>
                          <strong className="text-[var(--ink)]">Wharf Street Block Party</strong> — an outdoor event
                        </li>
                      </ul>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleEnterMockAccount(true)}
                        className="button primary w-full cursor-pointer"
                      >
                        <Compass size={16} aria-hidden />
                        Open sample projects
                      </button>
                    </div>
                  ) : (
                    <form className="mt-3 space-y-3" onSubmit={handleEmailAuth}>
                      <p className="text-sm text-[var(--muted)]">
                        {authTab === "signup"
                          ? "After you create an account, we’ll ask a few questions and build a permit checklist for your project."
                          : "If you don’t have a project yet, we’ll ask a few questions first so the roadmap matches what you’re building."}
                      </p>
                      {authTab === "signup" ? (
                        <label className="field !mt-2">
                          <span className="text-xs font-semibold">Your name</span>
                          <input
                            type="text"
                            placeholder="e.g., Maya Lin"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </label>
                      ) : null}
                      <label className="field !mt-2">
                        <span className="text-xs font-semibold">Email address</span>
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </label>
                      <label className="field !mt-2">
                        <span className="text-xs font-semibold">Password</span>
                        <input
                          type="password"
                          placeholder="At least 6 characters"
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
                        {authTab === "signin" ? "Sign in" : "Create my account"}
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
              <p className="eyebrow">How PermitPilot Helps You</p>
              <h2 id="everything-heading" className="mt-1 font-serif text-3xl text-[var(--navy)]">
                Everything you can do on this website
              </h2>
              <p className="mt-2 max-w-3xl text-[var(--muted)]">
                You don’t need to be a contractor or lawyer to figure out city permits. Here are the 6 tools included for every project:
              </p>
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
                        {item.step}. {item.badge}
                      </span>
                      <Link
                        href={item.href}
                        className="text-xs font-bold text-[var(--navy)] underline"
                      >
                        {item.cta} →
                      </Link>
                    </div>

                    <h3 className="mt-2 font-serif text-2xl text-[var(--navy)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--ink)]">{item.whatItDoes}</p>

                    <ul className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-sm text-[var(--muted)]">
                      {item.whatYouGet.map((point) => (
                        <li key={point} className="flex items-start gap-2">
                          <CheckCircle2
                            size={15}
                            className="mt-0.5 shrink-0 text-[var(--ok)]"
                            aria-hidden
                          />
                          <span>{point}</span>
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
                  Clear &amp; Reliable Answers
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[var(--navy)]">
                  Real rulebook logic — never a chatbot guessing
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-[var(--ink)]">
                  Chatbots can make up city laws. PermitPilot uses a fixed checklist of town rules so you get the exact same permit steps, fee math, and rule links every time. (Note: Demo Harbor is a fictional sample town created for demonstration.)
                </p>
              </div>
              <Link href="/about" className="button secondary shrink-0">
                How It Works
              </Link>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
