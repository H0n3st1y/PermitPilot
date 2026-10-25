"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Compass, KeyRound, Sparkles, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useA11y } from "@/lib/a11y";
import { seedMockAccountWorkspace, workspaceAfterAuth } from "@/lib/store";
import {
  ACCOUNT_UNAVAILABLE_MESSAGE,
  getAccountAuthMode,
  signInAsDemoJudge,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/supabase";

// sample-account buttons up top, then the sign-in or sign-up form
export default function LoginPage() {
  const router = useRouter();
  const { t } = useA11y();
  const accountMode = getAccountAuthMode();
  const accountUnavailable = accountMode === "unavailable";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pendingRef = useRef(false);
  const [status, setStatus] = useState("");

  // one sign-in at a time, with a status line while it runs
  async function runAuth(action: () => Promise<void>) {
    // ignore a second click while the first attempt is still going
    if (pendingRef.current) return;
    pendingRef.current = true;
    setSubmitting(true);
    setError("");
    setStatus("Opening your workspace…");
    // run it, or swap the status for a connection error
    try { await action(); }
    catch { setStatus(""); setError("We couldn't open your workspace. Check your connection and try again."); }
    // always unlock the buttons, success or not
    finally { pendingRef.current = false; setSubmitting(false); }
  }

  // demo judge sign-in, then home or the guided project tour
  async function handleSampleAccount(destination: "home" | "tour") {
    await runAuth(async () => {
      await signInAsDemoJudge();
      const { primary } = seedMockAccountWorkspace();
      // home stays on the landing page; tour opens the sample graph
      router.push(destination === "home" ? "/" : `/projects/${primary.id}?tab=graph&tour=1`);
    });
  }

  // email form: sign in or create the account, then open the workspace
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAuth(async () => {
      // which call we make depends on the tab
      const result = mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(name, email, password);
      // a message like "check your email" stops here
      if (result.message) { setStatus(result.message); return; }
      // no user means we stay on the form and show the error
      if (result.error || !result.user) {
        setStatus(""); setError(result.error ?? "Unable to sign in. Please try again."); return;
      }
      const { nextPath } = await workspaceAfterAuth();
      setStatus("Signed in. Opening your workspace…");
      router.push(nextPath);
    });
  }

  return (
    <AppShell eyebrow={t("login.eyebrow")}>
      <main id="main" className="mx-auto max-w-xl px-4 py-10" aria-busy={submitting}>
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

        {/* alert only shows up when something failed */}
        {error ? <p className="bottleneck-flag mb-4" role="alert">{error}</p> : null}
        <p className="mb-3 text-sm text-[var(--muted)]" role="status">{status}</p>
        {/* Simple Sign In / Sign Up Card */}
        <section className="panel">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-4">
            <div>
              <p className="eyebrow">{t("login.yourAccount")}</p>
              <h2 className="mt-1 font-serif text-2xl text-[var(--navy)]">
                {/* heading and the line under it follow the active tab */}
                {mode === "login" ? t("login.signInTitle") : t("login.signUpTitle")}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {mode === "login" ? t("login.signInBody") : t("login.signUpBody")}
              </p>
            </div>
            <KeyRound className="text-[var(--navy)]" size={20} aria-hidden />
          </div>

          {/* local or missing accounts get a warning; cloud does not */}
          {accountMode !== "cloud" ? (
            <p id="account-availability" className="panel-warn mt-4 rounded-[var(--radius-control)] border border-[var(--line)] p-3 text-sm">
              {/* unavailable message, or the this-browser development note */}
              {accountUnavailable
                ? ACCOUNT_UNAVAILABLE_MESSAGE
                : "Development accounts stay in this browser. Use a test password; these accounts do not provide secure cloud access."}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2" role="tablist" aria-label={t("login.yourAccount")}
            onKeyDown={(event) => {
              // arrows, home, and end move between the two tabs
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
              const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
              // home and end jump to the ends; arrows wrap
              const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + 1) % tabs.length;
              event.preventDefault(); tabs[next]?.focus(); tabs[next]?.click();
            }}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              id="login-auth-login"
              aria-controls="login-auth-panel"
              tabIndex={mode === "login" ? 0 : -1}
              disabled={submitting || accountUnavailable}
              className={`tab cursor-pointer ${mode === "login" ? "is-active" : ""}`}
              onClick={() => {
                // switch to sign in and clear a leftover error
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
              id="login-auth-signup"
              aria-controls="login-auth-panel"
              tabIndex={mode === "signup" ? 0 : -1}
              disabled={submitting || accountUnavailable}
              className={`tab cursor-pointer ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => {
                // switch to create account and clear a leftover error
                setMode("signup");
                setError("");
              }}
            >
              {t("home.tabSignUp")}
            </button>
          </div>

          <form id="login-auth-panel" role="tabpanel" aria-labelledby={`login-auth-${mode}`} aria-describedby={accountMode !== "cloud" ? "account-availability" : undefined} className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {/* name field only exists on the sign-up tab */}
            {mode === "signup" ? (
              <label className="field">
                <span className="field-label">{t("home.yourName")}</span>
                <input
                  type="text"
                  autoComplete="name"
                  disabled={submitting || accountUnavailable}
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
                autoComplete="email"
                disabled={submitting || accountUnavailable}
                className="field-input"
                placeholder={t("home.emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">{t("home.password")}</span>
              {/* new password when signing up, current password when signing in. sign-up asks for at least 6 characters */}
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={mode === "signup" ? 6 : undefined}
                disabled={submitting || accountUnavailable}
                className="field-input"
                placeholder={t("home.passwordPlaceholder")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button type="submit" className="button primary cursor-pointer" disabled={submitting || accountUnavailable}>
                {/* busy label, otherwise sign in or create account */}
                {submitting ? "Opening workspace…" : mode === "login" ? t("home.tabSignIn") : t("home.createAccount")}
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
            {/* cloud save note, or the reminder that this stays in the browser */}
            {accountMode === "cloud" ? t("login.savedNote") : "Sample changes stay in this browser. No account is required to explore."}
          </p>
        </section>
      </main>
    </AppShell>
  );
}
