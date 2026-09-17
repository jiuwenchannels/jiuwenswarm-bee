import type { UserSettings } from '../settings/settings';
import { normalizeGatewayUrl } from '../settings/settings';

export type GatewayProtocol = 'product' | 'sdk';

export interface GatewayTarget {
  url: string;
  protocol: GatewayProtocol;
}

export interface AppConfig {
  /** Candidate gateways, tried in order. */
  targets: GatewayTarget[];
  token?: string;
  agentId: string;
  /** Product-gateway mode (e.g. "agent", "code.normal"). */
  mode: string;
  appTitle: string;
}

const env = import.meta.env;

function readEnv(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

// Use 127.0.0.1 (not "localhost"): the gateway binds IPv4 only, and browsers
// may resolve "localhost" to ::1 first, which fails.
// The product gateway (jiuwenswarm-start) serves the web protocol at
// :19000/ws. The SDK gateway (`python -m openjiuwen.gateway`) serves the
// envelope protocol at :19001/v1/ws (CLI default).
const DEFAULT_TARGETS: GatewayTarget[] = [
  { url: 'ws://127.0.0.1:19000/ws', protocol: 'product' },
  { url: 'ws://127.0.0.1:19001/v1/ws', protocol: 'sdk' },
  { url: 'ws://127.0.0.1:19000/v1/ws', protocol: 'sdk' },
];

const envExplicitUrl = readEnv(env.VITE_JIUWENSWARM_URL, '');
const envExplicitProtocol = env.VITE_GATEWAY_PROTOCOL;

function inferProtocol(url: string): GatewayProtocol {
  if (envExplicitProtocol === 'product' || envExplicitProtocol === 'sdk') {
    return envExplicitProtocol;
  }
  return url.includes('/v1/ws') ? 'sdk' : 'product';
}

/** Build the connection settings a fresh install should start from. */
export function envSettingsDefaults(): Omit<
  UserSettings,
  'theme' | 'avatarStyle' | 'voiceEnabled' | 'speechRate' | 'conciseReplies' | 'alwaysShowStarters'
> {
  return {
    gatewayUrl: envExplicitUrl,
    agentId: readEnv(env.VITE_AGENT_ID, 'researcher'),
    mode: readEnv(env.VITE_AGENT_MODE, 'agent'),
  };
}

/** Resolve the effective app config from env defaults plus the user's settings. */
export function resolveConfig(settings: UserSettings): AppConfig {
  const explicitUrl = normalizeGatewayUrl(settings.gatewayUrl);
  const targets: GatewayTarget[] = explicitUrl
    ? [{ url: explicitUrl, protocol: inferProtocol(explicitUrl) }]
    : DEFAULT_TARGETS;
  return {
    targets,
    token:
      typeof env.VITE_GATEWAY_TOKEN === 'string' && env.VITE_GATEWAY_TOKEN.length > 0
        ? env.VITE_GATEWAY_TOKEN
        : undefined,
    agentId: settings.agentId,
    mode: settings.mode,
    appTitle: readEnv(env.VITE_APP_TITLE, 'BeeChat'),
  };
}

/** Env-only config (used as the baseline for `envSettingsDefaults` and tests). */
export const config: AppConfig = resolveConfig({
  theme: 'system',
  avatarStyle: 'mascot',
  gatewayUrl: envExplicitUrl,
  agentId: readEnv(env.VITE_AGENT_ID, 'researcher'),
  mode: readEnv(env.VITE_AGENT_MODE, 'agent'),
  voiceEnabled: true,
  speechRate: 1,
  conciseReplies: true,
  alwaysShowStarters: false,
});
