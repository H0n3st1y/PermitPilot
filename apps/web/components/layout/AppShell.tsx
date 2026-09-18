"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoNotice } from "@/components/DemoNotice";
import { HeaderMenu } from "@/components/layout/HeaderMenu";
import { PlainLanguageIndicator } from "@/components/layout/PlainLanguageIndicator";
import { NAV } from "@/components/layout/nav";
import { useCopy } from "@/lib/i18n/useCopy";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useCopy();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        {t("app.skipToContent")}
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
          <nav aria-label={t("nav.primary")} className="flex items-center gap-4">
            <ul className="hidden items-center gap-5 md:flex">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    className="nav-link"
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
            <PlainLanguageIndicator />
            <HeaderMenu pathname={pathname} />
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="site-footer">
        <div className="container flex flex-col gap-1 sm:flex-row sm:justify-between">
          <p>{t("app.footerDisclaimer")}</p>
          <Link href="/about">{t("app.methodology")}</Link>
        </div>
      </footer>
    </div>
  );
}
