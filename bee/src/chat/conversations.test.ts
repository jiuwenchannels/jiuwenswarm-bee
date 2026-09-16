import { describe, expect, it } from 'vitest';

import {
  UNTITLED_TITLE,
  createConversation,
  deriveTitle,
  renameConversation,
  sanitizeConversation,
  sanitizeConversations,
  withMessages,
} from './conversations';
import { addUserMessage, startAssistantMessage } from './messages';

describe('conversations', () => {
  it('derives a short title from the first prompt', () => {
    expect(deriveTitle('  Hello   there  ')).toBe('Hello there');
    expect(deriveTitle('line one\nline two')).toBe('line one');
    expect(deriveTitle('   ')).toBe(UNTITLED_TITLE);
    expect(deriveTitle('x'.repeat(80))).toHaveLength(48);
  });

  it('titles an untitled conversation from its first user message', () => {
    const conversation = createConversation();
    const messages = addUserMessage([], 'Plan a weekend in Kyoto');
    const updated = withMessages(conversation, messages);
    expect(updated.title).toBe('Plan a weekend in Kyoto');
    expect(updated.messages).toHaveLength(1);
  });

  it('does not overwrite a custom title', () => {
    const conversation = renameConversation(createConversation(), 'My chat');
    const updated = withMessages(conversation, addUserMessage([], 'Something else'));
    expect(updated.title).toBe('My chat');
  });

  it('falls back to the default title when renamed to blank', () => {
    expect(renameConversation(createConversation(), '   ').title).toBe(UNTITLED_TITLE);
  });

  it('sanitizes stored conversations, dropping junk', () => {
    expect(sanitizeConversation(null)).toBeNull();
    expect(sanitizeConversation({ id: 42 })).toBeNull();
    expect(sanitizeConversations('nope')).toEqual([]);

    const stored = {
      id: 'c1',
      title: 'Kept',
      messages: [
        { id: 'm1', role: 'user', text: 'hi', createdAt: 1 },
        { id: 'bad', role: 'system', text: 'x' },
      ],
    };
    const [conversation] = sanitizeConversations([stored]);
    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0]).toMatchObject({ id: 'm1', role: 'user', streaming: false });
  });

  it('marks restored streaming messages as finished', () => {
    const stored = {
      id: 'c1',
      title: 'T',
      messages: [{ id: 'm1', role: 'assistant', text: 'partial', streaming: true }],
    };
    const [conversation] = sanitizeConversations([stored]);
    expect(conversation.messages[0].streaming).toBe(false);
  });

  it('gives each conversation a unique id', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createConversation().id));
    expect(ids.size).toBe(50);
  });

  it('starts a fresh conversation empty', () => {
    const conversation = createConversation();
    expect(conversation.messages).toEqual([]);
    expect(conversation.title).toBe(UNTITLED_TITLE);
  });

  it('keeps an assistant-only message set in sync', () => {
    const conversation = createConversation();
    const messages = startAssistantMessage([]);
    expect(withMessages(conversation, messages).messages).toHaveLength(1);
  });
});
