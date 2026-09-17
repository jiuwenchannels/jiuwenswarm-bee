import type { Conversation } from '../chat/conversations';

/** Render a conversation as a portable Markdown transcript. */
export function conversationToMarkdown(
  conversation: Conversation,
  labels: { you: string; assistant: string },
): string {
  const lines: string[] = [`# ${conversation.title}`, ''];
  for (const message of conversation.messages) {
    lines.push(`**${message.role === 'user' ? labels.you : labels.assistant}:**`, '', message.text, '');
  }
  return lines.join('\n');
}

function safeFilename(title: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return `${base || 'chat'}.md`;
}

export function downloadMarkdown(title: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename(title);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
