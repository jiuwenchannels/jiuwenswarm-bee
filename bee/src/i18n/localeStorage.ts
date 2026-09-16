import { normalizeLocale } from './index';
import type { Locale } from './types';

const STORAGE_KEY = 'beechat.locale';

/** The user's explicit language choice, or `null` if they never chose one. */
export function loadLocale(): Locale | null {
  try {
    return normalizeLocale(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}
