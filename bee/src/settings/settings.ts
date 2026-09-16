import { normalizeTheme, type ThemePreference } from '../theme/theme';

/** User-tunable, locally persisted settings (never sent to the gateway). */
export interface UserSettings {
  /** Theme preference; `system` follows the OS. */
  theme: ThemePreference;
  /** Explicit gateway URL; empty means "try the built-in target list". */
  gatewayUrl: string;
  /** Agent id used by the SDK gateway's `create_session`. */
  agentId: string;
  /** Product-gateway mode sent with `chat.send`. */
  mode: string;
  /** Speak assistant replies when the platform supports it. */
  voiceEnabled: boolean;
}

const STORAGE_KEY = 'beechat.settings.v1';

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** Coerce an unknown (possibly stored or partial) object into valid settings. */
export function sanitizeSettings(raw: unknown, defaults: UserSettings): UserSettings {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    theme: normalizeTheme(source.theme) ?? defaults.theme,
    gatewayUrl: readString(source.gatewayUrl, defaults.gatewayUrl).trim(),
    agentId: readString(source.agentId, defaults.agentId).trim() || defaults.agentId,
    mode: readString(source.mode, defaults.mode).trim() || defaults.mode,
    voiceEnabled:
      typeof source.voiceEnabled === 'boolean' ? source.voiceEnabled : defaults.voiceEnabled,
  };
}

export function loadSettings(defaults: UserSettings): UserSettings {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'), defaults);
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/** Turn a bare host/port into a WebSocket URL so the settings field is forgiving. */
export function normalizeGatewayUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^wss?:\/\//i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/^http/i, 'ws');
  return `ws://${trimmed}`;
}
