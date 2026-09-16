import { describe, expect, it } from 'vitest';

import {
  addUserMessage,
  appendToLastAssistant,
  failLastAssistant,
  finishLastAssistant,
  startAssistantMessage,
} from './messages';

describe('message reducers', () => {
  it('adds a user message', () => {
    const messages = addUserMessage([], 'hi');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ role: 'user', text: 'hi' });
  });

  it('starts a streaming assistant message', () => {
    const messages = startAssistantMessage(addUserMessage([], 'hi'));
    expect(messages.at(-1)).toMatchObject({ role: 'assistant', streaming: true, text: '' });
  });

  it('appends tokens to the last assistant message', () => {
    let messages = startAssistantMessage([]);
    messages = appendToLastAssistant(messages, 'Hel');
    messages = appendToLastAssistant(messages, 'lo');
    expect(messages.at(-1)?.text).toBe('Hello');
  });

  it('does not append to a user message', () => {
    const messages = appendToLastAssistant(addUserMessage([], 'hi'), 'x');
    expect(messages.at(-1)?.text).toBe('hi');
  });

  it('finishes and fails the last assistant message', () => {
    const streaming = startAssistantMessage([]);
    expect(finishLastAssistant(streaming).at(-1)).toMatchObject({ streaming: false });
    expect(failLastAssistant(streaming, 'boom').at(-1)).toMatchObject({
      error: true,
      streaming: false,
      text: 'boom',
    });
  });

  it('does not mutate the input array', () => {
    const original = addUserMessage([], 'hi');
    const next = startAssistantMessage(original);
    expect(original).toHaveLength(1);
    expect(next).toHaveLength(2);
  });
});
