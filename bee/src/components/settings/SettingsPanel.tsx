import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import type { Locale } from '../../i18n';
import type { AvatarStyle } from '../../avatar/avatarStyle';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { useSettings } from '../../settings/SettingsContext';
import type { ThemePreference } from '../../theme/theme';

const LOCALE_LABELS: Array<{ value: Locale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
];

const AVATAR_STYLES: AvatarStyle[] = ['mascot', 'rigged'];

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useStrings();
  const { locale, setLocale } = useLocaleContext();
  const { settings, update, reset } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);
  const [gatewayUrl, setGatewayUrl] = useState(settings.gatewayUrl);
  const [agentId, setAgentId] = useState(settings.agentId);
  const [mode, setMode] = useState(settings.mode);

  // Re-sync the connection fields whenever the panel is opened.
  useEffect(() => {
    if (!open) return;
    setGatewayUrl(settings.gatewayUrl);
    setAgentId(settings.agentId);
    setMode(settings.mode);
  }, [open, settings.gatewayUrl, settings.agentId, settings.mode]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const themes: Array<{ value: ThemePreference; label: string }> = [
    { value: 'light', label: t.theme.light },
    { value: 'dark', label: t.theme.dark },
    { value: 'system', label: t.theme.system },
  ];

  function applyConnection() {
    update({ gatewayUrl, agentId, mode });
    onClose();
  }

  return (
    <div className="modal" data-testid="bee-settings">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={t.settings.title}>
        <header className="modal__header">
          <h2 className="modal__title">{t.settings.title}</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label={t.settings.close}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="modal__body">
          <section className="field-group">
            <h3 className="field-group__title">{t.settings.appearance}</h3>

            <div className="field">
              <span className="field__label">{t.settings.theme}</span>
              <div className="segmented" role="group" aria-label={t.settings.theme}>
                {themes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="segmented__item"
                    data-active={settings.theme === option.value ? 'true' : undefined}
                    aria-pressed={settings.theme === option.value}
                    onClick={() => update({ theme: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field__label">{t.settings.language}</span>
              <div className="segmented" role="group" aria-label={t.settings.language}>
                {LOCALE_LABELS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="segmented__item"
                    data-active={locale === option.value ? 'true' : undefined}
                    aria-pressed={locale === option.value}
                    onClick={() => setLocale(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field__label">{t.settings.avatar}</span>
              <div className="segmented" role="group" aria-label={t.settings.avatar}>
                {AVATAR_STYLES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="segmented__item"
                    data-active={settings.avatarStyle === value ? 'true' : undefined}
                    aria-pressed={settings.avatarStyle === value}
                    onClick={() => update({ avatarStyle: value })}
                  >
                    {t.style[value]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="field-group">
            <h3 className="field-group__title">{t.settings.assistant}</h3>
            <div className="field">
              <label className="field__row">
                <span className="field__label">{t.settings.voice}</span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={settings.voiceEnabled}
                  onChange={(event) => update({ voiceEnabled: event.target.checked })}
                />
              </label>
              <p className="field__hint">{t.settings.voiceHint}</p>
            </div>
            <div className="field">
              <label className="field__row" htmlFor="speech-rate">
                <span className="field__label">{t.settings.speechRate}</span>
                <span className="field__value">{settings.speechRate.toFixed(2)}×</span>
              </label>
              <input
                id="speech-rate"
                type="range"
                className="range"
                min={0.5}
                max={2}
                step={0.05}
                value={settings.speechRate}
                disabled={!settings.voiceEnabled}
                onChange={(event) => update({ speechRate: Number(event.target.value) })}
              />
              <p className="field__hint">{t.settings.speechRateHint}</p>
            </div>
            <div className="field">
              <label className="field__row">
                <span className="field__label">{t.settings.concise}</span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={settings.conciseReplies}
                  onChange={(event) => update({ conciseReplies: event.target.checked })}
                />
              </label>
              <p className="field__hint">{t.settings.conciseHint}</p>
            </div>
          </section>

          <section className="field-group">
            <h3 className="field-group__title">{t.settings.connection}</h3>
            <div className="field">
              <label className="field__label" htmlFor="gateway-url">
                {t.settings.gatewayUrl}
              </label>
              <input
                id="gateway-url"
                className="field__input"
                type="text"
                inputMode="url"
                spellCheck={false}
                placeholder={t.settings.gatewayPlaceholder}
                value={gatewayUrl}
                onChange={(event) => setGatewayUrl(event.target.value)}
              />
              <p className="field__hint">{t.settings.gatewayHint}</p>
            </div>

            <details className="advanced">
              <summary>{t.settings.advanced}</summary>
              <div className="field field--split">
                <div>
                  <label className="field__label" htmlFor="agent-id">
                    {t.settings.agentId}
                  </label>
                  <input
                    id="agent-id"
                    className="field__input"
                    type="text"
                    spellCheck={false}
                    value={agentId}
                    onChange={(event) => setAgentId(event.target.value)}
                  />
                  <p className="field__hint">{t.settings.agentHint}</p>
                </div>
                <div>
                  <label className="field__label" htmlFor="agent-mode">
                    {t.settings.mode}
                  </label>
                  <input
                    id="agent-mode"
                    className="field__input"
                    type="text"
                    spellCheck={false}
                    value={mode}
                    onChange={(event) => setMode(event.target.value)}
                  />
                  <p className="field__hint">{t.settings.modeHint}</p>
                </div>
              </div>
            </details>
          </section>
        </div>

        <footer className="modal__footer">
          <button className="btn btn--ghost" type="button" onClick={reset}>
            {t.settings.reset}
          </button>
          <span className="modal__build" title={t.settings.build}>
            {__BUILD_ID__}
          </span>
          <button className="btn btn--primary" type="button" onClick={applyConnection}>
            {t.actions.save}
          </button>
        </footer>
      </div>
    </div>
  );
}
