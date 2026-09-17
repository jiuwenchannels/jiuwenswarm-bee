import beeStatic from '../../assets/bee-static.png';
import beeFlying from '../../assets/bee-flying.webp';
import { type AvatarState } from '../../avatar/avatar';
import { useStrings } from '../../i18n/LocaleContext';

/**
 * The classic shipped mascot art (two raster poses). Kept as an optional style;
 * it is lazily loaded so its large assets stay out of the main bundle.
 */
export function MascotBee({ state, mouthOpen = 0 }: { state: AvatarState; mouthOpen?: number }) {
  const t = useStrings();
  const flying = state === 'thinking' || state === 'answering';
  const talk = Math.max(0, Math.min(1, mouthOpen));

  return (
    <div className={`bee-char bee-char--${state}`} data-variant={state}>
      <img
        className="bee-char__img"
        src={flying ? beeFlying : beeStatic}
        alt={t.avatarAlt}
        draggable={false}
        style={{
          transform: `scale(${1 + talk * 0.035}) rotate(${(talk - 0.5) * 2.5}deg)`,
        }}
      />
    </div>
  );
}
