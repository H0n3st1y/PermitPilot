"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import { useCopy } from "@/lib/i18n/useCopy";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/types";

/**
 * Language menu for the eight interface locales.
 *
 * Names are always shown in their own script so a reader can find their
 * language even when the rest of the UI is not in it. Choosing a language
 * never reaches the rules engine.
 */
export function LanguageToggle({ variant = "chip" }: { variant?: "chip" | "row" }) {
  const { locale, setLocale } = useA11y();
  const { t } = useCopy();

  if (variant === "row") {
    return (
      <div className="locale-list" role="listbox" aria-label={t("a11y.languageSwitch")}>
        <p className="label px-2 pb-1">{t("a11y.language")}</p>
        <p className="meta px-2 pb-2">{t("a11y.languageHint")}</p>
        {LOCALES.map((code) => (
          <LanguageOption key={code} code={code} current={locale} onSelect={setLocale} />
        ))}
      </div>
    );
  }

  return <LanguageMenu locale={locale} setLocale={setLocale} label={t("a11y.languageSwitch")} hint={t("a11y.languageHint")} />;
}

function LanguageMenu({
  locale,
  setLocale,
  label,
  hint,
}: {
  locale: Locale;
  setLocale: (value: Locale) => void;
  label: string;
  hint: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    wrapRef.current?.querySelector<HTMLElement>("[aria-selected='true']")?.focus();
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
        className="locale-switch"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="listbox"
        aria-label={label}
        title={hint}
        onClick={() => setOpen((value) => !value)}
      >
        <Languages size={14} aria-hidden />
        <span lang={locale}>{LOCALE_META[locale].native}</span>
      </button>
      {open ? (
        <div id={panelId} className="locale-menu" role="listbox" aria-label={label}>
          {LOCALES.map((code) => (
            <LanguageOption
              key={code}
              code={code}
              current={locale}
              onSelect={(value) => {
                setLocale(value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LanguageOption({
  code,
  current,
  onSelect,
}: {
  code: Locale;
  current: Locale;
  onSelect: (value: Locale) => void;
}) {
  const selected = code === current;
  const meta = LOCALE_META[code];
  return (
    <button
      type="button"
      role="option"
      className="locale-option"
      lang={code}
      aria-selected={selected}
      onClick={() => onSelect(code)}
    >
      <span className="locale-option-native">{meta.native}</span>
      {meta.english !== meta.native ? <span className="meta">{meta.english}</span> : null}
      {selected ? <Check size={14} aria-hidden className="locale-option-check" /> : null}
    </button>
  );
}
