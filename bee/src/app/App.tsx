import { useCallback, useEffect, useRef, useState } from 'react';

import { AvatarChat } from '../components/avatar/AvatarChat';
import { BeeAvatar } from '../components/avatar/BeeAvatar';
import { ChatInput } from '../components/chat/ChatInput';
import { MessageList } from '../components/chat/MessageList';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { config } from '../gateway/config';
import { useStrings } from '../i18n/LocaleContext';
import { useChat } from '../chat/useChat';
import '../styles.css';

const NEAR_BOTTOM_PX = 80;

/** The default chat app. */
function ChatApp() {
  const t = useStrings();
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
        <div className="app__brand">
          <h1 className="app__title" data-testid="bee-title">
            {config.appTitle}
          </h1>
          <p className="app__powered" data-testid="bee-powered">
            {t.poweredBy} ·{' '}
            <a
              className="app__credit"
              data-testid="bee-openjiuwen"
              href="https://github.com/openjiuwen"
              target="_blank"
              rel="noreferrer noopener"
            >
              {t.attribution}
            </a>
          </p>
        </div>
        <div className="app__status" data-testid="bee-status" data-variant={status}>
          <span className="app__status-dot" aria-hidden="true" />
          {t.status[status]}
        </div>
      </header>

      <main className="app__main" ref={mainRef} onScroll={onScroll}>
        <BeeAvatar state={avatar} showLabel={messages.length > 0} />

        {messages.length === 0 ? (
          <p className="app__empty" data-testid="bee-empty">
            {t.hello}
          </p>
        ) : (
          <MessageList messages={messages} />
        )}
        {status === 'disconnected' ? (
          <div className="app__offline" data-testid="bee-connection-hint">
            <p className="app__offline-text">{t.offline(url)}</p>
            <button className="app__retry" data-testid="bee-reconnect" type="button" onClick={reconnect}>
              {t.actions.reconnect}
            </button>
          </div>
        ) : null}
        {hasError ? (
          <button className="app__retry" data-testid="bee-retry" type="button" onClick={retry}>
            {t.actions.tryAgain}
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
          {t.actions.latest}
        </button>
      ) : null}

      <footer className="app__footer">
        <ChatInput disabled={busy} onSend={send} />
        <div className="app__footer-row">
          <LanguageToggle />
          <button className="app__reset" data-testid="bee-reset" type="button" onClick={reset}>
            {t.actions.newChat}
          </button>
        </div>
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

  useEffect(() => {
    document.title = config.appTitle;
  }, []);

  return avatarMode ? <AvatarChat /> : <ChatApp />;
}
