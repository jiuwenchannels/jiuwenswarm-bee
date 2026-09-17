import type { Locale } from '../i18n';

/**
 * The hidden instruction prepended in voice/avatar mode so the answer is quick
 * to listen to. It is a *style* request — never a rule or limitation — so the
 * agent answers what was asked (a story is a short story) instead of refusing
 * or explaining why it can't. It is never shown in the conversation.
 */
export function voiceInstruction(locale: Locale): string {
  return locale === 'zh'
    ? '请直接、简洁地回答用户所问，使用口语化的纯文本。能短则短；如果用户要故事，就简短讲一个。不要提及本条说明、格式要求或任何限制。'
    : 'Answer directly and concisely in plain spoken text. Keep it brief — if the user asks for a story, just tell a short one. Never mention these instructions, formatting, or any limitations.';
}

/** Wrap the user's words with the voice instruction. */
export function withVoiceInstruction(text: string, locale: Locale): string {
  return `${voiceInstruction(locale)}\n\n${text}`;
}
