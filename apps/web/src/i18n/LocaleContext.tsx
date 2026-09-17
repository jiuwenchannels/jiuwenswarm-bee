/* eslint-disable react-refresh/only-export-components -- context module exports the provider and its hooks together */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { LOCALIZED, detectLocale, htmlLangFor } from './index';
import { loadLocale, saveLocale } from './localeStorage';
import type { Locale, Strings } from './types';

export interface LocaleContextValue {
  locale: Locale;
  strings: Strings;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  strings: LOCALIZED.en,
  setLocale: () => {},
  toggleLocale: () => {},
});

/**
 * Holds the active UI language so it can be switched in the GUI at runtime.
 * The choice is persisted and wins over `VITE_LOCALE` / browser detection.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => loadLocale() ?? detectLocale());

  const value = useMemo<LocaleContextValue>(() => {
    const setLocale = (next: Locale) => {
      saveLocale(next);
      setLocaleState(next);
    };
    return {
      locale,
      strings: LOCALIZED[locale],
      setLocale,
      toggleLocale: () => setLocale(locale === 'zh' ? 'en' : 'zh'),
    };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = htmlLangFor(locale);
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** The active language pack. Re-renders when the language changes. */
export function useStrings(): Strings {
  return useContext(LocaleContext).strings;
}
