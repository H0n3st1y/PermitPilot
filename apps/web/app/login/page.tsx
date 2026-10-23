"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Compass, KeyRound, Sparkles, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useA11y } from "@/lib/a11y";
import { seedMockAccountWorkspace, workspaceAfterAuth } from "@/lib/store";
import {
  signInAsDemoJudge,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useA11y();
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
    <AppShell eyebrow={t("login.eyebrow")}>
      <main id="main" className="mx-auto max-w-xl px-4 py-10">
        {/* Simple, Jargon-Free Sample Account Box */}
        <section className="panel panel-warn mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{t("login.lookingAround")}</p>
              <h1 className="mt-1 font-serif text-2xl text-[var(--navy)]">
                {t("login.sampleTitle")}
              </h1>
              <p className="mt-2 text-sm text-[var(--ink)]">{t("login.sampleBody")}</p>
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
              {t("login.openTour")}
            </button>
            <button
              type="button"
              className="button secondary cursor-pointer"
              disabled={submitting}
              onClick={() => void handleSampleAccount("home")}
            >
              <UserCheck size={16} aria-hidden />
              {t("login.seeProjects")}
            </button>
          </div>
        </section>

        {/* Simple Sign In / Sign Up Card */}
        <section className="panel">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-4">
            <div>
              <p className="eyebrow">{t("login.yourAccount")}</p>
              <h2 className="mt-1 font-serif text-2xl text-[var(--navy)]">
                {mode === "login" ? t("login.signInTitle") : t("login.signUpTitle")}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {mode === "login" ? t("login.signInBody") : t("login.signUpBody")}
              </p>
            </div>
            <KeyRound className="text-[var(--navy)]" size={20} aria-hidden />
          </div>

          <div className="mt-4 flex gap-2" role="tablist" aria-label={t("login.yourAccount")}>
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
              {t("home.tabSignIn")}
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
              {t("home.tabSignUp")}
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="field">
                <span className="field-label">{t("home.yourName")}</span>
                <input
                  type="text"
                  className="field-input"
                  placeholder={t("home.namePlaceholder")}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">{t("home.email")}</span>
              <input
                type="email"
                className="field-input"
                placeholder={t("home.emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">{t("home.password")}</span>
              <input
                type="password"
                className="field-input"
                placeholder={t("home.passwordPlaceholder")}
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
                {mode === "login" ? t("home.tabSignIn") : t("home.createAccount")}
              </button>
              <button
                type="button"
                className="button secondary cursor-pointer"
                disabled={submitting}
                onClick={() => void handleSampleAccount("tour")}
              >
                {t("login.skipSample")}
              </button>
            </div>
          </form>

          <p className="mt-5 flex items-center gap-1.5 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
            <CheckCircle2 size={14} className="text-[var(--ok)]" aria-hidden />
            {t("login.savedNote")}
          </p>
        </section>
      </main>
    </AppShell>
  );
}
