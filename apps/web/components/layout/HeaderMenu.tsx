"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Languages, Menu, SlidersHorizontal, X } from "lucide-react";
import { NAV } from "@/components/layout/nav";
import { useA11y } from "@/lib/a11y";
import { useCopy } from "@/lib/i18n/useCopy";

/**
 * Display options on desktop; navigation plus display options on mobile.
 * Closes on Escape, outside click, and navigation, and returns focus to the trigger.
 *
 * The three switches are independent: high contrast, reading level, and
 * language each persist separately and any combination is valid.
 */
export function HeaderMenu({ pathname }: { pathname: string }) {
  const { highContrast, plainLanguage, locale, setHighContrast, setPlainLanguage, toggleLocale } = useA11y();
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const items = wrapRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [];
    [...items].find((item) => item.offsetParent !== null)?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-secondary btn-sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden className="md:hidden" />}
        {open ? null : <SlidersHorizontal size={15} aria-hidden className="hidden md:block" />}
        <span className="md:hidden">{t("nav.menu")}</span>
        <span className="hidden md:inline">{t("nav.display")}</span>
      </button>
      {open ? (
        <div id={panelId} className="menu-panel">
          <ul className="mb-2 border-b border-[var(--line)] pb-2 md:hidden">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  data-menu-item
                  className="nav-link"
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="label px-2 pb-1">{t("nav.display")}</p>

          <button
            data-menu-item
            type="button"
            className="switch-row"
            aria-pressed={highContrast}
            onClick={() => setHighContrast(!highContrast)}
          >
            <span>
              {t("a11y.highContrast")}
              <span className="meta block">{t("a11y.highContrastHint")}</span>
            </span>
            <span className="switch" aria-hidden />
          </button>

          <button
            type="button"
            className="switch-row"
            aria-pressed={plainLanguage}
            onClick={() => setPlainLanguage(!plainLanguage)}
          >
            <span>
              {t("a11y.plainLanguage")}
              <span className="meta block">{t("a11y.plainLanguageHint")}</span>
            </span>
            <span className="switch" aria-hidden />
          </button>

          <button
            type="button"
            className="switch-row"
            aria-pressed={locale === "es"}
            lang={locale === "en" ? "es" : "en"}
            onClick={toggleLocale}
          >
            <span>
              <span className="inline-flex items-center gap-1.5">
                <Languages size={15} aria-hidden />
                {t("a11y.language")}
              </span>
              <span className="meta block" lang={locale}>
                {t("a11y.languageHint")}
              </span>
            </span>
            <span className="switch" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
