import { Check, Copy, Pencil, RefreshCw, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type ChatMessage, type Feedback } from '../../chat/messages';
import { useStrings } from '../../i18n/LocaleContext';
import { copyText } from '../../lib/clipboard';
import { useToast } from '../common/ToastContext';
import { Markdown } from './Markdown';
import './Chat.css';

export interface MessageBubbleProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  busy: boolean;
  onFeedback: (id: string, value: Feedback) => void;
  onRegenerate: () => void;
  onRetry: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

export function MessageBubble({
  message,
  isLastAssistant,
  busy,
  onFeedback,
  onRegenerate,
  onRetry,
  onEdit,
}: MessageBubbleProps) {
  const t = useStrings();
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

  async function copy() {
    if (await copyText(message.text)) {
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
          {isUser ? (
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

      {message.stopped ? <span className="bubble__stopped">{t.actions.stopped}</span> : null}

      {!editing && !message.streaming ? (
        <div className="bubble__actions" data-testid="bee-message-actions">
          <button className="bubble__btn" type="button" onClick={copy} title={t.actions.copy}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          </button>
          {isUser ? (
            <button className="bubble__btn" type="button" onClick={startEdit} title={t.actions.edit}>
              <Pencil size={14} aria-hidden="true" />
            </button>
          ) : (
            <>
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
              <button
                className="bubble__btn"
                type="button"
                aria-pressed={message.feedback === 'up'}
                data-active={message.feedback === 'up' ? 'true' : undefined}
                onClick={() => onFeedback(message.id, 'up')}
              >
                <ThumbsUp size={14} aria-hidden="true" />
              </button>
              <button
                className="bubble__btn"
                type="button"
                aria-pressed={message.feedback === 'down'}
                data-active={message.feedback === 'down' ? 'true' : undefined}
                onClick={() => onFeedback(message.id, 'down')}
              >
                <ThumbsDown size={14} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
