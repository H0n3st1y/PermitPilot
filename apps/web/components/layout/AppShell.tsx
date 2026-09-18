"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoNotice } from "@/components/DemoNotice";
import { HeaderMenu } from "@/components/layout/HeaderMenu";
import { NAV } from "@/components/layout/nav";


export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <DemoNotice />
      <header className="site-header">
        <div className="container site-header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>
              P
            </span>
            PermitPilot
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-4">
            <ul className="hidden items-center gap-5 md:flex">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link className="nav-link" href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <HeaderMenu pathname={pathname} />
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="site-footer">
        <div className="container flex flex-col gap-1 sm:flex-row sm:justify-between">
          <p>PermitPilot is a planning aid, not legal advice. Confirm requirements, fees, and dates with each department.</p>
          <Link href="/about">Methodology and limits</Link>
        </div>
      </footer>
    </div>
  );
}
