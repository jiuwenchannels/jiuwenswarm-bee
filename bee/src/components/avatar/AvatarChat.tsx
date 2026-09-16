import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { ChatInput } from '../chat/ChatInput';
import { MessageList } from '../chat/MessageList';
import { LanguageToggle } from '../common/LanguageToggle';
import { AvatarCharacter } from './AvatarCharacter';
import { CompanionBees } from './CompanionBees';
import { loadAvatarStyle, saveAvatarStyle, type AvatarStyle } from '../../avatar/avatarStyle';
import { useStrings } from '../../i18n/LocaleContext';
import { desktop, isAndroidOverlay } from '../../platform/desktop';
import { Speaker, isSpeechSupported } from '../../platform/speech';
import { useAppConfig, useSettings } from '../../settings/SettingsContext';
import { useChat } from '../../chat/useChat';
import './AvatarChat.css';

export function AvatarChat() {
  const t = useStrings();
  const config = useAppConfig();
  const { settings, update } = useSettings();
  const {
    messages,
    avatar,
    status,
    busy,
    send,
    stop,
    retry,
    retryMessage,
    editMessage,
  } = useChat(config);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(() => !isSpeechSupported() || !settings.voiceEnabled);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [style, setStyle] = useState<AvatarStyle>(loadAvatarStyle);
  const overlay = isAndroidOverlay();

  const speakerRef = useRef<Speaker | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const speakingRef = useRef(false);
  const answeringRef = useRef(false);
  const boostRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });

  // Marker so styles can adapt to the Android overlay (one connected surface).
  useEffect(() => {
    if (!overlay) return;
    document.documentElement.dataset.shell = 'android';
    return () => {
      delete document.documentElement.dataset.shell;
    };
  }, [overlay]);

  // Drag the overlay window by grabbing the bee or the grip (screen coords, so the
  // moving window doesn't fight the pointer).
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

  const tick = useCallback(() => {
    const now = performance.now();
    const base = 0.3 + 0.45 * Math.abs(Math.sin(now / 85));
    boostRef.current = Math.max(0, boostRef.current - 0.06);
    setMouthOpen(Math.min(1, base * (0.6 + boostRef.current)));
    // Keep animating while the reply streams OR the voice speaks.
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

  // Speak each finished assistant reply once.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.streaming || last.error) return;
    if (spokenRef.current.has(last.id)) return;
    spokenRef.current.add(last.id);
    if (!muted) speakerRef.current?.speak(last.text);
  }, [messages, muted]);

  // Keep the local mute in step with the persisted setting.
  useEffect(() => {
    setMuted(!isSpeechSupported() || !settings.voiceEnabled);
  }, [settings.voiceEnabled]);

  // The mouth keeps moving while the reply is streaming, even if TTS is silent
  // (WebView2/Electron often have no speech voices installed).
  useEffect(() => {
    answeringRef.current = avatar === 'answering';
    ensureTalking();
  }, [avatar, ensureTalking]);

  useEffect(() => {
    desktop.setExpanded(expanded);
  }, [expanded]);

  const handleSend = useCallback(
    (text: string) => {
      setExpanded(true);
      send(text);
    },
    [send],
  );

  const toggleExpanded = useCallback(() => {
    // A drag that started on the bee shouldn't also toggle the chat.
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setExpanded((value) => !value);
  }, []);

  return (
    <div className="avatar-chat" data-expanded={expanded ? 'true' : 'false'} data-avatar={avatar}>
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
          aria-label="Close"
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
          title={expanded ? 'Collapse' : 'Chat'}
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
      </div>

      {expanded ? (
        <div className="avatar-chat__composer">
          <ChatInput disabled={busy} onSend={handleSend} onStop={stop} draftKey="avatar" />
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
              title="Switch avatar style"
              onClick={() => {
                setStyle((current) => {
                  const next: AvatarStyle = current === 'mascot' ? 'vector' : 'mascot';
                  saveAvatarStyle(next);
                  return next;
                });
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
