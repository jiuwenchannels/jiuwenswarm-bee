import { useLocaleContext } from '../../i18n/LocaleContext';
import type { Locale } from '../../i18n';
import './LanguageToggle.css';

const OPTIONS: Array<{ locale: Locale; label: string }> = [
  { locale: 'en', label: 'EN' },
  { locale: 'zh', label: '中文' },
];

/** Switches the UI language (and therefore the mascot name) at runtime. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocaleContext();

  return (
    <div
      className={['lang-toggle', className].filter(Boolean).join(' ')}
      data-testid="bee-lang"
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          type="button"
          className="lang-toggle__option"
          data-active={option.locale === locale ? 'true' : undefined}
          aria-pressed={option.locale === locale}
          data-testid={`bee-lang-${option.locale}`}
          onClick={() => setLocale(option.locale)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
