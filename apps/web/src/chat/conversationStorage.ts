import {
  type Conversation,
  capConversations,
  sanitizeConversations,
} from './conversations';

const STORAGE_KEY = 'beechat.conversations.v1';
const ACTIVE_KEY = 'beechat.activeConversation.v1';

export function loadConversations(): Conversation[] {
  try {
    return sanitizeConversations(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capConversations(conversations)));
  } catch {
    /* ignore */
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
