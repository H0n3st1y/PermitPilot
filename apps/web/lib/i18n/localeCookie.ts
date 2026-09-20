import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/types";

/** Readable by the root layout so the first HTML paint can match the UI language. */
export const LOCALE_COOKIE = "permitpilot-locale";
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function persistLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_MAX_AGE}; SameSite=Lax`;
}
