/* eslint-disable react-refresh/only-export-components -- context module exports the provider and its hooks together */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { type AppConfig, envSettingsDefaults, resolveConfig } from '../gateway/config';
import { setSpeechRate } from '../platform/speakerStore';
import { applyTheme, resolveTheme, systemPrefersDark, type ResolvedTheme } from '../theme/theme';
import { type UserSettings, loadSettings, saveSettings } from './settings';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  avatarStyle: 'mascot',
  voiceEnabled: true,
  speechRate: 1,
  conciseReplies: true,
  alwaysShowStarters: false,
  ...envSettingsDefaults(),
};

export interface SettingsContextValue {
  settings: UserSettings;
  config: AppConfig;
  /** The concrete theme after resolving `system` against the OS. */
  resolvedTheme: ResolvedTheme;
  update: (patch: Partial<UserSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  config: resolveConfig(DEFAULT_SETTINGS),
  resolvedTheme: 'light',
  update: () => {},
  reset: () => {},
});

function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings(DEFAULT_SETTINGS));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  const update = useCallback((patch: Partial<UserSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const resolvedTheme = resolveTheme(settings.theme, systemDark);

  // Paint the theme before the browser relayouts, and follow the OS when on `system`.
  useLayoutEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Keep the shared read-aloud speaker at the user's chosen speed.
  useLayoutEffect(() => {
    setSpeechRate(settings.speechRate);
  }, [settings.speechRate]);

  useLayoutEffect(() => {
    if (settings.theme !== 'system') return () => {};
    return subscribeToSystemTheme(() => setSystemDark(systemPrefersDark()));
  }, [settings.theme]);

  // Config identity only changes when a *connection* setting changes, so a theme
  // or voice change never tears down and rebuilds the gateway socket.
  const { gatewayUrl, agentId, mode } = settings;
  const config = useMemo(
    () =>
      resolveConfig({
        theme: 'system',
        avatarStyle: 'mascot',
        voiceEnabled: true,
        speechRate: 1,
        conciseReplies: true,
        alwaysShowStarters: false,
        gatewayUrl,
        agentId,
        mode,
      }),
    [gatewayUrl, agentId, mode],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, config, resolvedTheme, update, reset }),
    [settings, config, resolvedTheme, update, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}

/** The resolved gateway/app config for the current settings. */
export function useAppConfig(): AppConfig {
  return useContext(SettingsContext).config;
}

/** The concrete theme after resolving `system`. */
export function useResolvedTheme(): ResolvedTheme {
  return useContext(SettingsContext).resolvedTheme;
}
