"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Database, LogIn, LogOut, UserCheck } from "lucide-react";
import { A11yControls } from "@/components/a11y/A11yControls";
import { DemoNotice } from "@/components/DemoNotice";
import { useA11y } from "@/lib/a11y";
import { DB_SYNC_EVENT } from "@/lib/store";
import { signOutPermitPilot, useAuth } from "@/lib/supabase";
import { requestProductTour } from "@/lib/tour";

export function AppShell({
  children,
  eyebrow,
}: {
  children: React.ReactNode;
  eyebrow?: string;
}) {
  const { t } = useA11y();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [syncPulse, setSyncPulse] = useState(false);
  // little blink when a project saves

  useEffect(() => {
    const onSync = () => {
      setSyncPulse(true);
      window.setTimeout(() => setSyncPulse(false), 1800);
    };
    window.addEventListener(DB_SYNC_EVENT, onSync);
    return () => window.removeEventListener(DB_SYNC_EVENT, onSync);
  }, []);

  function handleGuideClick() {
    if (pathname?.startsWith("/projects/")) {
      requestProductTour();
      return;
    }
    router.push("/demo?tour=1");
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        {t("nav.skip")}
      </a>
      <DemoNotice />
      <header className="border-b border-[var(--line)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="brand shrink-0">
              <span className="brand-mark shrink-0" aria-hidden>
                P
              </span>
              <span className="whitespace-nowrap">
                PermitPilot
                <span className="mt-0.5 block text-xs font-normal tracking-normal text-[var(--muted)]">
                  Demo Harbor, NH
                </span>
              </span>
            </Link>
            {eyebrow ? (
              <p className="hidden text-xs text-[var(--muted)] xl:block whitespace-nowrap border-l border-[var(--line)] pl-3">
                {eyebrow}
              </p>
            ) : null}
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Primary">
            <Link className="nav-link px-1.5 text-sm whitespace-nowrap" href="/intake">
              {t("nav.newProject")}
            </Link>
            <Link className="nav-link px-1.5 text-sm whitespace-nowrap" href="/demo">
              {t("nav.demo")}
            </Link>
            <Link className="nav-link px-1.5 text-sm whitespace-nowrap" href="/about">
              {t("nav.methodology")}
            </Link>
            <button
              type="button"
              onClick={handleGuideClick}
              className="a11y-toggle whitespace-nowrap cursor-pointer"
              aria-label={t("nav.guide")}
            >
              <Compass size={15} aria-hidden />
              {t("nav.guide")}
            </button>
            <A11yControls />
            {user ? (
              <div className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-xs font-semibold text-[var(--navy)] whitespace-nowrap">
                <UserCheck size={14} className="text-[var(--ok)] shrink-0" aria-hidden />
                <span className="max-w-[8.5rem] truncate" title={user.email}>
                  {user.name}
                </span>
                {syncPulse ? (
                  <span
                    className="inline-flex items-center gap-1 text-[var(--ok)]"
                    title={t("common.dbSaved")}
                  >
                    <Database size={12} aria-hidden />
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    void signOutPermitPilot();
                  }}
                  className="ml-1 inline-flex items-center text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer"
                  aria-label={t("nav.signOut")}
                  title={t("nav.signOut")}
                >
                  <LogOut size={13} aria-hidden />
                </button>
              </div>
            ) : (
              <Link className="a11y-toggle whitespace-nowrap" href="/login">
                <LogIn size={14} aria-hidden />
                {t("nav.signIn")}
              </Link>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
