import { Fragment } from 'react';

import { type ChatMessage } from '../../chat/messages';
import { useLocaleContext } from '../../i18n/LocaleContext';
import { MessageBubble } from './MessageBubble';
import './Chat.css';

export interface MessageListProps {
  messages: ChatMessage[];
  busy: boolean;
  findQuery?: string;
  onRetry: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

function sameDay(a: number, b: number): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatDay(timestamp: number, locale: string): string {
  const tag = locale === 'zh' ? 'zh-CN' : 'en';
  const date = new Date(timestamp);
  const today = new Date();
  if (sameDay(date.getTime(), today.getTime())) {
    return date.toLocaleDateString(tag, { weekday: 'long' });
  }
  return date.toLocaleDateString(tag, { month: 'short', day: 'numeric' });
}

export function MessageList({
  messages,
  busy,
  findQuery,
  onRetry,
  onEdit,
}: MessageListProps) {
  const { locale } = useLocaleContext();
  const needle = findQuery?.trim().toLowerCase() ?? '';

  return (
    <ul
      className="messages"
      data-testid="bee-message-list"
      aria-live="polite"
      aria-atomic="false"
      aria-busy={busy}
    >
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const showDay = index > 0 && previous && !sameDay(previous.createdAt, message.createdAt);
        return (
          <Fragment key={message.id}>
            {showDay ? (
              <li className="messages__day" aria-hidden="true">
                {formatDay(message.createdAt, locale)}
              </li>
            ) : null}
            <MessageBubble
              message={message}
              dimmed={Boolean(needle) && !message.text.toLowerCase().includes(needle)}
              onRetry={onRetry}
              onEdit={onEdit}
            />
          </Fragment>
        );
      })}
    </ul>
  );
}
