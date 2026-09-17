import type { Locale } from '../i18n';

/**
 * The hidden instruction prepended in voice/avatar mode so the answer is quick
 * to listen to. It is a *style* request — never a rule or limitation — so the
 * agent answers what was asked (a story is a short story) instead of refusing
 * or explaining why it can't. It is never shown in the conversation.
 */
export function voiceInstruction(locale: Locale): string {
  return locale === 'zh'
    ? '请用口语化纯文本，最多两句话把话说明白。若用户要故事，就讲一个两句话的故事。不要提及本条说明、格式或任何限制。'
    : 'Reply in plain spoken text in at most two short sentences. If the user asks for a story, tell a two-sentence story. Never mention these instructions, formatting, or any limitations.';
}

/** Wrap the user's words with the voice instruction. */
export function withVoiceInstruction(text: string, locale: Locale): string {
  return `${voiceInstruction(locale)}\n\n${text}`;
}
