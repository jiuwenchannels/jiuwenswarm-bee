import './CompanionBees.css';

/**
 * Faint companions that read the mascot as "a bee in a swarm": Buzz is one
 * worker among many, not the whole hive. Purely decorative and hidden from
 * assistive tech.
 */
export function CompanionBees({ className }: { className?: string }) {
  return (
    <div
      className={['companion-bees', className].filter(Boolean).join(' ')}
      data-testid="bee-swarm"
      aria-hidden="true"
    >
      <CompanionBee variant="far" />
      <CompanionBee variant="mid" />
      <CompanionBee variant="near" />
    </div>
  );
}

function CompanionBee({ variant }: { variant: 'far' | 'mid' | 'near' }) {
  return (
    <svg className={`companion-bee companion-bee--${variant}`} viewBox="0 0 32 32" focusable="false">
      <ellipse className="companion-bee__wing" cx="10" cy="8" rx="5" ry="7" />
      <ellipse className="companion-bee__wing" cx="22" cy="8" rx="5" ry="7" />
      <ellipse className="companion-bee__body" cx="16" cy="20" rx="9" ry="7.5" />
      <rect className="companion-bee__stripe" x="10.5" y="13" width="3" height="15" />
      <rect className="companion-bee__stripe" x="18.5" y="13" width="3" height="15" />
      <circle className="companion-bee__head" cx="16" cy="11" r="5" />
      <circle className="companion-bee__pupil" cx="14" cy="11" r="1" />
      <circle className="companion-bee__pupil" cx="18" cy="11" r="1" />
    </svg>
  );
}
