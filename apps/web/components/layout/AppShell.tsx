"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Database, LogIn, LogOut, Menu, UserCheck, X } from "lucide-react";
import { A11yControls } from "@/components/a11y/A11yControls";
import { DemoNotice } from "@/components/DemoNotice";
import { PwaControls } from "@/components/pwa/PwaControls";
import { useA11y } from "@/lib/a11y";
import { DB_SYNC_EVENT } from "@/lib/store";
import { signOutPermitPilot, useAuth } from "@/lib/supabase";
import { requestProductTour } from "@/lib/tour";
import { PermitPilotLogo } from "@/components/brand/PermitPilotLogo";

// header, skip link, and the menu around every page
export function AppShell({
  children,
  eyebrow,
  variant = "app",
}: {
  children: React.ReactNode;
  eyebrow?: string;
  variant?: "landing" | "app";
}) {
  const { t } = useA11y();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [syncPulse, setSyncPulse] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);
  const signOutPending = useRef(false);
  // little blink when a project saves

  // flash the saved icon after a cloud sync
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onSync = (event: Event) => {
      // only cloud saves get the blink
      if ((event as CustomEvent<{ source: string }>).detail?.source !== "supabase") return;
      setSyncPulse(true);
      clearTimeout(timer);
      timer = setTimeout(() => setSyncPulse(false), 1800);
    };
    window.addEventListener(DB_SYNC_EVENT, onSync);
    // remove the listener and any pending blink
    return () => {
      window.removeEventListener(DB_SYNC_EVENT, onSync);
      clearTimeout(timer);
    };
  }, []);

  // sign out of this device and say whether it worked
  async function handleSignOut() {
    // ignore a second click while the first sign-out is running
    if (signOutPending.current) return;
    signOutPending.current = true;
    setSigningOut(true);
    setSessionMessage("");
    try {
      await signOutPermitPilot();
      setSessionMessage("Signed out of this device.");
    } catch {
      setSessionMessage("Could not sign out. Please try again.");
    } finally {
      // unlock the button either way
      signOutPending.current = false;
      setSigningOut(false);
    }
  }

  // close the menu, then start the tour here or open the demo
  function handleGuideClick() {
    setMenuOpen(false);
    // already on a project, so start the tour in place
    if (pathname?.startsWith("/projects/")) {
      requestProductTour();
      return;
    }
    router.push("/demo?tour=1");
  }

  // landing pages get an extra class for the marketing layout
  return (
    <div className={`app-shell min-h-screen${variant === "landing" ? " landing-shell" : ""}`}>
      <a href="#main" className="skip-link">
        {t("nav.skip")}
      </a>
      {/* landing uses its own demo line; other pages use the default */}
      <DemoNotice text={variant === "landing" ? t("landing.demoNotice") : undefined} />
      <header className="border-b border-[var(--line)] bg-[var(--card)]">
        <div className="app-header-inner mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="brand shrink-0" aria-label="PermitPilot home">
              <PermitPilotLogo decorative />
            </Link>
            {/* screen-reader label when the page passed one */}
            {eyebrow ? (
              <p className="sr-only">
                {eyebrow}
              </p>
            ) : null}
          </div>
          {/* in-page links only on the landing header */}
          {variant === "landing" ? (
            <nav className="landing-header-links" aria-label="On this page">
              <a href="#benefits" className="nav-link">{t("landing.navBenefits")}</a>
              <a href="#how-it-works" className="nav-link">{t("landing.navHow")}</a>
            </nav>
          ) : null}
          <button ref={menuButton} type="button" className="button secondary nav-menu-toggle" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            Menu
          </button>
          <nav id="primary-navigation" className={`app-navigation ${menuOpen ? "is-open" : ""}`} aria-label="Primary" onKeyDown={(event) => {
            // let the language list handle its own keys
            if ((event.target as HTMLElement).closest('[role="listbox"]')) return;
            // escape closes the phone menu and focuses the button
            if (event.key === "Escape" && menuOpen) {
              setMenuOpen(false);
              menuButton.current?.focus();
            }
          }}>
            <Link className="nav-link px-1.5 text-sm whitespace-nowrap" href="/intake" aria-current={pathname === "/intake" ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              {t("nav.newProject")}
            </Link>
            <Link className="nav-link px-1.5 text-sm whitespace-nowrap" href="/demo" aria-current={pathname === "/demo" ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              {t("nav.demo")}
            </Link>
            <Link className="nav-link px-1.5 text-sm whitespace-nowrap" href="/about" aria-current={pathname === "/about" ? "page" : undefined} onClick={() => setMenuOpen(false)}>
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
            <PwaControls />
            <A11yControls />
            {/* signed-in chip, or the sign-in link */}
            {user ? (
              <div className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-xs font-semibold text-[var(--navy)] whitespace-nowrap">
                <UserCheck size={14} className="text-[var(--ok)] shrink-0" aria-hidden />
                <span className="max-w-[8.5rem] truncate" title={user.email}>
                  {user.name}
                </span>
                {/* brief saved icon after a cloud sync */}
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
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  aria-busy={signingOut}
                  className="icon-button ml-1 text-[var(--muted)] hover:text-[var(--danger)]"
                  aria-label={t("nav.signOut")}
                  title={t("nav.signOut")}
                >
                  <LogOut size={13} aria-hidden />
                </button>
              </div>
            ) : (
              <Link className="a11y-toggle whitespace-nowrap" href="/login" aria-current={pathname === "/login" ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                <LogIn size={14} aria-hidden />
                {t("nav.signIn")}
              </Link>
            )}
          </nav>
        </div>
      </header>
      {/* visible status when there is a message, otherwise keep the live region */}
      <div role="status" className={sessionMessage ? "mx-auto max-w-6xl px-4 pt-3 text-sm" : "sr-only"}>{sessionMessage}</div>
      {children}
    </div>
  );
}
