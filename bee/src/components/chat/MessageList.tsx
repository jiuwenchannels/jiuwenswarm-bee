import { type ChatMessage } from '../../chat/messages';
import { MessageBubble } from './MessageBubble';
import './Chat.css';

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <ul className="messages" data-testid="bee-message-list" aria-live="polite" aria-atomic="false">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </ul>
  );
}
