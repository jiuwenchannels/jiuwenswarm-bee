import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';

import { type ChatMessage } from '../../chat/messages';
import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import { copyText } from '../../lib/clipboard';
import { stripMarkdown } from '../../lib/markdown';
import { isSpeechSupported } from '../../platform/speech';
import { speakText, stopSpeaking, useSpeaking } from '../../platform/speakerStore';
import { useToast } from '../common/ToastContext';
import './Chat.css';

const Markdown = lazy(() => import('./Markdown').then((module) => ({ default: module.Markdown })));

const COLLAPSE_AT = 1200;

export interface MessageBubbleProps {
  message: ChatMessage;
  dimmed?: boolean;
  onRetry: (id: string) => void;
}

export function MessageBubble({ message, dimmed = false, onRetry }: MessageBubbleProps) {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const { notify } = useToast();
  const speaking = useSpeaking();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const isUser = message.role === 'user';
  const canCollapse = !isUser && message.text.length > COLLAPSE_AT;
  const collapsed = canCollapse && !expanded;
  const className = [
    'bubble',
    `bubble--${message.role}`,
    message.error ? 'bubble--error' : '',
    dimmed ? 'bubble--dimmed' : '',
  ]
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

  return (
    <li
      className={className}
      data-testid="bee-message"
      data-message-id={message.id}
      data-variant={message.role}
      data-error={message.error ? 'true' : undefined}
      data-stopped={message.stopped ? 'true' : undefined}
    >
      <div
        className={['bubble__content', collapsed ? 'bubble__content--clamped' : '']
          .filter(Boolean)
          .join(' ')}
      >
        {isUser || message.streaming ? (
          <span className="bubble__text">{message.text}</span>
        ) : (
          <Suspense fallback={<span className="bubble__text">{message.text}</span>}>
            <Markdown>{message.text}</Markdown>
          </Suspense>
        )}
        {message.streaming ? <span className="bubble__caret" aria-hidden="true" /> : null}
      </div>

      {canCollapse ? (
        <button
          className="bubble__more"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
          {expanded ? t.actions.showLess : t.actions.showMore}
        </button>
      ) : null}

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

      {!message.streaming ? (
        <div className="bubble__foot" data-testid="bee-message-actions">
          {message.stopped ? <span className="bubble__tag">{t.actions.stopped}</span> : null}
          <time className="bubble__time">{time}</time>
          <div className="bubble__actions">
            <button className="bubble__btn" type="button" onClick={() => copy(message.text)} title={t.actions.copy}>
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            </button>
            {isUser ? null : (
              <>
                <button
                  className="bubble__btn"
                  type="button"
                  onClick={() => copy(stripMarkdown(message.text))}
                  title={t.actions.copyText}
                >
                  <FileText size={14} aria-hidden="true" />
                </button>
                {isSpeechSupported() ? (
                  <button
                    className="bubble__btn"
                    type="button"
                    data-active={speaking ? 'true' : undefined}
                    onClick={() => (speaking ? stopSpeaking() : speakText(message.text))}
                    title={speaking ? t.actions.stopSpeaking : t.actions.speak}
                  >
                    {speaking ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}
