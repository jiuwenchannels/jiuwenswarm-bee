import type { Locale } from '../i18n';

/**
 * The hidden instruction prepended in voice/avatar mode so the answer is quick
 * to listen to. It is never shown in the conversation — only the user's own
 * words are stored and displayed.
 */
export function voiceInstruction(locale: Locale): string {
  return locale === 'zh'
    ? '请用一到两句话简短回答，使用口语化的纯文本，不要 Markdown、列表或代码块。'
    : 'Answer in one or two short sentences of plain, speakable text. No markdown, lists, or code blocks.';
}

/** Wrap the user's words with the voice instruction. */
export function withVoiceInstruction(text: string, locale: Locale): string {
  return `${voiceInstruction(locale)}\n\n${text}`;
}
