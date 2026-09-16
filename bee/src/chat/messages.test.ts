import { describe, expect, it } from 'vitest';

import {
  addUserMessage,
  appendToLastAssistant,
  failLastAssistant,
  finishLastAssistant,
  lastUserText,
  setFeedback,
  startAssistantMessage,
  stopLastAssistant,
  truncateFrom,
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

  it('marks the last assistant message as stopped', () => {
    const stopped = stopLastAssistant(startAssistantMessage([]));
    expect(stopped.at(-1)).toMatchObject({ streaming: false, stopped: true });
  });

  it('gives messages unique ids across calls', () => {
    const a = addUserMessage([], 'a')[0].id;
    const b = addUserMessage([], 'b')[0].id;
    expect(a).not.toBe(b);
  });

  it('truncates from a message id onwards', () => {
    let messages = addUserMessage([], 'first');
    const firstId = messages[0].id;
    messages = startAssistantMessage(messages);
    messages = addUserMessage(messages, 'second');
    expect(truncateFrom(messages, firstId)).toHaveLength(0);
    expect(truncateFrom(messages, 'missing')).toHaveLength(3);
  });

  it('toggles feedback per message', () => {
    const messages = startAssistantMessage([]);
    const id = messages[0].id;
    const up = setFeedback(messages, id, 'up');
    expect(up[0].feedback).toBe('up');
    expect(setFeedback(up, id, 'up')[0].feedback).toBeUndefined();
  });

  it('finds the last user text', () => {
    let messages = addUserMessage([], 'one');
    messages = startAssistantMessage(messages);
    messages = addUserMessage(messages, 'two');
    expect(lastUserText(messages)).toBe('two');
    expect(lastUserText(startAssistantMessage([]))).toBeUndefined();
  });
});
