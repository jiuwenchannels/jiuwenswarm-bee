import { describe, expect, it, vi } from 'vitest';

import type { WebSocketLike } from './protocol';
import {
  ProductGatewayClient,
  isTerminalEvent,
  parseProductFrame,
  productDeltaText,
  productErrorMessage,
} from './gatewayProduct';

class FakeSocket implements WebSocketLike {
  sent: string[] = [];
  private handlers: Record<string, Array<(event: { data?: unknown }) => void>> = {};

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.emit('close', {});
  }

  addEventListener(type: 'open' | 'close' | 'error' | 'message', handler: (event: { data?: unknown }) => void): void {
    (this.handlers[type] ??= []).push(handler);
  }

  message(obj: unknown): void {
    this.emit('message', { data: JSON.stringify(obj) });
  }

  private emit(type: string, event: { data?: unknown }): void {
    for (const handler of this.handlers[type] ?? []) handler(event);
  }
}

describe('product protocol helpers', () => {
  it('parses frames and rejects junk', () => {
    expect(parseProductFrame('{"type":"event","event":"connection.ack"}')).toMatchObject({
      type: 'event',
      event: 'connection.ack',
    });
    expect(() => parseProductFrame('nope')).toThrow(/non-JSON/);
  });

  it('extracts delta text and error messages', () => {
    expect(productDeltaText({ content: 'hi' })).toBe('hi');
    expect(productDeltaText({ content: '' })).toBeNull();
    expect(productDeltaText(undefined)).toBeNull();
    expect(productErrorMessage({ message: 'boom' })).toBe('boom');
    expect(productErrorMessage({ content: 'bad' })).toBe('bad');
    expect(productErrorMessage(undefined)).toBe('Agent error');
  });

  it('decides terminal events', () => {
    expect(isTerminalEvent('chat.final', {})).toBe(true);
    expect(isTerminalEvent('chat.final', { event_type: 'team.runtime_ready' })).toBe(false);
    expect(isTerminalEvent('chat.processing_status', { is_processing: false })).toBe(true);
    expect(isTerminalEvent('chat.processing_status', { is_processing: true })).toBe(false);
    expect(isTerminalEvent('chat.error', {})).toBe(true);
  });
});

describe('ProductGatewayClient', () => {
  function setup() {
    const socket = new FakeSocket();
    const onToken = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();
    const client = new ProductGatewayClient(
      { url: 'ws://test/ws', reconnect: false, socketFactory: () => socket },
      { onToken, onDone, onError },
    );
    return { socket, client, onToken, onDone, onError };
  }

  it('resolves open after the connection.ack handshake', async () => {
    const { socket, client } = setup();
    const opened = client.open();
    socket.message({ type: 'event', event: 'connection.ack', payload: { session_id: 's1', mode: 'BUILD' } });
    await opened;
    expect(client.getStatus()).toBe('connected');
    expect(client.getSessionId()).toBe('s1');
  });

  it('streams chat.delta and finishes on chat.final', async () => {
    const { socket, client, onToken, onDone } = setup();
    const opened = client.open();
    socket.message({ type: 'event', event: 'connection.ack', payload: { session_id: 's1' } });
    await opened;

    const chat = client.chat('hello');
    const sent = JSON.parse(socket.sent.at(-1) as string);
    expect(sent).toMatchObject({ type: 'req', method: 'chat.send', params: { content: 'hello' } });

    socket.message({ type: 'event', event: 'chat.delta', payload: { content: 'Hel' } });
    socket.message({ type: 'event', event: 'chat.delta', payload: { content: 'lo' } });
    socket.message({ type: 'event', event: 'chat.final', payload: { content: 'Hello' } });

    await chat;
    expect(onToken).toHaveBeenNthCalledWith(1, 'Hel');
    expect(onToken).toHaveBeenNthCalledWith(2, 'lo');
    expect(onDone).toHaveBeenCalledWith('s1');
  });

  it('rejects the chat promise on chat.error', async () => {
    const { socket, client, onError } = setup();
    const opened = client.open();
    socket.message({ type: 'event', event: 'connection.ack', payload: { session_id: 's1' } });
    await opened;

    const chat = client.chat('hello');
    socket.message({ type: 'event', event: 'chat.error', payload: { message: 'boom' } });
    await expect(chat).rejects.toThrow('boom');
    expect(onError).toHaveBeenCalledWith('boom');
  });
});
