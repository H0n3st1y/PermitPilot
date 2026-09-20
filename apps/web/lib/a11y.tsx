"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { persistLocaleCookie } from "@/lib/i18n/localeCookie";
import { DEFAULT_LOCALE, isLocale, localeDir, type Locale } from "@/lib/i18n/types";

/**
 * Display preferences: high contrast, reading level, and interface language.
 *
 * These are presentation only. None of them is passed to the rules engine, so
 * no preference here can change which permits are required, what they depend
 * on, or which documents they need. The three are independent: any combination
 * is valid and each persists on its own.
 */
export interface A11yState {
  highContrast: boolean;
  plainLanguage: boolean;
  locale: Locale;
  setHighContrast: (value: boolean) => void;
  setPlainLanguage: (value: boolean) => void;
  setLocale: (value: Locale) => void;
}

const A11yContext = createContext<A11yState | null>(null);
const STORAGE_KEY = "permitpilot:a11y";

interface StoredPreferences {
  highContrast?: boolean;
  plainLanguage?: boolean;
  locale?: string;
}

export function A11yProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  localeCookieSet = false,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
  /** True when the root layout already read a valid locale cookie. */
  localeCookieSet?: boolean;
}) {
  const [highContrast, setHighContrast] = useState(false);
  const [plainLanguage, setPlainLanguage] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let stored: StoredPreferences | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as StoredPreferences;
    } catch {
      // A malformed preferences blob is not worth blocking the app over.
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage is unavailable (private mode); defaults apply.
      }
    }
    if (stored) {
      setHighContrast(Boolean(stored.highContrast));
      setPlainLanguage(Boolean(stored.plainLanguage));
      // Cookie already won the first paint. Only migrate locale from storage
      // when this visit had no cookie (pre-cookie clients, or a cleared jar).
      if (!localeCookieSet && isLocale(stored.locale)) setLocale(stored.locale);
    }
    setHydrated(true);
  }, [localeCookieSet]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("high-contrast", highContrast);
    root.dataset.plain = plainLanguage ? "true" : "false";
    // Screen readers and hyphenation need the document language to follow the UI.
    root.lang = locale;
    root.dir = localeDir(locale);
    persistLocaleCookie(locale);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ highContrast, plainLanguage, locale }));
    } catch {
      // Preferences simply do not persist when storage is unavailable.
    }
  }, [highContrast, plainLanguage, locale, hydrated]);

  const value = useMemo<A11yState>(
    () => ({
      highContrast,
      plainLanguage,
      locale,
      setHighContrast,
      setPlainLanguage,
      setLocale,
    }),
    [highContrast, plainLanguage, locale],
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
