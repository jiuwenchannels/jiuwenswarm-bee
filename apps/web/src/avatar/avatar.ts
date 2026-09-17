/**
 * Avatar state machine for the bee. In the hive vocabulary (internal/naming.md),
 * `thinking` is the bee's "waggle": dancing while it works. Labels live in
 * `src/i18n` so the character name can localize.
 */
export type AvatarState = 'idle' | 'thinking' | 'answering' | 'error';

export type AvatarEvent = 'send' | 'first-token' | 'done' | 'error' | 'reset';

export function nextAvatarState(state: AvatarState, event: AvatarEvent): AvatarState {
  switch (event) {
    case 'send':
      return 'thinking';
    case 'first-token':
      return state === 'thinking' ? 'answering' : state;
    case 'done':
      return 'idle';
    case 'error':
      return 'error';
    case 'reset':
      return 'idle';
    default:
      return state;
  }
}
