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
import { AvatarCharacter } from './AvatarCharacter';
import { CompanionBees } from './CompanionBees';
import { useStrings } from '../../i18n/LocaleContext';
import { desktop, isAndroidOverlay } from '../../platform/desktop';
import { Speaker, isSpeechSupported } from '../../platform/speech';
import { useAppConfig, useSettings } from '../../settings/SettingsContext';
import { useChat } from '../../chat/useChat';
import './AvatarChat.css';

/**
 * The floating avatar view. One obvious interaction: click the bee, then type
 * or hold the mic (the composer owns the single mic). Preferences — voice,
 * theme, language, character — live in Settings, not here.
 */
export function AvatarChat() {
  const t = useStrings();
  const config = useAppConfig();
  const { settings } = useSettings();
  const { messages, avatar, status, busy, activity, send, stop, retryMessage, editMessage } =
    useChat(config);
  const [expanded, setExpanded] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const overlay = isAndroidOverlay();
  const composerRef = useRef<ChatInputHandle>(null);
  const muted = !isSpeechSupported() || !settings.voiceEnabled;

  const speakerRef = useRef<Speaker | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const speakingRef = useRef(false);
  const answeringRef = useRef(false);
  const boostRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const prevStatusRef = useRef(status);

  // Marker so styles can adapt to the Android overlay (one connected surface).
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

  // Speak each finished assistant reply once (voice on/off is a Setting).
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.streaming || last.error) return;
    if (spokenRef.current.has(last.id)) return;
    spokenRef.current.add(last.id);
    if (!muted) speakerRef.current?.speak(last.text);
  }, [messages, muted]);

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
          <AvatarCharacter state={avatar} mouthOpen={mouthOpen} style={settings.avatarStyle} />
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
          <ChatInput
            ref={composerRef}
            disabled={busy}
            onSend={handleSend}
            onStop={stop}
            draftKey="avatar"
          />
        </div>
      ) : null}
    </div>
  );
}
