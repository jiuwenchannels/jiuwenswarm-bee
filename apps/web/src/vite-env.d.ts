/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JIUWENSWARM_URL?: string;
  readonly VITE_GATEWAY_PROTOCOL?: string;
  readonly VITE_GATEWAY_TOKEN?: string;
  readonly VITE_AGENT_ID?: string;
  readonly VITE_AGENT_MODE?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_LOCALE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Build timestamp injected by vite.config.ts, shown in Settings. */
declare const __BUILD_ID__: string;
