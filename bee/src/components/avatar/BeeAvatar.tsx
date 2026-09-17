import { type AvatarState } from '../../avatar/avatar';
import { useStrings } from '../../i18n/LocaleContext';
import { CompanionBees } from './CompanionBees';
import { RiggedBee } from './RiggedBee';
import './Avatar.css';

export function BeeAvatar({
  state,
  showLabel = true,
  compact = false,
}: {
  state: AvatarState;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const t = useStrings();

  if (compact) {
    return (
      <span
        className={`bee-avatar bee-avatar--compact bee-avatar--${state}`}
        data-testid="bee-avatar-compact"
        data-variant={state}
      >
        <RiggedBee state={state} />
        {showLabel ? (
          <span className="bee-avatar__label" data-testid="bee-avatar-label">
            {t.avatar[state]}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div className={`bee-avatar bee-avatar--${state}`} data-testid="bee-avatar" data-variant={state}>
      <div className="bee-avatar__stage">
        <CompanionBees />
        <div className="bee-avatar__character">
          <RiggedBee state={state} />
        </div>
      </div>
      {showLabel ? (
        <span className="bee-avatar__label" data-testid="bee-avatar-label">
          {t.avatar[state]}
        </span>
      ) : null}
    </div>
  );
}
