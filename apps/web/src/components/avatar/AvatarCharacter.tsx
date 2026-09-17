import { lazy, Suspense } from 'react';

import { type AvatarState } from '../../avatar/avatar';
import { type AvatarStyle } from '../../avatar/avatarStyle';
import { RiggedBee } from './RiggedBee';
import './AvatarCharacter.css';

// The classic raster mascot ships its own (large) assets; load it on demand only.
const MascotBee = lazy(() =>
  import('./MascotBee').then((module) => ({ default: module.MascotBee })),
);

/**
 * The assistant character. `style` selects the rendering:
 *   - `rigged` (default): the 2026 code-authored bee — animated parts, gaze, blink.
 *   - `mascot`: the classic shipped art (lazy-loaded).
 *
 * Both accept the same `state` / `mouthOpen`, so chat and voice stay agnostic.
 */
export function AvatarCharacter({
  state,
  mouthOpen = 0,
  style = 'rigged',
}: {
  state: AvatarState;
  mouthOpen?: number;
  style?: AvatarStyle;
}) {
  if (style === 'mascot') {
    return (
      <Suspense
        fallback={
          <div className={`bee-char bee-char--${state}`} data-variant={state} aria-hidden="true" />
        }
      >
        <MascotBee state={state} mouthOpen={mouthOpen} />
      </Suspense>
    );
  }
  return <RiggedBee state={state} mouthOpen={mouthOpen} />;
}
