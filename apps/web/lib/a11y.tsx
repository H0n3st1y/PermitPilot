"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translate, type Locale } from "@/lib/i18n";

export interface A11yState {
  highContrast: boolean;
  plainLanguage: boolean;
  locale: Locale;
  setHighContrast: (value: boolean) => void;
  setPlainLanguage: (value: boolean) => void;
  setLocale: (value: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const A11yContext = createContext<A11yState | null>(null);
// remember contrast / plain english / language
const STORAGE_KEY = "permitpilot:a11y";

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "es";
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [plainLanguage, setPlainLanguage] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          highContrast?: boolean;
          plainLanguage?: boolean;
          locale?: unknown;
        };
        setHighContrast(Boolean(parsed.highContrast));
        setPlainLanguage(Boolean(parsed.plainLanguage));
        if (isLocale(parsed.locale)) setLocale(parsed.locale);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("high-contrast", highContrast);
    document.documentElement.dataset.plain = plainLanguage ? "true" : "false";
    document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ highContrast, plainLanguage, locale }));
  }, [highContrast, plainLanguage, locale, hydrated]);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => translate(locale, path, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      highContrast,
      plainLanguage,
      locale,
      setHighContrast,
      setPlainLanguage,
      setLocale,
      t,
    }),
    [highContrast, plainLanguage, locale, t],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y(): A11yState {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error("useA11y must be used within A11yProvider");
  }
  return context;
}
