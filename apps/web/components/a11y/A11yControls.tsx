"use client";

// 8 langs in a little dropdown up in the header
import { useEffect, useId, useRef, useState } from "react";
import { Check, Contrast, Languages } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n";

export function A11yControls() {
  const { highContrast, plainLanguage, locale, setHighContrast, setPlainLanguage, setLocale, t } =
    useA11y();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
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

  function pickLang(code: Locale) {
    setLocale(code);
    setOpen(false);
    triggerRef.current?.focus();
  }

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
      <div className="relative" ref={wrapRef} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}>
        <button
          ref={triggerRef}
          type="button"
          className="locale-switch"
          aria-expanded={open}
          aria-controls={panelId}
          aria-haspopup="listbox"
          aria-label={t("a11y.languageSwitch")}
          title={t("a11y.languageHint")}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}
        >
          <Languages size={14} aria-hidden />
          <span lang={locale}>{LOCALE_META[locale].native}</span>
        </button>
        {open ? (
          <div ref={menuRef} id={panelId} className="locale-menu" role="listbox" aria-label={t("a11y.languageSwitch")}
            onKeyDown={(event) => {
              const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
              const current = options.indexOf(document.activeElement as HTMLButtonElement);
              let next = current;
              if (event.key === "ArrowDown") next = (current + 1) % options.length;
              else if (event.key === "ArrowUp") next = (current - 1 + options.length) % options.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = options.length - 1;
              else return;
              event.preventDefault(); options[next]?.focus();
            }}>
            {LOCALES.map((code) => {
              const selected = code === locale;
              const meta = LOCALE_META[code];
              return (
                <button
                  key={code}
                  type="button"
                  role="option"
                  className="locale-option"
                  lang={code}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => pickLang(code)}
                >
                  <span className="locale-option-native">{meta.native}</span>
                  {meta.english !== meta.native ? <span className="locale-option-en">{meta.english}</span> : null}
                  {selected ? <Check size={14} aria-hidden className="locale-option-check" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <span className="sr-only">{t("a11y.note")}</span>
    </div>
  );
}
