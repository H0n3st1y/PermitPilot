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

  async function runAuth(action: () => Promise<void>) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setSubmitting(true);
    setError("");
    setStatus("Opening your workspace…");
    try { await action(); }
    catch { setStatus(""); setError("We couldn't open your workspace. Check your connection and try again."); }
    finally { pendingRef.current = false; setSubmitting(false); }
  }

  async function handleSampleAccount(destination: "home" | "tour") {
    await runAuth(async () => {
      await signInAsDemoJudge();
      const { primary } = seedMockAccountWorkspace();
      router.push(destination === "home" ? "/" : `/projects/${primary.id}?tab=graph&tour=1`);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAuth(async () => {
      const result = mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(name, email, password);
      if (result.message) { setStatus(result.message); return; }
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

        {error ? <p className="bottleneck-flag mb-4" role="alert">{error}</p> : null}
        <p className="mb-3 text-sm text-[var(--muted)]" role="status">{status}</p>
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

          {accountMode !== "cloud" ? (
            <p id="account-availability" className="panel-warn mt-4 rounded-[var(--radius-control)] border border-[var(--line)] p-3 text-sm">
              {accountUnavailable
                ? ACCOUNT_UNAVAILABLE_MESSAGE
                : "Development accounts stay in this browser. Use a test password; these accounts do not provide secure cloud access."}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2" role="tablist" aria-label={t("login.yourAccount")}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
              const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
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
                setMode("signup");
                setError("");
              }}
            >
              {t("home.tabSignUp")}
            </button>
          </div>

          <form id="login-auth-panel" role="tabpanel" aria-labelledby={`login-auth-${mode}`} aria-describedby={accountMode !== "cloud" ? "account-availability" : undefined} className="mt-5 space-y-4" onSubmit={handleSubmit}>
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
            {accountMode === "cloud" ? t("login.savedNote") : "Sample changes stay in this browser. No account is required to explore."}
          </p>
        </section>
      </main>
    </AppShell>
  );
}
