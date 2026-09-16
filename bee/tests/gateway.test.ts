import { describe, expect, it, vi } from 'vitest';

import {
  GatewayClient,
  type WebSocketLike,
  buildChat,
  buildConnect,
  buildCreateSession,
  encodeEnvelope,
  extractSessionId,
  parseEnvelope,
} from '../src/lib/gateway';

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

  open(): void {
    this.emit('open', {});
  }

  message(raw: string): void {
    this.emit('message', { data: raw });
  }

  private emit(type: string, event: { data?: unknown }): void {
    for (const handler of this.handlers[type] ?? []) handler(event);
  }
}

describe('envelope helpers', () => {
  it('parses a valid envelope', () => {
    expect(parseEnvelope('{"type":"token","text":"hi"}')).toEqual({ type: 'token', text: 'hi' });
  });

  it('rejects non-JSON', () => {
    expect(() => parseEnvelope('not json')).toThrow(/non-JSON/);
  });

  it('rejects envelopes without a type', () => {
    expect(() => parseEnvelope('{"text":"hi"}')).toThrow(/type/);
  });

  it('builds connect, create_session and chat envelopes', () => {
    expect(buildConnect('tok')).toEqual({ type: 'connect', client_type: 'browser', token: 'tok' });
    expect(buildConnect()).toEqual({ type: 'connect', client_type: 'browser' });
    expect(buildCreateSession('researcher', 'Demo')).toEqual({
      type: 'create_session',
      agent_id: 'researcher',
      title: 'Demo',
    });
    expect(buildChat('hello', 's1')).toEqual({ type: 'chat', message: 'hello', session_id: 's1' });
  });

  it('extracts session ids from flat and nested shapes', () => {
    expect(extractSessionId({ type: 'ack', session_id: 'flat' })).toBe('flat');
    expect(extractSessionId({ type: 'session_created', session: { session_id: 'nested' } })).toBe('nested');
    expect(extractSessionId({ type: 'session_created', session: { id: 'nested-id' } })).toBe('nested-id');
    expect(extractSessionId({ type: 'done' })).toBeUndefined();
  });

  it('encodes an envelope as JSON', () => {
    expect(encodeEnvelope({ type: 'chat', message: 'x' })).toBe('{"type":"chat","message":"x"}');
  });
});

describe('GatewayClient', () => {
  function setup() {
    const socket = new FakeSocket();
    const onToken = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();
    const onStatus = vi.fn();
    const client = new GatewayClient(
      { url: 'ws://test/v1/ws', agentId: 'researcher', reconnect: false, socketFactory: () => socket },
      { onToken, onDone, onError, onStatus },
    );
    return { socket, client, onToken, onDone, onError, onStatus };
  }

  it('sends connect on open and resolves on ack', async () => {
    const { socket, client, onStatus } = setup();
    const opened = client.open();
    socket.open();
    expect(JSON.parse(socket.sent[0])).toMatchObject({ type: 'connect' });
    socket.message(JSON.stringify({ type: 'ack', session_id: 's1' }));
    await opened;
    expect(client.getStatus()).toBe('connected');
    expect(onStatus).toHaveBeenCalledWith('connected');
  });

  it('creates a session and captures its id', async () => {
    const { socket, client } = setup();
    const opened = client.open();
    socket.open();
    socket.message(JSON.stringify({ type: 'ack' }));
    await opened;

    const created = client.createSession('Demo');
    expect(JSON.parse(socket.sent.at(-1) as string)).toMatchObject({ type: 'create_session' });
    socket.message(JSON.stringify({ type: 'session_created', session: { session_id: 'sess_9' } }));
    await expect(created).resolves.toBe('sess_9');
    expect(client.getSessionId()).toBe('sess_9');
  });

  it('streams tokens and resolves on done', async () => {
    const { socket, client, onToken, onDone } = setup();
    const opened = client.open();
    socket.open();
    socket.message(JSON.stringify({ type: 'ack', session_id: 's1' }));
    await opened;

    const chat = client.chat('hello');
    expect(JSON.parse(socket.sent.at(-1) as string)).toMatchObject({ type: 'chat', message: 'hello' });

    socket.message(JSON.stringify({ type: 'token', text: 'hel' }));
    socket.message(JSON.stringify({ type: 'token', text: 'lo' }));
    socket.message(JSON.stringify({ type: 'done', session_id: 's1' }));

    await chat;
    expect(onToken).toHaveBeenNthCalledWith(1, 'hel');
    expect(onToken).toHaveBeenNthCalledWith(2, 'lo');
    expect(onDone).toHaveBeenCalledWith('s1');
  });

  it('rejects the chat promise on an error envelope', async () => {
    const { socket, client, onError } = setup();
    const opened = client.open();
    socket.open();
    socket.message(JSON.stringify({ type: 'ack', session_id: 's1' }));
    await opened;

    const chat = client.chat('hello');
    socket.message(JSON.stringify({ type: 'error', message: 'boom' }));

    await expect(chat).rejects.toThrow('boom');
    expect(onError).toHaveBeenCalledWith('boom');
  });
});
