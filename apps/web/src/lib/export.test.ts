import { describe, expect, it } from 'vitest';

import { createConversation, withMessages } from '../chat/conversations';
import { addUserMessage, startAssistantMessage, appendToLastAssistant, finishLastAssistant } from '../chat/messages';
import { conversationToMarkdown } from './export';

describe('conversationToMarkdown', () => {
  it('renders a titled transcript with role labels', () => {
    let messages = addUserMessage([], 'Hello');
    messages = startAssistantMessage(messages);
    messages = appendToLastAssistant(messages, 'Hi there');
    messages = finishLastAssistant(messages);
    const conversation = withMessages(createConversation(), messages, 1_700_000_000_000);
    conversation.title = 'Greeting';

    const markdown = conversationToMarkdown(conversation, { you: 'You', assistant: 'Buzz' });

    expect(markdown).toContain('# Greeting');
    expect(markdown).toContain('**You:**');
    expect(markdown).toContain('**Buzz:**');
    expect(markdown).toContain('Hello');
    expect(markdown).toContain('Hi there');
  });
});
