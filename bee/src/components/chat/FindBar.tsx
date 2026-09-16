import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { useStrings } from '../../i18n/LocaleContext';
import './FindBar.css';

export function FindBar({
  query,
  onQuery,
  total,
  index,
  onNext,
  onPrev,
  onClose,
}: {
  query: string;
  onQuery: (value: string) => void;
  total: number;
  index: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const t = useStrings();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="find" data-testid="bee-find" role="search">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={t.find.placeholder}
        aria-label={t.find.placeholder}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) onPrev();
            else onNext();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      />
      <span className="find__count" aria-live="polite">
        {query.trim() ? (total === 0 ? t.find.none : `${index + 1}/${total}`) : ''}
      </span>
      <button className="icon-btn icon-btn--sm" type="button" onClick={onPrev} aria-label={t.actions.search}>
        <ChevronUp size={15} aria-hidden="true" />
      </button>
      <button className="icon-btn icon-btn--sm" type="button" onClick={onNext} aria-label={t.actions.search}>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <button className="icon-btn icon-btn--sm" type="button" onClick={onClose} aria-label={t.actions.close}>
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
