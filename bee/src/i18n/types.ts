import type { AvatarState } from '../avatar/avatar';
import type { AvatarStyle } from '../avatar/avatarStyle';
import type { GatewayStatus } from '../gateway/protocol';

export type Locale = 'en' | 'zh';

/**
 * Every user-facing string, per locale. The character's name is part of the
 * pack: English gets "Buzz", Chinese gets "嗡嗡" (see internal/naming.md).
 */
export interface Strings {
  /** Mascot name for this locale. */
  character: string;
  /** Small attribution line under the app title. */
  poweredBy: string;
  /** Credit link phrase shown beneath `poweredBy`. */
  attribution: string;
  /** Greeting shown in the empty conversation state (two lines at "\n"). */
  hello: string;
  /** Short brand line, used for the avatar tooltip and sidebar footer. */
  tagline: string;
  status: Record<GatewayStatus, string>;
  avatar: Record<AvatarState, string>;
  /** Alt text for the mascot image. */
  avatarAlt: string;
  /** Accessible label for the vector bee, including its state. */
  avatarLabelFor: (state: AvatarState) => string;
  /** Suggested first prompts on the empty screen. */
  starters: string[];
  composer: {
    placeholder: string;
    send: string;
    stop: string;
    ariaLabel: string;
    hint: string;
    dictateStart: string;
    dictateStop: string;
  };
  actions: {
    newChat: string;
    tryAgain: string;
    reconnect: string;
    latest: string;
    copy: string;
    copied: string;
    copyText: string;
    copyCode: string;
    stop: string;
    stopped: string;
    save: string;
    delete: string;
    rename: string;
    search: string;
    close: string;
    quit: string;
    more: string;
    undo: string;
    showMore: string;
    showLess: string;
    configure: string;
    speak: string;
    stopSpeaking: string;
  };
  offline: (url: string) => string;
  voice: {
    pushToTalk: string;
    listening: string;
    transcribing: string;
    unavailable: string;
  };
  style: Record<AvatarStyle, string>;
  theme: {
    label: string;
    light: string;
    dark: string;
    system: string;
  };
  history: {
    title: string;
    searchPlaceholder: string;
    empty: string;
    deleteConfirm: string;
    deleted: string;
    you: string;
    exported: string;
    today: string;
    previous7: string;
    older: string;
  };
  settings: {
    title: string;
    appearance: string;
    assistant: string;
    connection: string;
    advanced: string;
    theme: string;
    language: string;
    avatar: string;
    voice: string;
    voiceHint: string;
    concise: string;
    conciseHint: string;
    gatewayUrl: string;
    gatewayPlaceholder: string;
    gatewayHint: string;
    agentId: string;
    agentHint: string;
    mode: string;
    modeHint: string;
    reset: string;
    close: string;
  };
  command: {
    title: string;
    placeholder: string;
    newChat: string;
    toggleTheme: string;
    openSettings: string;
    focusComposer: string;
    export: string;
    find: string;
    noResults: string;
  };
  find: {
    placeholder: string;
    none: string;
    next: string;
    previous: string;
  };
  proactive: {
    reconnected: string;
  };
}
