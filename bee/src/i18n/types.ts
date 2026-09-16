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
  hello: string;
  status: Record<GatewayStatus, string>;
  avatar: Record<AvatarState, string>;
  /** Alt text for the mascot image. */
  avatarAlt: string;
  /** Accessible label for the vector bee, including its state. */
  avatarLabelFor: (state: AvatarState) => string;
  composer: {
    placeholder: string;
    send: string;
    ariaLabel: string;
    dictateStart: string;
    dictateStop: string;
  };
  actions: {
    newChat: string;
    tryAgain: string;
    reconnect: string;
    latest: string;
  };
  offline: (url: string) => string;
  voice: {
    on: string;
    off: string;
  };
  style: Record<AvatarStyle, string>;
}
