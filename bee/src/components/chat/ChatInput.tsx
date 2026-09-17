import { CircleStop, Mic, Send } from 'lucide-react';
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { loadDraft, saveDraft } from '../../chat/draftStorage';
import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import { isDesktop, shellTranscribe, shellVoiceAvailable } from '../../platform/desktop';
import { Dictation, isRecognitionSupported, recognitionLang } from '../../platform/recognition';
import { ShellRecorder } from '../../platform/recorder';
import { stopSpeaking } from '../../platform/speakerStore';
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

/**
 * The single composer used by every view. One obvious way to talk to the bee:
 * type, or hold the mic (Web Speech in the browser/Android, offline whisper in
 * the desktop shells when installed). Voice preferences live in Settings.
 */
export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { disabled, onSend, onStop, draftKey },
  ref,
) {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const [value, setValue] = useState(() => loadDraft(draftKey));
  const [listening, setListening] = useState(false);
  const [shellVoice, setShellVoice] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dictationRef = useRef<Dictation | null>(null);
  const recorderRef = useRef<ShellRecorder | null>(null);
  const transcriptRef = useRef('');
  const pttRef = useRef(false);
  const canTalk = shellVoice || (isRecognitionSupported() && !isDesktop());

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

  // Ask the desktop shell once whether it has an offline STT engine.
  useEffect(() => {
    let alive = true;
    void shellVoiceAvailable().then((available) => {
      if (alive) setShellVoice(available);
    });
    return () => {
      alive = false;
    };
  }, []);

  const endTalk = useCallback(
    (submit: boolean) => {
      if (!pttRef.current) return;
      pttRef.current = false;
      setListening(false);

      if (shellVoice) {
        const recorder = recorderRef.current;
        recorderRef.current = null;
        if (!recorder) return;
        void recorder.stop().then(async (wav) => {
          if (!submit || !wav) return;
          const text = await shellTranscribe(wav, locale === 'zh' ? 'zh' : 'en');
          if (text) onSend(text);
        });
        return;
      }

      dictationRef.current?.stop();
      dictationRef.current = null;
      const text = transcriptRef.current.trim();
      transcriptRef.current = '';
      if (submit && text) onSend(text);
    },
    [shellVoice, locale, onSend],
  );

  const beginTalk = useCallback(() => {
    if (!canTalk || listening || disabled) return;
    stopSpeaking(); // barge-in: stop the bee mid-sentence
    transcriptRef.current = '';
    pttRef.current = true;

    if (shellVoice) {
      const recorder = new ShellRecorder();
      recorderRef.current = recorder;
      void recorder.start().then((ok) => {
        if (!ok || !pttRef.current) {
          if (ok) void recorder.stop();
          if (recorderRef.current === recorder) recorderRef.current = null;
          if (!ok) pttRef.current = false;
          return;
        }
        setListening(true);
      });
      return;
    }

    const dictation = new Dictation(recognitionLang(locale), {
      onStart: () => setListening(true),
      onTranscript: (text) => {
        transcriptRef.current = text;
      },
      onEnd: () => {
        if (pttRef.current) endTalk(true);
      },
      onError: () => {
        pttRef.current = false;
        setListening(false);
      },
    });
    if (!dictation.available) {
      pttRef.current = false;
      return;
    }
    dictationRef.current = dictation;
    dictation.start();
  }, [canTalk, listening, disabled, shellVoice, endTalk, locale]);

  // Safety: end the talk on release/blur outside the window, and cap it.
  useEffect(() => {
    if (!listening) return;
    const finish = () => endTalk(true);
    const cancel = () => endTalk(false);
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('blur', finish);
    const maxTimer = window.setTimeout(finish, 60_000);
    return () => {
      window.removeEventListener('pointerup', finish, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('blur', finish);
      window.clearTimeout(maxTimer);
    };
  }, [listening, endTalk]);

  useEffect(() => () => dictationRef.current?.stop(), []);

  useEffect(() => {
    if (!disabled) return;
    dictationRef.current?.stop();
    dictationRef.current = null;
    void recorderRef.current?.stop();
    recorderRef.current = null;
    setListening(false);
  }, [disabled]);

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

  const talkLabel = listening ? t.voice.listening : t.voice.pushToTalk;

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
      {canTalk ? (
        <button
          className="composer__icon"
          data-testid="bee-mic"
          type="button"
          data-listening={listening ? 'true' : undefined}
          aria-pressed={listening}
          title={talkLabel}
          aria-label={talkLabel}
          disabled={disabled}
          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            beginTalk();
          }}
          onPointerUp={() => endTalk(true)}
          onPointerCancel={() => endTalk(false)}
          onPointerLeave={() => endTalk(true)}
          onContextMenu={(event) => event.preventDefault()}
        >
          {listening ? <Waveform active /> : <Mic size={18} aria-hidden="true" />}
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
