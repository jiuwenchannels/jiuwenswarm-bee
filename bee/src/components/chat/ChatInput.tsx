import { type KeyboardEvent, useState } from 'react';
import './Chat.css';

export function ChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState('');

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      className="composer"
      data-testid="bee-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        className="composer__input"
        data-testid="bee-input"
        rows={1}
        placeholder="Ask Buzz anything…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Message"
      />
      <button className="composer__send" data-testid="bee-send" type="submit" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
}
