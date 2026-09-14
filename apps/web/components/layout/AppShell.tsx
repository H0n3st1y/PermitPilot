"use client";

import Link from "next/link";
import { A11yControls } from "@/components/a11y/A11yControls";
import { DemoNotice } from "@/components/DemoNotice";

export function AppShell({
  children,
  eyebrow,
}: {
  children: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <DemoNotice />
      <header className="border-b border-[var(--line)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                P
              </span>
              <span>
                PermitPilot
                <span className="mt-0.5 block text-xs font-normal tracking-normal text-[var(--muted)]">
                  Demo Harbor, MA
                </span>
              </span>
            </Link>
            {eyebrow ? <p className="hidden text-sm text-[var(--muted)] md:block">{eyebrow}</p> : null}
          </div>
          <nav className="flex flex-wrap items-center gap-3" aria-label="Primary">
            <Link className="nav-link" href="/intake">
              New project
            </Link>
            <Link className="nav-link" href="/demo">
              Demo
            </Link>
            <Link className="nav-link" href="/about">
              Methodology
            </Link>
            <A11yControls />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
