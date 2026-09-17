import { en } from './en';
import { zh } from './zh';
import type { Locale, Strings } from './types';

export type { Locale, Strings } from './types';

export const LOCALIZED: Record<Locale, Strings> = { en, zh };
export const DEFAULT_LOCALE: Locale = 'en';

/** Map a language tag (e.g. `zh-CN`, `en-GB`) to a supported locale. */
export function normalizeLocale(value: string | undefined | null): Locale | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('en')) return 'en';
  return undefined;
}

/**
 * Initial locale: `VITE_LOCALE` wins, otherwise the browser language, otherwise
 * English. The user can override this at runtime from the GUI (persisted).
 */
export function detectLocale(): Locale {
  const fromEnv = normalizeLocale(import.meta.env.VITE_LOCALE);
  if (fromEnv) return fromEnv;
  const navigatorLanguage = typeof navigator !== 'undefined' ? navigator.language : undefined;
  return normalizeLocale(navigatorLanguage) ?? DEFAULT_LOCALE;
}

/** BCP-47 tag for `<html lang>`. */
export function htmlLangFor(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en';
}
