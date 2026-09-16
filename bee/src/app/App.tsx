import { Menu, Plus, Settings } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AvatarChat } from '../components/avatar/AvatarChat';
import { BeeAvatar } from '../components/avatar/BeeAvatar';
import { ChatInput, type ChatInputHandle } from '../components/chat/ChatInput';
import { MessageList } from '../components/chat/MessageList';
import { StarterPrompts } from '../components/chat/StarterPrompts';
import { CommandPalette } from '../components/common/CommandPalette';
import { HistorySidebar } from '../components/history/HistorySidebar';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { useLocaleContext, useStrings } from '../i18n/LocaleContext';
import { isNativeApp } from '../platform/desktop';
import { useAppConfig, useSettings } from '../settings/SettingsContext';
import { useChat } from '../chat/useChat';
import type { ThemePreference } from '../theme/theme';
import '../styles.css';

const NEAR_BOTTOM_PX = 80;
const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

/** The default chat app. */
function ChatApp() {
  const t = useStrings();
  const config = useAppConfig();
  const { settings, update } = useSettings();
  const { locale, setLocale } = useLocaleContext();
  const {
    messages,
    avatar,
    status,
    busy,
    send,
    stop,
    retry,
    regenerate,
    retryMessage,
    editMessage,
    feedback,
    reconnect,
    url,
    conversations,
    activeId,
    newChat,
    selectConversation,
    renameConversation,
    deleteConversation,
  } = useChat(config);

  const mainRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<ChatInputHandle>(null);
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
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

  useEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  const cycleTheme = useCallback(() => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(settings.theme) + 1) % THEME_CYCLE.length];
    update({ theme: next });
  }, [settings.theme, update]);

  // Global keyboard model: ⌘/Ctrl+K palette, `/` focuses the composer.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (event.key === '/' && !typing && !paletteOpen && !settingsOpen) {
        event.preventDefault();
        composerRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen, settingsOpen]);

  return (
    <div className="app" data-testid="bee-app">
      <header className="app__header">
        <div className="app__brand">
          <div className="app__brand-row">
            <button
              className="icon-btn"
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label={t.history.title}
              data-testid="bee-history-toggle"
            >
              <Menu size={18} aria-hidden="true" />
            </button>
            <div className="app__brand-text">
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
          </div>
        </div>
        <div className="app__header-center" data-testid="bee-avatar-status">
          {messages.length > 0 ? <BeeAvatar state={avatar} compact /> : null}
        </div>
        <div className="app__controls">
          <div className="app__status" data-testid="bee-status" data-variant={status}>
            <span className="app__status-dot" aria-hidden="true" />
            <span className="app__status-label">{t.status[status]}</span>
          </div>
          <button
            className="icon-btn"
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t.settings.title}
            data-testid="bee-settings-toggle"
          >
            <Settings size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={newChat}
            aria-label={t.actions.newChat}
            data-testid="bee-new-chat-header"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="app__main" ref={mainRef} onScroll={onScroll}>
        {messages.length === 0 ? (
          <>
            <BeeAvatar state={avatar} showLabel={false} />
            <p className="app__empty" data-testid="bee-empty">
              {t.hello}
            </p>
          </>
        ) : (
          <MessageList
            messages={messages}
            busy={busy}
            onFeedback={feedback}
            onRegenerate={regenerate}
            onRetry={retryMessage}
            onEdit={editMessage}
          />
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
        {messages.length === 0 && conversations.length === 1 ? (
          <StarterPrompts
            prompts={t.starters}
            onPick={(text) => composerRef.current?.setText(text)}
          />
        ) : null}
        <ChatInput
          ref={composerRef}
          disabled={busy}
          onSend={send}
          onStop={stop}
          draftKey={activeId}
        />
      </footer>

      {historyOpen ? (
        <HistorySidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
          onNew={newChat}
          onRename={renameConversation}
          onDelete={deleteConversation}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNewChat={newChat}
        onToggleTheme={cycleTheme}
        onSwitchLanguage={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
        onOpenSettings={() => setSettingsOpen(true)}
        onFocusComposer={() => composerRef.current?.focus()}
      />
    </div>
  );
}

export default function App() {
  const config = useAppConfig();
  // `#avatar` renders the inline avatar chat (used by the desktop shells).
  // The Android app (Capacitor) has no hash and opens straight into the avatar.
  const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
  const avatarMode = hash === 'avatar' || (isNativeApp() && hash === '');

  useEffect(() => {
    document.documentElement.dataset.mode = avatarMode ? 'avatar' : 'app';
  }, [avatarMode]);

  useEffect(() => {
    document.title = config.appTitle;
  }, [config.appTitle]);

  return avatarMode ? <AvatarChat /> : <ChatApp />;
}
