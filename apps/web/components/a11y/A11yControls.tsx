"use client";

import { Accessibility, Contrast, Languages } from "lucide-react";
import { useA11y } from "@/lib/a11y";

export function A11yControls() {
  const { highContrast, plainLanguage, locale, setHighContrast, setPlainLanguage, setLocale, t } = useA11y();

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("a11y.group")}>
      <button
        type="button"
        className="a11y-toggle"
        aria-pressed={highContrast}
        onClick={() => setHighContrast(!highContrast)}
      >
        <Contrast size={16} aria-hidden />
        {t("a11y.highContrast")}
      </button>
      <button
        type="button"
        className="a11y-toggle"
        aria-pressed={plainLanguage}
        onClick={() => setPlainLanguage(!plainLanguage)}
      >
        <Languages size={16} aria-hidden />
        {t("a11y.plainEnglish")}
      </button>
      <button
        type="button"
        className="a11y-toggle"
        aria-pressed={locale === "es"}
        lang={locale === "es" ? "en" : "es"}
        onClick={() => setLocale(locale === "es" ? "en" : "es")}
      >
        {t("a11y.spanish")}
      </button>
      <span className="sr-only">{t("a11y.note")}</span>
      <span className="sr-only">
        <Accessibility size={16} />
      </span>
    </div>
  );
}
