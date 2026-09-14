"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface A11yState {
  highContrast: boolean;
  plainLanguage: boolean;
  setHighContrast: (value: boolean) => void;
  setPlainLanguage: (value: boolean) => void;
}

const A11yContext = createContext<A11yState | null>(null);
const STORAGE_KEY = "permitpilot:a11y";

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [plainLanguage, setPlainLanguage] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { highContrast?: boolean; plainLanguage?: boolean };
        setHighContrast(Boolean(parsed.highContrast));
        setPlainLanguage(Boolean(parsed.plainLanguage));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ highContrast, plainLanguage }));
  }, [highContrast, plainLanguage, hydrated]);

  const value = useMemo(
    () => ({ highContrast, plainLanguage, setHighContrast, setPlainLanguage }),
    [highContrast, plainLanguage],
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
