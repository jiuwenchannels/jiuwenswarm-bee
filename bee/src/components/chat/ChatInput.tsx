import { CircleStop, Mic, Send } from 'lucide-react';
import {
  type KeyboardEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { loadDraft, saveDraft } from '../../chat/draftStorage';
import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import { isDesktop } from '../../platform/desktop';
import { Dictation, isRecognitionSupported, recognitionLang } from '../../platform/recognition';
import './Chat.css';

const MAX_TEXTAREA_PX = 200;

export interface ChatInputHandle {
  focus: () => void;
  /** Put text in the composer (replacing any draft) and focus it. */
  setText: (text: string) => void;
}

interface ChatInputProps {
  disabled: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  draftKey: string;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { disabled, onSend, onStop, draftKey },
  ref,
) {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const [value, setValue] = useState(() => loadDraft(draftKey));
  const [listening, setListening] = useState(false);
  // Web Speech recognition needs Chromium's cloud speech service, which the
  // desktop shells don't ship — offering the mic there only fails at runtime.
  const [dictationSupported] = useState(() => isRecognitionSupported() && !isDesktop());
  const dictationRef = useRef<Dictation | null>(null);
  const baseRef = useRef('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      setText: (text: string) => {
        setValue(text);
        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(text.length, text.length);
        });
      },
    }),
    [],
  );

  useEffect(() => {
    setValue(loadDraft(draftKey));
  }, [draftKey]);

  useEffect(() => {
    saveDraft(draftKey, value);
  }, [draftKey, value]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [value]);

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
        ref={inputRef}
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
          className="composer__icon"
          data-testid="bee-mic"
          type="button"
          data-listening={listening ? 'true' : undefined}
          aria-pressed={listening}
          title={dictateLabel}
          aria-label={dictateLabel}
          disabled={disabled}
          onClick={toggleDictation}
        >
          <Mic size={18} aria-hidden="true" />
        </button>
      ) : null}
      {disabled ? (
        <button
          className="composer__send composer__send--stop"
          data-testid="bee-stop"
          type="button"
          onClick={onStop}
          aria-label={t.composer.stop}
          title={t.composer.stop}
        >
          <CircleStop size={18} aria-hidden="true" />
          <span>{t.composer.stop}</span>
        </button>
      ) : (
        <button
          className="composer__send"
          data-testid="bee-send"
          type="submit"
          disabled={!value.trim()}
        >
          <Send size={16} aria-hidden="true" />
          <span>{t.composer.send}</span>
        </button>
      )}
    </form>
  );
});
