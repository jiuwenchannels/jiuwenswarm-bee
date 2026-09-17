import { Mic, Settings } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { AvatarCharacter } from './AvatarCharacter';
import { CompanionBees } from './CompanionBees';
import { Waveform } from './Waveform';
import { SettingsPanel } from '../settings/SettingsPanel';
import { withVoiceInstruction } from '../../chat/voicePrompt';
import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import { stripMarkdown } from '../../lib/markdown';
import { desktop, isAndroidOverlay, isDesktop } from '../../platform/desktop';
import { Speaker, isSpeechSupported, firstSentences } from '../../platform/speech';
import { useVoiceInput } from '../../platform/useVoiceInput';
import { useAppConfig, useSettings } from '../../settings/SettingsContext';
import { useChat } from '../../chat/useChat';
import './AvatarChat.css';

/**
 * The floating avatar: a voice companion, not a chat window. Hold the button to
 * talk; the bee listens and speaks its reply. The website remains the place to
 * type. Preferences (voice, character, language) live in Settings.
 */
export function AvatarChat() {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const config = useAppConfig();
  const { settings } = useSettings();
  const { messages, avatar, status, busy, activity, send, stop } = useChat(config);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const overlay = isAndroidOverlay();
  const muted = !isSpeechSupported() || !settings.voiceEnabled;
  const concise = settings.conciseReplies;

  // Voice mode prepends a hidden "answer briefly" instruction; the conversation
  // still shows (and stores) only the user's own words.
  const handleVoice = useCallback(
    (text: string) => {
      setActivated(true);
      setJustSent(text);
      send(text, settings.conciseReplies ? withVoiceInstruction(text, locale) : undefined);
    },
    [send, settings.conciseReplies, locale],
  );
  const voice = useVoiceInput(handleVoice);

  const speakerRef = useRef<Speaker | null>(null);
  // Seed with replies already in history so opening the avatar never re-speaks
  // the previous answer; only replies that arrive this session are spoken.
  const spokenRef = useRef<Set<string>>(
    new Set(
      messages.filter((message) => message.role === 'assistant').map((message) => message.id),
    ),
  );
  const speakingRef = useRef(false);
  const answeringRef = useRef(false);
  const boostRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (!overlay) return;
    document.documentElement.dataset.shell = 'android';
    return () => {
      delete document.documentElement.dataset.shell;
    };
  }, [overlay]);

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
    const speaker = new Speaker(
      {
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
      },
      settings.speechRate,
    );
    speakerRef.current = speaker;
    return () => {
      speaker.cancel();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [ensureTalking, settings.speechRate]);

  // Speak each finished assistant reply once (voice on/off is a Setting). In
  // concise mode, only the first sentences are spoken so listening stays short.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.streaming || last.error) return;
    if (spokenRef.current.has(last.id)) return;
    spokenRef.current.add(last.id);
    if (!muted) speakerRef.current?.speak(concise ? firstSentences(last.text, 2) : last.text);
  }, [messages, muted, concise]);

  useEffect(() => {
    answeringRef.current = avatar === 'answering';
    ensureTalking();
  }, [avatar, ensureTalking]);

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

  const lastReply = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && !message.streaming && !message.error)
    ?.text;
  const caption = voice.listening
    ? voice.transcript || t.voice.listening
    : voice.processing
      ? t.voice.transcribing
      : busy
        ? justSent ?? ''
        : notice ??
          (!activated
            ? t.hello
            : lastReply
              ? concise
                ? firstSentences(lastReply, 2)
                : stripMarkdown(lastReply)
              : '');

  const talkLabel = voice.listening ? t.voice.listening : t.voice.pushToTalk;
  const working = busy && !voice.listening && !voice.processing;

  return (
    <div className="avatar-chat" data-avatar={avatar} data-listening={voice.listening ? 'true' : undefined}>
      <div
        className="avatar-chat__grip"
        data-tauri-drag-region
        aria-hidden="true"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      />

      {overlay || isDesktop() ? (
        <button
          className="avatar-chat__close"
          type="button"
          aria-label={overlay ? t.actions.close : t.actions.quit}
          title={overlay ? t.actions.close : t.actions.quit}
          onClick={() => (overlay ? desktop.closeOverlay() : desktop.quit())}
        >
          ×
        </button>
      ) : null}

      <button
        className="avatar-chat__settings"
        type="button"
        aria-label={t.settings.title}
        title={t.settings.title}
        data-testid="bee-avatar-settings"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings size={14} aria-hidden="true" />
      </button>

      {status !== 'connected' || avatar === 'error' ? (
        <span
          className="avatar-chat__pulse"
          data-variant={status}
          data-state={avatar}
          aria-hidden="true"
        />
      ) : null}

      {caption || working ? (
        <div
          className="avatar-chat__caption"
          data-tauri-drag-region
          aria-live="polite"
          data-state={voice.listening ? 'listening' : busy ? 'busy' : 'idle'}
        >
          {caption ? <span className="avatar-chat__caption-text">{caption}</span> : null}
          {working ? (
            <span className="avatar-chat__working" role="status">
              <span className="avatar-chat__working-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {activity ?? t.avatar[avatar]}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className="avatar-chat__stage"
        data-tauri-drag-region
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <CompanionBees />
        <div className="avatar-chat__char">
          <AvatarCharacter state={avatar} mouthOpen={mouthOpen} style={settings.avatarStyle} />
        </div>
      </div>

      {voice.available ? (
        <button
          className="avatar-chat__talk"
          type="button"
          data-testid="bee-talk"
          data-listening={voice.listening ? 'true' : undefined}
          aria-pressed={voice.listening}
          aria-label={talkLabel}
          title={talkLabel}
          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            voice.begin();
          }}
          onPointerUp={() => voice.end(true)}
          onPointerCancel={() => voice.end(false)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="avatar-chat__talk-main">
            {voice.listening ? <Waveform active /> : <Mic size={16} aria-hidden="true" />}
            <span>{talkLabel}</span>
          </span>
          <span className="avatar-chat__talk-brand" aria-hidden="true">
            {t.poweredBy} · {t.attribution}
          </span>
        </button>
      ) : (
        <p className="avatar-chat__novoice">{t.voice.unavailable}</p>
      )}

      {busy ? (
        <button className="avatar-chat__stop" type="button" onClick={stop}>
          {t.composer.stop}
        </button>
      ) : null}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
