import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Conversation } from '../../chat/conversations';
import { useStrings } from '../../i18n/LocaleContext';
import './HistorySidebar.css';

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation) => {
      if (conversation.title.toLowerCase().includes(needle)) return true;
      return conversation.messages.some((message) => message.text.toLowerCase().includes(needle));
    });
  }, [conversations, query]);

  function commitRename() {
    if (editing && editing.value.trim()) onRename(editing.id, editing.value.trim());
    setEditing(null);
  }

  return (
    <aside className="history" data-testid="bee-history" aria-label={t.history.title}>
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
        {filtered.length === 0 ? (
          <p className="history__empty">{t.history.empty}</p>
        ) : (
          filtered.map((conversation) => {
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
                    onChange={(event) => setEditing({ id: conversation.id, value: event.target.value })}
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
                    <span className="history__item-time">{relativeTime(conversation.updatedAt)}</span>
                  </button>
                )}

                <div className="history__item-actions">
                  {editing?.id === conversation.id ? (
                    <button className="icon-btn icon-btn--sm" type="button" onClick={commitRename} aria-label={t.actions.save}>
                      <Check size={14} aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      className="icon-btn icon-btn--sm"
                      type="button"
                      onClick={() => setEditing({ id: conversation.id, value: conversation.title })}
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
          })
        )}
      </nav>
    </aside>
  );
}
