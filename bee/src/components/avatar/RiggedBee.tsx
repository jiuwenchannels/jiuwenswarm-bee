import { useEffect, useRef, useState } from 'react';

import { type AvatarState } from '../../avatar/avatar';
import { useStrings } from '../../i18n/LocaleContext';
import './RiggedBee.css';

/**
 * The 2026 rigged bee: a code-authored SVG character with independent parts
 * (wings, antennae, eyes, mouth). It breathes, blinks, flaps by state, and its
 * pupils follow the pointer without re-rendering React (gaze is pushed through
 * CSS custom properties).
 */
export function RiggedBee({
  state,
  mouthOpen = 0,
}: {
  state: AvatarState;
  mouthOpen?: number;
}) {
  const t = useStrings();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [blink, setBlink] = useState(false);

  // Blink on a human-ish, irregular cadence.
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
        }, 110);
      }, 2000 + Math.random() * 3600);
    };
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(nextTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  // Gaze: follow the pointer by writing CSS vars (no React re-render).
  useEffect(() => {
    const node = svgRef.current;
    if (!node || typeof window === 'undefined') return;
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      node.style.setProperty('--gaze-x', x.toFixed(2));
      node.style.setProperty('--gaze-y', y.toFixed(2));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const talk = Math.max(0, Math.min(1, mouthOpen));
  const mouthRx = 6 + talk * 4.5;
  const mouthRy = 1.6 + talk * 9.5;
  const eyeRy = blink ? 1 : 9;

  return (
    <svg
      ref={svgRef}
      className={`rbe rbe--${state}`}
      viewBox="0 0 200 200"
      role="img"
      aria-label={t.avatarLabelFor(state)}
      data-variant={state}
    >
      <g className="rbe__antennae">
        <path className="rbe__antenna" d="M90 36 Q82 12 66 8" />
        <path className="rbe__antenna" d="M110 36 Q118 12 134 8" />
        <circle className="rbe__antenna-tip" cx="66" cy="8" r="4.2" />
        <circle className="rbe__antenna-tip" cx="134" cy="8" r="4.2" />
      </g>

      <g className="rbe__wings">
        <ellipse className="rbe__wing rbe__wing--left" cx="66" cy="82" rx="24" ry="30" />
        <ellipse className="rbe__wing rbe__wing--right" cx="134" cy="82" rx="24" ry="30" />
      </g>

      <ellipse className="rbe__body" cx="100" cy="120" rx="54" ry="42" />
      <g clipPath="url(#rbe-body-clip)">
        <rect className="rbe__stripe" x="60" y="78" width="14" height="84" />
        <rect className="rbe__stripe" x="93" y="78" width="14" height="84" />
        <rect className="rbe__stripe" x="126" y="78" width="14" height="84" />
      </g>
      <path className="rbe__stinger" d="M153 120 L173 128 L153 135 Z" />
      <clipPath id="rbe-body-clip">
        <ellipse cx="100" cy="120" rx="54" ry="42" />
      </clipPath>

      <circle className="rbe__head" cx="100" cy="60" r="30" />

      <g className="rbe__face">
        <ellipse className="rbe__eye" cx="89" cy="57" rx="8" ry={eyeRy} />
        <ellipse className="rbe__eye" cx="111" cy="57" rx="8" ry={eyeRy} />
        <g className="rbe__pupils" style={{ opacity: blink ? 0 : 1 }}>
          <circle className="rbe__pupil" cx="89" cy="58" r="3.8" />
          <circle className="rbe__pupil" cx="111" cy="58" r="3.8" />
        </g>
        <circle className="rbe__cheek" cx="76" cy="70" r="4.2" />
        <circle className="rbe__cheek" cx="124" cy="70" r="4.2" />
        <ellipse className="rbe__mouth" cx="100" cy="74" rx={mouthRx} ry={mouthRy} />
        <path className="rbe__brow rbe__brow--left" d="M81 45 Q89 41 96 45" />
        <path className="rbe__brow rbe__brow--right" d="M104 45 Q111 41 119 45" />
      </g>

      {state === 'thinking' ? (
        <g className="rbe__think">
          <circle cx="158" cy="58" r="4" />
          <circle cx="172" cy="46" r="5" />
          <circle cx="188" cy="32" r="6" />
        </g>
      ) : null}

      {state === 'error' ? (
        <g className="rbe__alert">
          <circle cx="158" cy="44" r="15" />
          <rect x="156" y="35" width="4" height="12" rx="2" />
          <circle cx="158" cy="53" r="2.2" />
        </g>
      ) : null}
    </svg>
  );
}
