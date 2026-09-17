import { Menu, Plus, Search, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AvatarChat } from '../components/avatar/AvatarChat';
import { BeeAvatar } from '../components/avatar/BeeAvatar';
import { ChatInput, type ChatInputHandle } from '../components/chat/ChatInput';
import { FindBar } from '../components/chat/FindBar';
import { MessageList } from '../components/chat/MessageList';
import { StarterPrompts } from '../components/chat/StarterPrompts';
import { CommandPalette } from '../components/common/CommandPalette';
import { useToast } from '../components/common/ToastContext';
import { HistorySidebar } from '../components/history/HistorySidebar';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { useStrings } from '../i18n/LocaleContext';
import { conversationToMarkdown, downloadMarkdown } from '../lib/export';
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
  const { notify } = useToast();
  const {
    messages,
    avatar,
    status,
    busy,
    send,
    stop,
    retry,
    retryMessage,
    reconnect,
    url,
    conversations,
    activeId,
    newChat,
    selectConversation,
    renameConversation,
    deleteConversation,
    undoDelete,
  } = useChat(config);

  const mainRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<ChatInputHandle>(null);
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findIndex, setFindIndex] = useState(0);
  const hasError = messages.some((message) => message.error);
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent);

  const matches = useMemo(() => {
    const needle = findQuery.trim().toLowerCase();
    if (!needle) return [] as string[];
    return messages.filter((message) => message.text.toLowerCase().includes(needle)).map((m) => m.id);
  }, [messages, findQuery]);

  // Keep the cursor valid: reset on a new query, and clamp when the match set
  // shrinks (streaming/message edits) so the counter never shows e.g. 4/2.
  useEffect(() => {
    setFindIndex(0);
  }, [findQuery]);

  useEffect(() => {
    setFindIndex((current) =>
      matches.length === 0 ? 0 : Math.min(current, matches.length - 1),
    );
  }, [matches.length]);

  // Reflect the drawer state on the root so the desktop layout can dock it.
  useEffect(() => {
    document.documentElement.dataset.history = historyOpen ? 'open' : 'closed';
    return () => {
      delete document.documentElement.dataset.history;
    };
  }, [historyOpen]);

  // Keep the composer above the mobile keyboard.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty('--kb-inset', `${inset}px`);
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    update();
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--kb-inset');
    };
  }, []);

  const startNewChat = useCallback(() => {
    newChat();
    setFindOpen(false);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [newChat]);

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

  const handleSend = useCallback(
    (text: string) => {
      atBottomRef.current = true;
      send(text);
      requestAnimationFrame(() => scrollToBottom('smooth'));
    },
    [send, scrollToBottom],
  );

  const cycleTheme = useCallback(() => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(settings.theme) + 1) % THEME_CYCLE.length];
    update({ theme: next });
  }, [settings.theme, update]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteConversation(id);
      notify(t.history.deleted, { action: { label: t.actions.undo, onClick: undoDelete } });
    },
    [deleteConversation, undoDelete, notify, t],
  );

  const handleExport = useCallback(() => {
    const active = conversations.find((conversation) => conversation.id === activeId);
    if (!active || active.messages.length === 0) return;
    downloadMarkdown(
      active.title,
      conversationToMarkdown(active, { you: t.history.you, assistant: t.character }),
    );
    notify(t.history.exported, 'success');
  }, [activeId, conversations, notify, t]);

  const jumpToMatch = useCallback(
    (position: number) => {
      if (matches.length === 0) return;
      const id = matches[((position % matches.length) + matches.length) % matches.length];
      const el = mainRef.current?.querySelector(`[data-message-id="${id}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    [matches],
  );

  const findNext = useCallback(() => {
    setFindIndex((current) => {
      const next = matches.length ? (current + 1) % matches.length : 0;
      jumpToMatch(next);
      return next;
    });
  }, [matches.length, jumpToMatch]);

  const findPrev = useCallback(() => {
    setFindIndex((current) => {
      const prev = matches.length ? (current - 1 + matches.length) % matches.length : 0;
      jumpToMatch(prev);
      return prev;
    });
  }, [matches.length, jumpToMatch]);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setFindQuery('');
  }, []);

  // Global keyboard model: ⌘/Ctrl+K palette, ⌘/Ctrl+F find, `/` focus composer.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFindOpen(true);
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
              onClick={() => setHistoryOpen((value) => !value)}
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
        <div className="app__header-center" data-testid="bee-avatar-status" title={t.tagline}>
          {messages.length > 0 ? <BeeAvatar state={avatar} compact /> : null}
        </div>
        <div className="app__controls">
          {status !== 'connected' ? (
            <div className="app__status" data-testid="bee-status" data-variant={status}>
              <span className="app__status-dot" aria-hidden="true" />
              <span className="app__status-label">{t.status[status]}</span>
            </div>
          ) : null}
          <button
            className="app__cmd"
            type="button"
            onClick={() => setPaletteOpen(true)}
            title={t.command.title}
            aria-label={t.command.title}
            aria-keyshortcuts="Control+K Meta+K"
            data-testid="bee-palette-toggle"
          >
            <Search className="app__cmd-icon" size={13} aria-hidden="true" />
            <span className="app__cmd-keys" aria-hidden="true">
              {isMac ? (
                <>
                  <kbd>⌘</kbd>
                  <kbd>K</kbd>
                </>
              ) : (
                <>
                  <kbd>Ctrl</kbd>
                  <kbd>K</kbd>
                </>
              )}
            </span>
          </button>
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
            onClick={startNewChat}
            aria-label={t.actions.newChat}
            data-testid="bee-new-chat-header"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {status === 'disconnected' ? (
        <div className="app__banner" data-testid="bee-connection-hint">
          <span className="app__banner-text">{t.offline(url)}</span>
          <button className="app__banner-btn" data-testid="bee-reconnect" type="button" onClick={reconnect}>
            {t.actions.reconnect}
          </button>
          <button
            className="app__banner-btn"
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            {t.actions.configure}
          </button>
        </div>
      ) : null}

      <main className="app__main" ref={mainRef} onScroll={onScroll}>
        {findOpen ? (
          <FindBar
            query={findQuery}
            onQuery={setFindQuery}
            total={matches.length}
            index={findIndex}
            onNext={findNext}
            onPrev={findPrev}
            onClose={closeFind}
          />
        ) : null}

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
            findQuery={findQuery}
            onRetry={retryMessage}
          />
        )}
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
        {messages.length === 0 && (settings.alwaysShowStarters || conversations.length === 1) ? (
          <StarterPrompts
            prompts={t.starters}
            onPick={(text) => composerRef.current?.setText(text)}
          />
        ) : null}
        <ChatInput
          ref={composerRef}
          disabled={busy}
          onSend={handleSend}
          onStop={stop}
          draftKey={activeId}
        />
        <p className="app__footer-credit">
          {t.poweredBy} ·{' '}
          <a
            className="app__credit"
            href="https://github.com/openjiuwen"
            target="_blank"
            rel="noreferrer noopener"
          >
            {t.attribution}
          </a>
        </p>
      </footer>

      {historyOpen ? (
        <>
          <div
            className="app__scrim"
            data-testid="bee-history-backdrop"
            onClick={() => setHistoryOpen(false)}
          />
          <HistorySidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={selectConversation}
            onNew={startNewChat}
            onRename={renameConversation}
            onDelete={handleDelete}
            onClose={() => setHistoryOpen(false)}
          />
        </>
      ) : null}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNewChat={startNewChat}
        onToggleTheme={cycleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onFocusComposer={() => composerRef.current?.focus()}
        onExport={handleExport}
        onFind={() => setFindOpen(true)}
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
