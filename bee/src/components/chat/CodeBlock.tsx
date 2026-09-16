import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { copyText } from '../../lib/clipboard';
import { useStrings } from '../../i18n/LocaleContext';
import './CodeBlock.css';

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const t = useStrings();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="code-block" data-testid="bee-code-block">
      <div className="code-block__bar">
        <span className="code-block__lang">{language || 'text'}</span>
        <button
          className="code-block__copy"
          type="button"
          onClick={onCopy}
          aria-label={t.actions.copyCode}
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          <span>{copied ? t.actions.copied : t.actions.copy}</span>
        </button>
      </div>
      <pre className="code-block__pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
