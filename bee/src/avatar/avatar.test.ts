import { describe, expect, it } from 'vitest';

import { nextAvatarState } from './avatar';

describe('avatar state machine', () => {
  it('goes idle -> thinking on send', () => {
    expect(nextAvatarState('idle', 'send')).toBe('thinking');
  });

  it('goes thinking -> answering on first token', () => {
    expect(nextAvatarState('thinking', 'first-token')).toBe('answering');
  });

  it('ignores first-token when not thinking', () => {
    expect(nextAvatarState('idle', 'first-token')).toBe('idle');
    expect(nextAvatarState('answering', 'first-token')).toBe('answering');
  });

  it('returns to idle on done and flags error', () => {
    expect(nextAvatarState('answering', 'done')).toBe('idle');
    expect(nextAvatarState('thinking', 'error')).toBe('error');
    expect(nextAvatarState('error', 'reset')).toBe('idle');
  });
});
