import { describe, expect, it } from 'vitest';

import { en } from './en';
import { zh } from './zh';
import { normalizeLocale } from './index';
import { loadLocale, saveLocale } from './localeStorage';

/** All leaf paths, so `offline` (a function) counts as a leaf. */
function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('i18n', () => {
  it('localizes the character name', () => {
    expect(en.character).toBe('Buzz');
    expect(zh.character).toBe('嗡嗡');
  });

  it('keeps the en and zh packs in sync', () => {
    expect(leafKeys(zh).sort()).toEqual(leafKeys(en).sort());
  });

  it('maps language tags to supported locales', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh');
    expect(normalizeLocale('zh')).toBe('zh');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBeUndefined();
    expect(normalizeLocale(undefined)).toBeUndefined();
  });

  it('persists the chosen locale', () => {
    expect(loadLocale()).toBeNull();
    saveLocale('zh');
    expect(loadLocale()).toBe('zh');
    saveLocale('en');
    expect(loadLocale()).toBe('en');
  });
});
