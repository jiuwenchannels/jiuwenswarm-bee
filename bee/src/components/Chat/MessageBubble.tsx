import { type ChatMessage } from '../../lib/messages';
import './Chat.css';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const className = [
    'bubble',
    `bubble--${message.role}`,
    message.error ? 'bubble--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      className={className}
      data-testid="bee-message"
      data-variant={message.role}
      data-error={message.error ? 'true' : undefined}
    >
      <span className="bubble__text">{message.text}</span>
      {message.streaming ? <span className="bubble__caret" aria-hidden="true" /> : null}
    </li>
  );
}
