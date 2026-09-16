import { Check, Copy, FileText, Pencil, RefreshCw, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type ChatMessage } from '../../chat/messages';
import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import { copyText } from '../../lib/clipboard';
import { stripMarkdown } from '../../lib/markdown';
import { useToast } from '../common/ToastContext';
import { Markdown } from './Markdown';
import './Chat.css';

export interface MessageBubbleProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  busy: boolean;
  onRegenerate: () => void;
  onRetry: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

export function MessageBubble({
  message,
  isLastAssistant,
  busy,
  onRegenerate,
  onRetry,
  onEdit,
}: MessageBubbleProps) {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const isUser = message.role === 'user';
  const className = ['bubble', `bubble--${message.role}`, message.error ? 'bubble--error' : '']
    .filter(Boolean)
    .join(' ');

  const time = new Date(message.createdAt).toLocaleTimeString(
    locale === 'zh' ? 'zh-CN' : undefined,
    { hour: '2-digit', minute: '2-digit' },
  );

  async function copy(value: string) {
    if (await copyText(value)) {
      setCopied(true);
      notify(t.actions.copied, 'success');
    }
  }

  function startEdit() {
    setDraft(message.text);
    setEditing(true);
  }

  function saveEdit() {
    const text = draft.trim();
    if (!text) return;
    setEditing(false);
    onEdit(message.id, text);
  }

  return (
    <li
      className={className}
      data-testid="bee-message"
      data-variant={message.role}
      data-error={message.error ? 'true' : undefined}
      data-stopped={message.stopped ? 'true' : undefined}
    >
      {editing ? (
        <div className="bubble__edit">
          <textarea
            className="bubble__edit-input"
            value={draft}
            rows={Math.min(8, draft.split('\n').length)}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setEditing(false);
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) saveEdit();
            }}
            autoFocus
            aria-label={t.actions.edit}
          />
          <div className="bubble__edit-actions">
            <button type="button" className="bubble__btn" onClick={saveEdit}>
              {t.actions.save}
            </button>
            <button type="button" className="bubble__btn" onClick={() => setEditing(false)}>
              {t.actions.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="bubble__content">
          {isUser || message.streaming ? (
            <span className="bubble__text">{message.text}</span>
          ) : (
            <Markdown>{message.text}</Markdown>
          )}
          {message.streaming ? <span className="bubble__caret" aria-hidden="true" /> : null}
        </div>
      )}

      {message.error ? (
        <button
          className="bubble__retry"
          type="button"
          data-testid="bee-message-retry"
          onClick={() => onRetry(message.id)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          {t.actions.tryAgain}
        </button>
      ) : null}

      <div className="bubble__meta">
        {message.stopped ? <span className="bubble__tag">{t.actions.stopped}</span> : null}
        {message.edited ? <span className="bubble__tag">{t.actions.edited}</span> : null}
        {!message.streaming ? <time className="bubble__time">{time}</time> : null}
      </div>

      {!editing && !message.streaming ? (
        <div className="bubble__actions" data-testid="bee-message-actions">
          <button className="bubble__btn" type="button" onClick={() => copy(message.text)} title={t.actions.copy}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          </button>
          {isUser ? (
            <button className="bubble__btn" type="button" onClick={startEdit} title={t.actions.edit}>
              <Pencil size={14} aria-hidden="true" />
            </button>
          ) : (
            <>
              <button
                className="bubble__btn"
                type="button"
                onClick={() => copy(stripMarkdown(message.text))}
                title={t.actions.copyText}
              >
                <FileText size={14} aria-hidden="true" />
              </button>
              {isLastAssistant ? (
                <button
                  className="bubble__btn"
                  type="button"
                  disabled={busy}
                  onClick={onRegenerate}
                  title={t.actions.regenerate}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
