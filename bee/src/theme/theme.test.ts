import { afterEach, describe, expect, it } from 'vitest';

import { applyTheme, normalizeTheme, resolveTheme } from './theme';

describe('theme', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('normalizes known preferences', () => {
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('system')).toBe('system');
    expect(normalizeTheme('neon')).toBeUndefined();
    expect(normalizeTheme(undefined)).toBeUndefined();
  });

  it('resolves system against the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('writes the resolved theme onto the document', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
