/**
 * Conversation model + pure reducers (unit-tested). A finished assistant message
 * is the "honey" in the hive vocabulary (internal/naming.md).
 */
export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  streaming?: boolean;
  error?: boolean;
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function addUserMessage(messages: ChatMessage[], text: string): ChatMessage[] {
  return [...messages, { id: nextId('user'), role: 'user', text }];
}

export function startAssistantMessage(messages: ChatMessage[]): ChatMessage[] {
  return [...messages, { id: nextId('bee'), role: 'assistant', text: '', streaming: true }];
}

export function appendToLastAssistant(messages: ChatMessage[], token: string): ChatMessage[] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (last.role !== 'assistant') return messages;
  return [...messages.slice(0, -1), { ...last, text: last.text + token }];
}

function patchLast(
  messages: ChatMessage[],
  patch: Partial<ChatMessage>,
): ChatMessage[] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (last.role !== 'assistant') return messages;
  return [...messages.slice(0, -1), { ...last, ...patch }];
}

export function finishLastAssistant(messages: ChatMessage[]): ChatMessage[] {
  return patchLast(messages, { streaming: false });
}

export function failLastAssistant(messages: ChatMessage[], text: string): ChatMessage[] {
  return patchLast(messages, { streaming: false, error: true, text });
}
