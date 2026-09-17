import { useEffect, useState } from 'react';

import beeStatic from '../../assets/bee-static-cutout.png';
import beeFlying from '../../assets/bee-flying-cutout.png';
import { type AvatarState } from '../../avatar/avatar';
import { useStrings } from '../../i18n/LocaleContext';
import './AvatarCharacter.css';

/**
 * The classic shipped mascot art (two raster poses). A flat image has no parts
 * to articulate, so this adds cheap life on top: a bob, a periodic "blink"
 * squash, a talk pulse driven by `mouthOpen`, and a thinking/error motion.
 * (For true wing/mouth animation, supply a layered Lottie/Rive — see the README.)
 */
export function MascotBee({ state, mouthOpen = 0 }: { state: AvatarState; mouthOpen?: number }) {
  const t = useStrings();
  const flying = state === 'thinking' || state === 'answering';
  const talk = Math.max(0, Math.min(1, mouthOpen));
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let alive = true;
    let closeTimer = 0;
    let nextTimer = 0;
    const schedule = () => {
      nextTimer = window.setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        closeTimer = window.setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          schedule();
        }, 150);
      }, 2600 + Math.random() * 3400);
    };
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(nextTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  return (
    <div className={`bee-char bee-char--${state}`} data-variant={state}>
      <div className="bee-char__inner" data-blink={blink ? 'true' : undefined}>
        <img
          className="bee-char__img"
          src={flying ? beeFlying : beeStatic}
          alt={t.avatarAlt}
          draggable={false}
          style={{
            transform: `scale(${1 + talk * 0.045}) rotate(${(talk - 0.5) * 2.5}deg)`,
          }}
        />
      </div>
    </div>
  );
}
