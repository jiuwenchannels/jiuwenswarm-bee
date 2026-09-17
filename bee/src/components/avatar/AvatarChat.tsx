import { Mic, MicOff } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { ChatInput, type ChatInputHandle } from '../chat/ChatInput';
import { MessageList } from '../chat/MessageList';
import { LanguageToggle } from '../common/LanguageToggle';
import { AvatarCharacter } from './AvatarCharacter';
import { CompanionBees } from './CompanionBees';
import { Waveform } from './Waveform';
import { type AvatarStyle } from '../../avatar/avatarStyle';
import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import { desktop, isAndroidOverlay, isDesktop, shellTranscribe, shellVoiceAvailable } from '../../platform/desktop';
import { ShellRecorder } from '../../platform/recorder';
import { Dictation, isRecognitionSupported, recognitionLang } from '../../platform/recognition';
import { Speaker, isSpeechSupported } from '../../platform/speech';
import { useAppConfig, useSettings } from '../../settings/SettingsContext';
import { useChat } from '../../chat/useChat';
import './AvatarChat.css';

export function AvatarChat() {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const config = useAppConfig();
  const { settings, update } = useSettings();
  const { messages, avatar, status, busy, activity, send, stop, retry, retryMessage, editMessage } =
    useChat(config);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(() => !isSpeechSupported() || !settings.voiceEnabled);
  const [mouthOpen, setMouthOpen] = useState(0);
  const style = settings.avatarStyle;
  const [listening, setListening] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shellVoice, setShellVoice] = useState(false);
  const overlay = isAndroidOverlay();
  // Electron/Tauri ship no cloud recognizer, but may provide offline whisper.cpp;
  // the real browser (and Android) use the Web Speech / native recognizer.
  const canTalk = shellVoice || (isRecognitionSupported() && !isDesktop());
  const composerRef = useRef<ChatInputHandle>(null);
  const recorderRef = useRef<ShellRecorder | null>(null);

  const speakerRef = useRef<Speaker | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const speakingRef = useRef(false);
  const answeringRef = useRef(false);
  const boostRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const dictationRef = useRef<Dictation | null>(null);
  const transcriptRef = useRef('');
  const pttActiveRef = useRef(false);
  const prevStatusRef = useRef(status);

  // Marker so styles can adapt to the Android overlay (one connected surface).
  useEffect(() => {
    if (!overlay) return;
    document.documentElement.dataset.shell = 'android';
    return () => {
      delete document.documentElement.dataset.shell;
    };
  }, [overlay]);

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

  // --- drag (screen coords so the moving window doesn't fight the pointer) ---
  const onDragStart = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    dragRef.current = { active: true, moved: false, x: event.screenX, y: event.screenY };
  }, []);

  const onDragMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag.active) return;
      const dx = event.screenX - drag.x;
      const dy = event.screenY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      drag.moved = true;
      drag.x = event.screenX;
      drag.y = event.screenY;
      if (overlay) desktop.moveBy(dx, dy);
    },
    [overlay],
  );

  const onDragEnd = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  // --- mouth animation: runs while the reply streams OR the voice speaks ----
  const tick = useCallback(() => {
    const now = performance.now();
    const base = 0.3 + 0.45 * Math.abs(Math.sin(now / 85));
    boostRef.current = Math.max(0, boostRef.current - 0.06);
    setMouthOpen(Math.min(1, base * (0.6 + boostRef.current)));
    if (speakingRef.current || answeringRef.current || boostRef.current > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      setMouthOpen(0);
    }
  }, []);

  const ensureTalking = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    const speaker = new Speaker({
      onStart: () => {
        speakingRef.current = true;
        ensureTalking();
      },
      onEnd: () => {
        speakingRef.current = false;
        ensureTalking();
      },
      onBoundary: () => {
        boostRef.current = 1;
        ensureTalking();
      },
    });
    speakerRef.current = speaker;
    return () => {
      speaker.cancel();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [ensureTalking]);

  // Speak each finished assistant reply once (barge-in cancels it).
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.streaming || last.error) return;
    if (spokenRef.current.has(last.id)) return;
    spokenRef.current.add(last.id);
    if (!muted) speakerRef.current?.speak(last.text);
  }, [messages, muted]);

  useEffect(() => {
    setMuted(!isSpeechSupported() || !settings.voiceEnabled);
  }, [settings.voiceEnabled]);

  useEffect(() => {
    answeringRef.current = avatar === 'answering';
    ensureTalking();
  }, [avatar, ensureTalking]);

  useEffect(() => {
    desktop.setExpanded(expanded);
  }, [expanded]);

  // Elapsed-time indicator while the agent works (agency surface).
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  // Multimodal client cue: drop a text file to compose from its contents.
  const onDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const looksText =
      file.type.startsWith('text/') || /\.(md|txt|json|csv|log|ya?ml)$/i.test(file.name);
    if (!looksText) return;
    const text = (await file.text()).slice(0, 4000);
    setExpanded(true);
    requestAnimationFrame(() => composerRef.current?.setText(text));
  }, []);

  // Proactive: announce the return after a drop (one short line, then fade).
  useEffect(() => {
    const previous = prevStatusRef.current;
    prevStatusRef.current = status;
    if (previous === 'disconnected' && status === 'connected' && messages.length > 0) {
      setNotice(t.proactive.reconnected);
      const timer = setTimeout(() => setNotice(null), 4000);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [status, messages.length, t]);

  // --- push-to-talk (P2) ---------------------------------------------------
  const endTalk = useCallback(
    (submit: boolean) => {
      if (!pttActiveRef.current) return;
      pttActiveRef.current = false;
      setListening(false);

      // Desktop shell: transcribe the recorded WAV with the local engine.
      if (shellVoice) {
        const recorder = recorderRef.current;
        recorderRef.current = null;
        if (!recorder) return;
        void recorder.stop().then(async (wav) => {
          if (!submit || !wav) return;
          const text = await shellTranscribe(wav, locale === 'zh' ? 'zh' : 'en');
          if (text) send(text);
        });
        return;
      }

      dictationRef.current?.stop();
      dictationRef.current = null;
      const text = transcriptRef.current.trim();
      transcriptRef.current = '';
      if (submit && text) send(text);
    },
    [shellVoice, locale, send],
  );

  const beginTalk = useCallback(() => {
    if (!canTalk || listening) return;
    // Barge-in: stop whatever the bee is currently saying.
    speakerRef.current?.cancel();
    transcriptRef.current = '';
    pttActiveRef.current = true;

    if (shellVoice) {
      const recorder = new ShellRecorder();
      recorderRef.current = recorder;
      void recorder.start().then((ok) => {
        if (!ok || !pttActiveRef.current) {
          // Released while the mic was still opening — never flip to listening.
          if (ok) void recorder.stop();
          if (recorderRef.current === recorder) recorderRef.current = null;
          if (!ok) pttActiveRef.current = false;
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
        if (pttActiveRef.current) endTalk(true);
      },
      onError: () => {
        pttActiveRef.current = false;
        setListening(false);
      },
    });
    if (!dictation.available) {
      pttActiveRef.current = false;
      return;
    }
    dictationRef.current = dictation;
    dictation.start();
  }, [canTalk, listening, shellVoice, endTalk, locale]);

  // Safety: releasing outside the tiny avatar window (or losing focus) must still
  // end the talk, and a stuck capture must not leave the mic on forever.
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

  useEffect(
    () => () => {
      dictationRef.current?.stop();
      void recorderRef.current?.stop();
    },
    [],
  );

  const handleSend = useCallback(
    (text: string) => {
      setExpanded(true);
      send(text);
    },
    [send],
  );

  const toggleExpanded = useCallback(() => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setHintDismissed(true);
    setExpanded((value) => !value);
  }, []);

  const showHint = !expanded && !hintDismissed && messages.length === 0;

  return (
    <div
      className="avatar-chat"
      data-expanded={expanded ? 'true' : 'false'}
      data-avatar={avatar}
      data-dragging={dragging ? 'true' : undefined}
      onDragOver={(event) => {
        event.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {dragging ? (
        <div className="avatar-chat__drop" aria-hidden="true">
          {t.onboarding.drop}
        </div>
      ) : null}
      <div
        className="avatar-chat__grip"
        data-tauri-drag-region
        aria-hidden="true"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      />

      {overlay ? (
        <button
          className="avatar-chat__close"
          type="button"
          aria-label={t.actions.close}
          onClick={() => desktop.closeOverlay()}
        >
          ×
        </button>
      ) : null}

      {expanded ? (
        <div className="avatar-chat__bubbles" aria-live="polite">
          {messages.length === 0 ? (
            <p className="avatar-chat__hello">{t.hello}</p>
          ) : (
            <MessageList
              messages={messages}
              busy={busy}
              onRetry={retryMessage}
              onEdit={editMessage}
            />
          )}
        </div>
      ) : null}

      {notice ? (
        <div className="avatar-chat__notice" role="status">
          {notice}
        </div>
      ) : null}

      <div
        className="avatar-chat__stage"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <CompanionBees />
        <button
          className="avatar-chat__char"
          type="button"
          title={expanded ? t.actions.collapse : t.actions.chat}
          aria-label={expanded ? t.actions.collapse : t.actions.chat}
          onClick={toggleExpanded}
        >
          <AvatarCharacter state={avatar} mouthOpen={mouthOpen} style={style} />
        </button>
        <span
          className="avatar-chat__pulse"
          data-variant={status}
          data-state={avatar}
          aria-hidden="true"
        />
        {showHint ? <span className="avatar-chat__hint">{t.onboarding.hint}</span> : null}
      </div>

      {expanded ? (
        <div className="avatar-chat__composer">
          {busy ? (
            <div className="avatar-chat__activity" role="status">
              <span className="avatar-chat__activity-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="avatar-chat__activity-text">
                {activity ?? (avatar === 'thinking' ? t.avatar.thinking : t.avatar.answering)}
              </span>
              {elapsed >= 2 ? <span className="avatar-chat__activity-time">{elapsed}s</span> : null}
            </div>
          ) : null}
          <div className="avatar-chat__talk">
            {canTalk ? (
              <>
                <Waveform active={listening} />
                <button
                  className="avatar-chat__ptt"
                  type="button"
                  data-listening={listening ? 'true' : undefined}
                  aria-pressed={listening}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    beginTalk();
                  }}
                  onPointerUp={() => endTalk(true)}
                  onPointerCancel={() => endTalk(false)}
                  onPointerLeave={() => endTalk(true)}
                  title={listening ? t.voice.listening : t.voice.pushToTalk}
                >
                  {listening ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
                  <span>{listening ? t.voice.listening : t.voice.pushToTalk}</span>
                </button>
              </>
            ) : null}
          </div>
          <ChatInput ref={composerRef} disabled={busy} onSend={handleSend} onStop={stop} draftKey="avatar" />
          <div className="avatar-chat__meta">
            <span className="avatar-chat__status" data-variant={status}>
              <span className="avatar-chat__dot" aria-hidden="true" />
              {t.status[status]}
            </span>
            <LanguageToggle />
            {isSpeechSupported() ? (
              <button
                className="avatar-chat__mute"
                type="button"
                aria-pressed={muted}
                onClick={() => {
                  const next = !muted;
                  if (next) speakerRef.current?.cancel();
                  setMuted(next);
                  update({ voiceEnabled: !next });
                }}
              >
                {muted ? t.voice.off : t.voice.on}
              </button>
            ) : null}
            <button
              className="avatar-chat__style"
              type="button"
              title={t.actions.switchStyle}
              onClick={() => {
                const next: AvatarStyle = style === 'mascot' ? 'rigged' : 'mascot';
                update({ avatarStyle: next });
              }}
            >
              🐝 {t.style[style]}
            </button>
            {messages.some((message) => message.error) ? (
              <button className="avatar-chat__retry" type="button" onClick={retry}>
                {t.actions.tryAgain}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
