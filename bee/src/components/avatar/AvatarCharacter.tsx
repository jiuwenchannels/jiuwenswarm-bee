import beeStatic from '../../assets/bee-static.png';
import beeFlying from '../../assets/bee-flying.webp';
import { type AvatarState } from '../../avatar/avatar';
import { type AvatarStyle } from '../../avatar/avatarStyle';
import './AvatarCharacter.css';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** The shipped Jiuwen bee art. No mouth layer, so it "talks" with a pulse. */
function MascotBee({ state, mouthOpen = 0 }: { state: AvatarState; mouthOpen?: number }) {
  const flying = state === 'thinking' || state === 'answering';
  const talk = clamp01(mouthOpen);

  return (
    <div className={`bee-char bee-char--${state}`} data-variant={state}>
      <img
        className="bee-char__img"
        src={flying ? beeFlying : beeStatic}
        alt="Jiuwen bee"
        draggable={false}
        style={{
          transform: `scale(${1 + talk * 0.035}) rotate(${(talk - 0.5) * 2.5}deg)`,
        }}
      />
    </div>
  );
}

/** A vector bee with a real animated mouth (true mouth movement / lip-sync). */
function VectorBee({ state, mouthOpen = 0 }: { state: AvatarState; mouthOpen?: number }) {
  const talk = clamp01(mouthOpen);
  const mouthRx = 7 + talk * 3;
  const mouthRy = 1.8 + talk * 9;

  return (
    <svg className={`bee bee--${state}`} viewBox="0 0 200 200" role="img" aria-label={`Assistant bee (${state})`}>
      <defs>
        <clipPath id="bee-body-clip">
          <ellipse cx="100" cy="118" rx="52" ry="40" />
        </clipPath>
      </defs>

      <g className="bee__wings">
        <ellipse className="bee__wing bee__wing--left" cx="68" cy="80" rx="22" ry="28" />
        <ellipse className="bee__wing bee__wing--right" cx="132" cy="80" rx="22" ry="28" />
      </g>

      <ellipse className="bee__body" cx="100" cy="118" rx="52" ry="40" />
      <g clipPath="url(#bee-body-clip)">
        <rect className="bee__stripe" x="62" y="78" width="13" height="80" />
        <rect className="bee__stripe" x="94" y="78" width="13" height="80" />
        <rect className="bee__stripe" x="126" y="78" width="13" height="80" />
      </g>
      <path className="bee__stinger" d="M151 118 L170 126 L151 132 Z" />

      <path className="bee__antenna" d="M88 34 Q80 14 66 10" />
      <path className="bee__antenna" d="M112 34 Q120 14 134 10" />
      <circle className="bee__antenna-tip" cx="66" cy="10" r="4" />
      <circle className="bee__antenna-tip" cx="134" cy="10" r="4" />

      <circle className="bee__head" cx="100" cy="58" r="28" />

      <g className="bee__eyes">
        <ellipse className="bee__eye-white" cx="90" cy="56" rx="7.5" ry="8.5" />
        <circle className="bee__pupil" cx="90" cy="57" r="3.6" />
        <ellipse className="bee__eye-white" cx="110" cy="56" rx="7.5" ry="8.5" />
        <circle className="bee__pupil" cx="110" cy="57" r="3.6" />
      </g>

      <circle className="bee__cheek" cx="78" cy="68" r="4" />
      <circle className="bee__cheek" cx="122" cy="68" r="4" />

      <ellipse className="bee__mouth" cx="100" cy="72" rx={mouthRx} ry={mouthRy} />

      {state === 'thinking' ? (
        <g className="bee__think">
          <circle cx="156" cy="58" r="4.5" />
          <circle cx="170" cy="46" r="5.5" />
          <circle cx="185" cy="32" r="6.5" />
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The assistant avatar. `style` selects the rendering:
 *   - `mascot` (default): the Jiuwen bee art.
 *   - `vector`: a vector bee whose mouth actually opens/closes.
 *
 * Both accept the same `state` / `mouthOpen`, so chat and voice are agnostic.
 */
export function AvatarCharacter({
  state,
  mouthOpen = 0,
  style = 'mascot',
}: {
  state: AvatarState;
  mouthOpen?: number;
  style?: AvatarStyle;
}) {
  return style === 'vector' ? (
    <VectorBee state={state} mouthOpen={mouthOpen} />
  ) : (
    <MascotBee state={state} mouthOpen={mouthOpen} />
  );
}
