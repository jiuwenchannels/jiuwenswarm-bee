import { type KeyboardEvent, useState } from 'react';
import { useStrings } from '../../i18n/LocaleContext';
import './Chat.css';

export function ChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const t = useStrings();
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
        placeholder={t.composer.placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label={t.composer.ariaLabel}
      />
      <button className="composer__send" data-testid="bee-send" type="submit" disabled={disabled || !value.trim()}>
        {t.composer.send}
      </button>
    </form>
  );
}
