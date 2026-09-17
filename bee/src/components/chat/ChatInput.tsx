import { CircleStop, Mic, Send } from 'lucide-react';
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { loadDraft, saveDraft } from '../../chat/draftStorage';
import { useStrings } from '../../i18n/LocaleContext';
import { useVoiceInput } from '../../platform/useVoiceInput';
import { Waveform } from '../avatar/Waveform';
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

/** The website's composer: one box, one mic (hold to talk), one Send. */
export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { disabled, onSend, onStop, draftKey },
  ref,
) {
  const t = useStrings();
  const [value, setValue] = useState(() => loadDraft(draftKey));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceInput(onSend, !disabled);

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

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const talkLabel = voice.listening ? t.voice.listening : t.voice.pushToTalk;

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
      {voice.available ? (
        <button
          className="composer__icon"
          data-testid="bee-mic"
          type="button"
          data-listening={voice.listening ? 'true' : undefined}
          aria-pressed={voice.listening}
          title={talkLabel}
          aria-label={talkLabel}
          disabled={disabled}
          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            voice.begin();
          }}
          onPointerUp={() => voice.end(true)}
          onPointerCancel={() => voice.end(false)}
          onPointerLeave={() => voice.end(true)}
          onContextMenu={(event) => event.preventDefault()}
        >
          {voice.listening ? <Waveform active /> : <Mic size={18} aria-hidden="true" />}
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
