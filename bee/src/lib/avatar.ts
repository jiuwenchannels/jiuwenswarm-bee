/** Avatar state machine for the bee. */
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

const LABELS: Record<AvatarState, string> = {
  idle: 'Buzz is ready',
  thinking: 'Buzz is thinking…',
  answering: 'Buzz is answering…',
  error: 'Buzz hit a problem',
};

export function avatarLabel(state: AvatarState): string {
  return LABELS[state];
}
