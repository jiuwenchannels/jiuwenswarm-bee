import { Fragment, useMemo } from 'react';

import { type ChatMessage } from '../../chat/messages';
import { MessageBubble } from './MessageBubble';
import './Chat.css';

export interface MessageListProps {
  messages: ChatMessage[];
  busy: boolean;
  onRegenerate: () => void;
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

function formatDay(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  if (sameDay(date.getTime(), today.getTime())) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function MessageList({
  messages,
  busy,
  onRegenerate,
  onRetry,
  onEdit,
}: MessageListProps) {
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return undefined;
  }, [messages]);

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
                {formatDay(message.createdAt)}
              </li>
            ) : null}
            <MessageBubble
              message={message}
              isLastAssistant={message.id === lastAssistantId}
              busy={busy}
              onRegenerate={onRegenerate}
              onRetry={onRetry}
              onEdit={onEdit}
            />
          </Fragment>
        );
      })}
    </ul>
  );
}
