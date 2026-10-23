"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Compass, KeyRound, Sparkles, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { seedMockAccountWorkspace, workspaceAfterAuth } from "@/lib/store";
import {
  signInAsDemoJudge,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSampleAccount(destination: "home" | "tour") {
    // same sample account as the homepage card
    setSubmitting(true);
    setError("");
    await signInAsDemoJudge();
    const { primary } = seedMockAccountWorkspace();
    if (destination === "home") {
      router.push("/");
    } else {
      router.push(`/projects/${primary.id}?tab=graph&tour=1`);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result =
      mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(name, email, password);

    setSubmitting(false);
    if (result.error || !result.user) {
      setError(result.error ?? "Unable to sign in.");
      return;
    }

    const { nextPath } = await workspaceAfterAuth();
    router.push(nextPath);
  }

  return (
    <AppShell eyebrow="Sign In or Try a Sample Account">
      <main id="main" className="mx-auto max-w-xl px-4 py-10">
        {/* Simple, Jargon-Free Sample Account Box */}
        <section className="panel panel-warn mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Just Looking Around?</p>
              <h1 className="mt-1 font-serif text-2xl text-[var(--navy)]">
                Try our Sample Account (No Sign-Up Needed)
              </h1>
              <p className="mt-2 text-sm text-[var(--ink)]">
                Want to see how PermitPilot works without creating an account? Click below to open a ready-made account with <strong>3 example projects</strong> (a Home Bakery, a Corner Cafe, and a Neighborhood Block Party).
              </p>
            </div>
            <Sparkles className="shrink-0 text-[var(--seal)]" size={22} aria-hidden />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="button primary cursor-pointer"
              disabled={submitting}
              onClick={() => void handleSampleAccount("tour")}
            >
              <Compass size={16} aria-hidden />
              Open Sample Account + Guided Tour
            </button>
            <button
              type="button"
              className="button secondary cursor-pointer"
              disabled={submitting}
              onClick={() => void handleSampleAccount("home")}
            >
              <UserCheck size={16} aria-hidden />
              See All 3 Sample Projects
            </button>
          </div>
        </section>

        {/* Simple Sign In / Sign Up Card */}
        <section className="panel">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-4">
            <div>
              <p className="eyebrow">Your Account</p>
              <h2 className="mt-1 font-serif text-2xl text-[var(--navy)]">
                {mode === "login" ? "Sign in to save your projects" : "Create a free account"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {mode === "login"
                  ? "If this is your first time, we’ll ask a few questions and build a checklist for your project."
                  : "Next we’ll ask a few questions about what you’re opening or building, then create your permit roadmap."}
              </p>
            </div>
            <KeyRound className="text-[var(--navy)]" size={20} aria-hidden />
          </div>

          <div className="mt-4 flex gap-2" role="tablist" aria-label="Sign in or create account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`tab cursor-pointer ${mode === "login" ? "is-active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`tab cursor-pointer ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create account
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="field">
                <span className="field-label">Your name</span>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g., Maya Lin"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">Email address</span>
              <input
                type="email"
                className="field-input"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                className="field-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? (
              <p className="bottleneck-flag" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button type="submit" className="button primary cursor-pointer" disabled={submitting}>
                {mode === "login" ? "Sign in" : "Create my account"}
              </button>
              <button
                type="button"
                className="button secondary cursor-pointer"
                disabled={submitting}
                onClick={() => void handleSampleAccount("tour")}
              >
                Skip &amp; use Sample Account
              </button>
            </div>
          </form>

          <p className="mt-5 flex items-center gap-1.5 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
            <CheckCircle2 size={14} className="text-[var(--ok)]" aria-hidden />
            Your permit checklists, uploaded documents, and progress are saved automatically.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
