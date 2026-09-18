"use client";

import { useCallback, useMemo } from "react";
import { useA11y } from "@/lib/a11y";
import { PHRASES, type PhraseKey } from "@/lib/i18n/phrases";
import {
  resolveCopy,
  type Copy,
  type CopyOptions,
  type CopyVars,
  type Locale,
  type Phrase,
} from "@/lib/i18n/types";

export interface CopyApi extends CopyOptions {
  /** Resolves a chrome phrase for the active locale and reading level. */
  t: (key: PhraseKey, vars?: CopyVars) => string;
  /**
   * Resolves an ad-hoc phrase that lives next to its data rather than in the
   * dictionary, such as a bottleneck message carried on a domain object.
   */
  copy: (phrase: Phrase, vars?: CopyVars) => string;
  /**
   * Picks between two pre-written strings from a fixture. Used where content
   * already ships both reading levels (step descriptions, bottleneck messages)
   * and there is no translation, so the standard wording stands in for Spanish.
   */
  reading: (standard: string, plain: string) => string;
  locale: Locale;
}

/**
 * The one hook components use for interface wording.
 *
 * It reads display preferences and returns strings. It has no access to project
 * state and is never consulted by the rules engine, which keeps localization
 * strictly downstream of permit decisions.
 */
export function useCopy(): CopyApi {
  const { locale, plainLanguage } = useA11y();

  const options = useMemo<CopyOptions>(() => ({ locale, plainLanguage }), [locale, plainLanguage]);

  const t = useCallback(
    (key: PhraseKey, vars?: CopyVars) => resolveCopy(PHRASES[key], options, vars),
    [options],
  );

  const copy = useCallback((phrase: Phrase, vars?: CopyVars) => resolveCopy(phrase, options, vars), [options]);

  const reading = useCallback(
    (standard: string, plain: string) => (plainLanguage ? plain : standard),
    [plainLanguage],
  );

  return { t, copy, reading, locale, plainLanguage };
}

/** Builds a single-locale phrase from a fixture pair, for `copy()`. */
export function phraseFromPair(standard: string, plain: string): Phrase {
  const value: Copy = { standard, plain };
  return { en: value, es: value };
}
