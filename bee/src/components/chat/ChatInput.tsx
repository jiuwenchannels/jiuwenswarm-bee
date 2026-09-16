import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import { Dictation, isRecognitionSupported, recognitionLang } from '../../platform/recognition';
import './Chat.css';

export function ChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const [dictationSupported] = useState(isRecognitionSupported);
  const dictationRef = useRef<Dictation | null>(null);
  const baseRef = useRef('');

  function stopDictation() {
    dictationRef.current?.stop();
    dictationRef.current = null;
    setListening(false);
  }

  useEffect(() => () => dictationRef.current?.stop(), []);

  useEffect(() => {
    if (!disabled) return;
    dictationRef.current?.stop();
    dictationRef.current = null;
    setListening(false);
  }, [disabled]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    stopDictation();
    onSend(text);
    setValue('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function toggleDictation() {
    if (listening) {
      stopDictation();
      return;
    }
    baseRef.current = value.trim();
    const dictation = new Dictation(recognitionLang(locale), {
      onStart: () => setListening(true),
      onTranscript: (text) => setValue([baseRef.current, text].filter(Boolean).join(' ')),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (!dictation.available) return;
    dictationRef.current = dictation;
    dictation.start();
  }

  const dictateLabel = listening ? t.composer.dictateStop : t.composer.dictateStart;

  return (
    <form
      className="composer"
      data-testid="bee-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        className="composer__input"
        data-testid="bee-input"
        rows={1}
        placeholder={t.composer.placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label={t.composer.ariaLabel}
      />
      {dictationSupported ? (
        <button
          className="composer__mic"
          data-testid="bee-mic"
          type="button"
          data-listening={listening ? 'true' : undefined}
          aria-pressed={listening}
          title={dictateLabel}
          aria-label={dictateLabel}
          disabled={disabled}
          onClick={toggleDictation}
        >
          🎤
        </button>
      ) : null}
      <button className="composer__send" data-testid="bee-send" type="submit" disabled={disabled || !value.trim()}>
        {t.composer.send}
      </button>
    </form>
  );
}
