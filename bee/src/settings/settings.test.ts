import { describe, expect, it } from 'vitest';

import {
  type UserSettings,
  normalizeGatewayUrl,
  sanitizeSettings,
} from './settings';

const DEFAULTS: UserSettings = {
  theme: 'system',
  gatewayUrl: '',
  agentId: 'researcher',
  mode: 'agent',
  voiceEnabled: true,
};

describe('settings', () => {
  it('returns defaults for junk input', () => {
    expect(sanitizeSettings(null, DEFAULTS)).toEqual(DEFAULTS);
    expect(sanitizeSettings('nope', DEFAULTS)).toEqual(DEFAULTS);
  });

  it('keeps valid values and ignores invalid ones', () => {
    const settings = sanitizeSettings(
      { theme: 'dark', gatewayUrl: '  ws://x  ', agentId: '', mode: 'code.normal', voiceEnabled: false },
      DEFAULTS,
    );
    expect(settings.theme).toBe('dark');
    expect(settings.gatewayUrl).toBe('ws://x');
    expect(settings.agentId).toBe('researcher');
    expect(settings.mode).toBe('code.normal');
    expect(settings.voiceEnabled).toBe(false);
  });

  it('rejects an unknown theme', () => {
    expect(sanitizeSettings({ theme: 'neon' }, DEFAULTS).theme).toBe('system');
  });

  it('normalizes gateway URLs written as hosts or http(s)', () => {
    expect(normalizeGatewayUrl('')).toBe('');
    expect(normalizeGatewayUrl('192.168.1.5:19000/ws')).toBe('ws://192.168.1.5:19000/ws');
    expect(normalizeGatewayUrl('http://host:19000/ws')).toBe('ws://host:19000/ws');
    expect(normalizeGatewayUrl('https://host:19000/ws')).toBe('wss://host:19000/ws');
    expect(normalizeGatewayUrl('wss://host/ws')).toBe('wss://host/ws');
  });
});
