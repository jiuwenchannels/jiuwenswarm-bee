/** Theme preference handling: `light`, `dark`, or follow the OS (`system`). */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#fdf8ea',
  dark: '#17161a',
};

export function normalizeTheme(value: unknown): ThemePreference | undefined {
  return value === 'light' || value === 'dark' || value === 'system' ? value : undefined;
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

/** Paint the resolved theme onto the document (tokens are keyed on `data-theme`). */
export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta instanceof HTMLMetaElement) meta.content = THEME_COLORS[theme];
}
