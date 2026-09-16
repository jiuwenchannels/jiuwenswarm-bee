import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import type { Conversation } from '../../chat/conversations';
import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import './HistorySidebar.css';

function relativeTime(timestamp: number, locale: string): string {
  const tag = locale === 'zh' ? 'zh-CN' : 'en';
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' });
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return rtf.format(-Math.max(seconds, 0), 'second');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 7) return rtf.format(-days, 'day');
  return new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric' }).format(timestamp);
}

type Bucket = 'today' | 'previous7' | 'older';

function bucketOf(timestamp: number): Bucket {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (timestamp >= startOfToday.getTime()) return 'today';
  if (timestamp >= startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000) return 'previous7';
  return 'older';
}

export function HistorySidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const touchStart = useRef<number | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation) => {
      if (conversation.title.toLowerCase().includes(needle)) return true;
      return conversation.messages.some((message) => message.text.toLowerCase().includes(needle));
    });
  }, [conversations, query]);

  const groups = useMemo(() => {
    const order: Bucket[] = ['today', 'previous7', 'older'];
    const labels: Record<Bucket, string> = {
      today: t.history.today,
      previous7: t.history.previous7,
      older: t.history.older,
    };
    return order
      .map((bucket) => ({
        bucket,
        label: labels[bucket],
        items: filtered.filter((conversation) => bucketOf(conversation.updatedAt) === bucket),
      }))
      .filter((group) => group.items.length > 0);
  }, [filtered, t]);

  function commitRename() {
    if (editing && editing.value.trim()) onRename(editing.id, editing.value.trim());
    setEditing(null);
  }

  return (
    <aside
      className="history"
      data-testid="bee-history"
      aria-label={t.history.title}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        const end = event.changedTouches[0]?.clientX;
        if (start !== null && end !== undefined && end - start < -60) onClose();
      }}
    >
      <header className="history__header">
        <h2 className="history__title">{t.history.title}</h2>
        <button className="icon-btn" type="button" onClick={onClose} aria-label={t.actions.close}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <button className="history__new" type="button" onClick={onNew} data-testid="bee-new-chat">
        <Plus size={16} aria-hidden="true" />
        {t.actions.newChat}
      </button>

      <div className="history__search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.history.searchPlaceholder}
          aria-label={t.actions.search}
        />
      </div>

      <nav className="history__list" aria-label={t.history.title}>
        {groups.length === 0 ? (
          <p className="history__empty">{t.history.empty}</p>
        ) : (
          groups.map((group) => (
            <div key={group.bucket} className="history__group">
              <p className="history__group-label">{group.label}</p>
              {group.items.map((conversation) => {
                const isActive = conversation.id === activeId;
                return (
                  <div
                    key={conversation.id}
                    className="history__item"
                    data-active={isActive ? 'true' : undefined}
                  >
                    {editing?.id === conversation.id ? (
                      <input
                        className="history__rename"
                        value={editing.value}
                        autoFocus
                        onChange={(event) =>
                          setEditing({ id: conversation.id, value: event.target.value })
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitRename();
                          if (event.key === 'Escape') setEditing(null);
                        }}
                        onBlur={commitRename}
                        aria-label={t.actions.rename}
                      />
                    ) : (
                      <button
                        className="history__select"
                        type="button"
                        onClick={() => {
                          onSelect(conversation.id);
                          onClose();
                        }}
                      >
                        <span className="history__item-title">{conversation.title}</span>
                        <span className="history__item-time">
                          {relativeTime(conversation.updatedAt, locale)}
                        </span>
                      </button>
                    )}

                    <div className="history__item-actions">
                      {editing?.id === conversation.id ? (
                        <button
                          className="icon-btn icon-btn--sm"
                          type="button"
                          onClick={commitRename}
                          aria-label={t.actions.save}
                        >
                          <Check size={14} aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          className="icon-btn icon-btn--sm"
                          type="button"
                          onClick={() =>
                            setEditing({ id: conversation.id, value: conversation.title })
                          }
                          aria-label={t.actions.rename}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                      )}
                      {confirmId === conversation.id ? (
                        <button
                          className="icon-btn icon-btn--sm icon-btn--danger"
                          type="button"
                          onClick={() => {
                            onDelete(conversation.id);
                            setConfirmId(null);
                          }}
                          aria-label={t.actions.delete}
                        >
                          <Check size={14} aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          className="icon-btn icon-btn--sm"
                          type="button"
                          onClick={() => setConfirmId(conversation.id)}
                          aria-label={t.actions.delete}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
