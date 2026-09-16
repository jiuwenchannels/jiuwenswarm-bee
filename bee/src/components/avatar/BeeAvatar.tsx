import beeStatic from '../../assets/bee-static.png';
import beeFlying from '../../assets/bee-flying.webp';
import { type AvatarState } from '../../avatar/avatar';
import { useStrings } from '../../i18n/LocaleContext';
import { CompanionBees } from './CompanionBees';
import './Avatar.css';

export function BeeAvatar({ state, showLabel = true }: { state: AvatarState; showLabel?: boolean }) {
  const t = useStrings();
  const flying = state === 'thinking';

  return (
    <div className={`bee-avatar bee-avatar--${state}`} data-testid="bee-avatar" data-variant={state}>
      <div className="bee-avatar__stage">
        <CompanionBees />
        <img
          className="bee-avatar__image"
          src={flying ? beeFlying : beeStatic}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </div>
      {showLabel ? (
        <span className="bee-avatar__label" data-testid="bee-avatar-label">
          {t.avatar[state]}
        </span>
      ) : null}
    </div>
  );
}
