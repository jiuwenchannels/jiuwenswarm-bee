import type { ChatMessage } from './messages';

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export const UNTITLED_TITLE = 'New chat';
export const MAX_CONVERSATIONS = 50;
const MAX_TITLE_LENGTH = 48;

function makeId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `conv-${random}`;
}

/** A short, human title derived from the first prompt. */
export function deriveTitle(text: string): string {
  const firstLine = text.trim().split(/\r?\n/, 1)[0] ?? '';
  const clean = firstLine.replace(/\s+/g, ' ').trim();
  if (!clean) return UNTITLED_TITLE;
  return clean.length > MAX_TITLE_LENGTH ? `${clean.slice(0, MAX_TITLE_LENGTH - 1)}…` : clean;
}

export function createConversation(now = Date.now()): Conversation {
  return { id: makeId(), title: UNTITLED_TITLE, createdAt: now, updatedAt: now, messages: [] };
}

function firstUserText(messages: ChatMessage[]): string | undefined {
  return messages.find((message) => message.role === 'user')?.text;
}

/** Replace a conversation's messages, refreshing `updatedAt` and default title. */
export function withMessages(
  conversation: Conversation,
  messages: ChatMessage[],
  now = Date.now(),
): Conversation {
  const shouldTitle = conversation.title === UNTITLED_TITLE;
  const prompt = shouldTitle ? firstUserText(messages) : undefined;
  return {
    ...conversation,
    messages,
    updatedAt: now,
    title: prompt ? deriveTitle(prompt) : conversation.title,
  };
}

export function renameConversation(conversation: Conversation, title: string): Conversation {
  const clean = title.replace(/\s+/g, ' ').trim();
  return { ...conversation, title: clean || UNTITLED_TITLE, updatedAt: Date.now() };
}

export function sortByRecency(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function capConversations(conversations: Conversation[]): Conversation[] {
  return sortByRecency(conversations).slice(0, MAX_CONVERSATIONS);
}

function isMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.text === 'string'
  );
}

function sanitizeMessage(raw: unknown): ChatMessage | null {
  if (!isMessage(raw)) return null;
  return {
    id: raw.id,
    role: raw.role,
    text: raw.text,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    streaming: false,
    error: raw.error === true,
    stopped: raw.stopped === true,
    feedback: raw.feedback === 'up' || raw.feedback === 'down' ? raw.feedback : undefined,
  };
}

/** Validate a stored conversation; returns null when the shape is unusable. */
export function sanitizeConversation(raw: unknown): Conversation | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== 'string') return null;
  const messages = Array.isArray(value.messages)
    ? value.messages.map(sanitizeMessage).filter((message): message is ChatMessage => message !== null)
    : [];
  const now = Date.now();
  return {
    id: value.id,
    title: typeof value.title === 'string' && value.title.trim() ? value.title : UNTITLED_TITLE,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : now,
    messages,
  };
}

export function sanitizeConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  return capConversations(
    raw.map(sanitizeConversation).filter((conversation): conversation is Conversation => conversation !== null),
  );
}
