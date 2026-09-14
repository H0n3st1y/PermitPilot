"use client";

import { Accessibility, Contrast, Languages } from "lucide-react";
import { useA11y } from "@/lib/a11y";

export function A11yControls() {
  const { highContrast, plainLanguage, setHighContrast, setPlainLanguage } = useA11y();

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Accessibility options">
      <button
        type="button"
        className="a11y-toggle"
        aria-pressed={highContrast}
        onClick={() => setHighContrast(!highContrast)}
      >
        <Contrast size={16} aria-hidden />
        High contrast
      </button>
      <button
        type="button"
        className="a11y-toggle"
        aria-pressed={plainLanguage}
        onClick={() => setPlainLanguage(!plainLanguage)}
      >
        <Languages size={16} aria-hidden />
        Plain English
      </button>
      <span className="sr-only">
        <Accessibility size={16} />
        These controls change display only. They do not change your permit roadmap.
      </span>
    </div>
  );
}
