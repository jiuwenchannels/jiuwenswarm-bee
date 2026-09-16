import { useCallback, useEffect, useRef, useState } from 'react';

import { ChatInput } from '../Chat/ChatInput';
import { MessageList } from '../Chat/MessageList';
import { AvatarCharacter } from './AvatarCharacter';
import { AVATAR_STYLE_LABEL, loadAvatarStyle, saveAvatarStyle, type AvatarStyle } from '../../lib/avatarStyle';
import { desktop } from '../../lib/desktop';
import { Speaker, isSpeechSupported } from '../../lib/speech';
import { useChat } from '../../lib/useChat';
import './AvatarChat.css';

const STATUS_LABEL = {
  disconnected: 'Offline',
  connecting: 'Connecting…',
  connected: 'Online',
  reconnecting: 'Reconnecting…',
} as const;

export function AvatarChat() {
  const { messages, avatar, status, busy, send, retry } = useChat();
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(!isSpeechSupported());
  const [mouthOpen, setMouthOpen] = useState(0);
  const [style, setStyle] = useState<AvatarStyle>(loadAvatarStyle);

  const speakerRef = useRef<Speaker | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const speakingRef = useRef(false);
  const answeringRef = useRef(false);
  const boostRef = useRef(0);
  const rafRef = useRef<number | null>(null);

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

  return (
    <div className="avatar-chat" data-expanded={expanded ? 'true' : 'false'}>
      <div className="avatar-chat__grip" data-tauri-drag-region aria-hidden="true" />

      {expanded ? (
        <div className="avatar-chat__bubbles" aria-live="polite">
          {messages.length === 0 ? (
            <p className="avatar-chat__hello">Hi, I'm Buzz 🐝 — ask me anything.</p>
          ) : (
            <MessageList messages={messages} />
          )}
        </div>
      ) : null}

      <div className="avatar-chat__stage">
        <button
          className="avatar-chat__char"
          type="button"
          title={expanded ? 'Collapse' : 'Chat'}
          onClick={() => setExpanded((value) => !value)}
        >
          <AvatarCharacter state={avatar} mouthOpen={mouthOpen} style={style} />
        </button>
      </div>

      {expanded ? (
        <div className="avatar-chat__composer">
          <ChatInput disabled={busy} onSend={handleSend} />
          <div className="avatar-chat__meta">
            <span className="avatar-chat__status" data-variant={status}>
              <span className="avatar-chat__dot" aria-hidden="true" />
              {STATUS_LABEL[status]}
            </span>
            {isSpeechSupported() ? (
              <button
                className="avatar-chat__mute"
                type="button"
                aria-pressed={muted}
                onClick={() => {
                  setMuted((value) => {
                    const next = !value;
                    if (next) speakerRef.current?.cancel();
                    return next;
                  });
                }}
              >
                {muted ? '🔇 Voice off' : '🔊 Voice on'}
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
              🐝 {AVATAR_STYLE_LABEL[style]}
            </button>
            {messages.some((message) => message.error) ? (
              <button className="avatar-chat__retry" type="button" onClick={retry}>
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
