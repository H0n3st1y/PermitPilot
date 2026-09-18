"use client";

import { BookOpen } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import { useCopy } from "@/lib/i18n/useCopy";

/**
 * Subtle marker that simplified wording is active.
 *
 * It matters that the reader knows they are seeing a paraphrase: the plain
 * variant preserves the legal meaning, but a permit office will use the
 * standard wording. Clicking turns the mode back off.
 */
export function PlainLanguageIndicator() {
  const { plainLanguage, setPlainLanguage } = useA11y();
  const { t } = useCopy();
  if (!plainLanguage) return null;
  return (
    <button
      type="button"
      className="plain-flag"
      title={t("a11y.plainIndicatorTitle")}
      onClick={() => setPlainLanguage(false)}
    >
      <BookOpen size={13} aria-hidden />
      <span>{t("a11y.plainIndicator")}</span>
    </button>
  );
}
