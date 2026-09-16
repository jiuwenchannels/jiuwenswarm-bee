import beeStatic from '../../assets/bee-static.png';
import beeFlying from '../../assets/bee-flying.webp';
import { type AvatarState, avatarLabel } from '../../lib/avatar';
import './Avatar.css';

export function BeeAvatar({ state }: { state: AvatarState }) {
  const flying = state === 'thinking';

  return (
    <div className={`bee-avatar bee-avatar--${state}`} data-testid="bee-avatar" data-variant={state}>
      <img
        className="bee-avatar__image"
        src={flying ? beeFlying : beeStatic}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <span className="bee-avatar__label" data-testid="bee-avatar-label">
        {avatarLabel(state)}
      </span>
    </div>
  );
}
