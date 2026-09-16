import { useCallback, useEffect, useRef, useState } from 'react';

import { AvatarChat } from './components/Avatar/AvatarChat';
import { BeeAvatar } from './components/Avatar/BeeAvatar';
import { ChatInput } from './components/Chat/ChatInput';
import { MessageList } from './components/Chat/MessageList';
import { config } from './lib/config';
import type { GatewayStatus } from './lib/gateway';
import { useChat } from './lib/useChat';
import './styles.css';

const STATUS_LABEL: Record<GatewayStatus, string> = {
  disconnected: 'Offline',
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
};

const NEAR_BOTTOM_PX = 80;

/** The default chat app. */
function ChatApp() {
  const { messages, avatar, status, busy, send, retry, reset, reconnect, url } = useChat();
  const mainRef = useRef<HTMLElement | null>(null);
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const hasError = messages.some((message) => message.error);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    atBottomRef.current = true;
    setShowJump(false);
  }, []);

  const onScroll = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    atBottomRef.current = nearBottom;
    setShowJump(!nearBottom);
  }, []);

  // Follow new content only when the reader is already at the bottom.
  useEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div className="app" data-testid="bee-app">
      <header className="app__header">
        <h1 className="app__title" data-testid="bee-title">
          {config.appTitle}
        </h1>
        <div className="app__status" data-testid="bee-status" data-variant={status}>
          <span className="app__status-dot" aria-hidden="true" />
          {STATUS_LABEL[status]}
        </div>
      </header>

      <main className="app__main" ref={mainRef} onScroll={onScroll}>
        <BeeAvatar state={avatar} />

        {messages.length === 0 ? (
          <p className="app__empty" data-testid="bee-empty">
            Hi, I'm Buzz 🐝 — ask me anything.
          </p>
        ) : (
          <MessageList messages={messages} />
        )}
        {status === 'disconnected' ? (
          <div className="app__offline" data-testid="bee-connection-hint">
            <p className="app__offline-text">
              Can't reach JiuwenSwarm at <code>{url}</code>.
            </p>
            <button className="app__retry" data-testid="bee-reconnect" type="button" onClick={reconnect}>
              Reconnect
            </button>
          </div>
        ) : null}
        {hasError ? (
          <button className="app__retry" data-testid="bee-retry" type="button" onClick={retry}>
            Try again
          </button>
        ) : null}
      </main>

      {showJump ? (
        <button
          className="app__jump"
          data-testid="bee-jump-latest"
          type="button"
          onClick={() => scrollToBottom('smooth')}
        >
          ↓ Latest
        </button>
      ) : null}

      <footer className="app__footer">
        <ChatInput disabled={busy} onSend={send} />
        <button className="app__reset" data-testid="bee-reset" type="button" onClick={reset}>
          New chat
        </button>
      </footer>
    </div>
  );
}

export default function App() {
  // `#avatar` renders the inline avatar chat (used by the desktop shells).
  const avatarMode =
    typeof window !== 'undefined' && window.location.hash.replace(/^#/, '') === 'avatar';

  useEffect(() => {
    document.documentElement.dataset.mode = avatarMode ? 'avatar' : 'app';
  }, [avatarMode]);

  return avatarMode ? <AvatarChat /> : <ChatApp />;
}
