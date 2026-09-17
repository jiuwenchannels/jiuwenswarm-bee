/**
 * Conversation model + pure reducers (unit-tested). A finished assistant message
 * is the "honey" in the hive vocabulary (internal/naming.md).
 */
export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
  streaming?: boolean;
  error?: boolean;
  /** Set when the user stopped generation before the reply finished. */
  stopped?: boolean;
}

function makeId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

export function makeMessageId(prefix: string): string {
  return makeId(prefix);
}

export function addUserMessage(messages: ChatMessage[], text: string, now = Date.now()): ChatMessage[] {
  return [...messages, { id: makeId('user'), role: 'user', text, createdAt: now }];
}

export function startAssistantMessage(messages: ChatMessage[], now = Date.now()): ChatMessage[] {
  return [
    ...messages,
    { id: makeId('bee'), role: 'assistant', text: '', streaming: true, createdAt: now },
  ];
}

export function appendToLastAssistant(messages: ChatMessage[], token: string): ChatMessage[] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (last.role !== 'assistant') return messages;
  return [...messages.slice(0, -1), { ...last, text: last.text + token }];
}

function patchLast(messages: ChatMessage[], patch: Partial<ChatMessage>): ChatMessage[] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (last.role !== 'assistant') return messages;
  return [...messages.slice(0, -1), { ...last, ...patch }];
}

export function finishLastAssistant(messages: ChatMessage[]): ChatMessage[] {
  return patchLast(messages, { streaming: false });
}

export function stopLastAssistant(messages: ChatMessage[]): ChatMessage[] {
  return patchLast(messages, { streaming: false, stopped: true });
}

export function failLastAssistant(messages: ChatMessage[], text: string): ChatMessage[] {
  return patchLast(messages, { streaming: false, error: true, text });
}

/** Drop a message and everything after it (used to regenerate/edit in place). */
export function truncateFrom(messages: ChatMessage[], id: string): ChatMessage[] {
  const index = messages.findIndex((message) => message.id === id);
  return index < 0 ? messages : messages.slice(0, index);
}

/** The text of the most recent user message, for retry/regenerate. */
export function lastUserText(messages: ChatMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].text;
  }
  return undefined;
}
