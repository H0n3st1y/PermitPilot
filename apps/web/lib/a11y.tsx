"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isLocale, LOCALE_META, translate, type Locale } from "@/lib/i18n";

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

// wrap the app so contrast, plain english, and language are shared
export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [plainLanguage, setPlainLanguage] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [hydrated, setHydrated] = useState(false);

  // read the saved settings once on mount
  useEffect(() => {
    try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // only apply a saved blob if one is there
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          highContrast?: boolean;
          plainLanguage?: boolean;
          locale?: unknown;
        };
        setHighContrast(Boolean(parsed.highContrast));
        setPlainLanguage(Boolean(parsed.plainLanguage));
        // language has to be one we support
        if (isLocale(parsed.locale)) setLocale(parsed.locale);
      } catch {
        // saved blob was junk, drop it
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    } catch { /* Preferences still work when browser storage is unavailable. */ }
    setHydrated(true);
  }, []);

  // push the toggles onto the page, then save them
  useEffect(() => {
    // don't write settings before we've read them
    if (!hydrated) return;
    document.documentElement.classList.toggle("high-contrast", highContrast);
    document.documentElement.dataset.plain = plainLanguage ? "true" : "false";
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_META[locale].dir;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ highContrast, plainLanguage, locale })); }
    catch { /* Keep this session usable without persistent preferences. */ }
  }, [highContrast, plainLanguage, locale, hydrated]);

  // translator bound to the current language
  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => translate(locale, path, vars),
    [locale],
  );

  // bundle the settings so consumers don't rerender for unrelated reasons
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

// read the accessibility settings, or throw if the provider is missing
export function useA11y(): A11yState {
  const context = useContext(A11yContext);
  // this hook only works under the provider
  if (!context) {
    throw new Error("useA11y must be used within A11yProvider");
  }
  return context;
}
