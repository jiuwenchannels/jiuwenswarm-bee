/**
 * Thin client for the JiuwenSwarm gateway (`ws://…/v1/ws`).
 *
 * All traffic is JSON envelopes discriminated by `type`. This module only
 * frames/unframes those envelopes — it does not re-implement the SDK.
 */

import type { Envelope, GatewayEvents, GatewayStatus, WebSocketLike } from './protocol';

export interface GatewayClientOptions {
  url: string;
  token?: string;
  agentId?: string;
  clientType?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  maxReconnectDelayMs?: number;
  socketFactory?: (url: string) => WebSocketLike;
}

const DEFAULT_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 15_000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Pure envelope helpers (unit-tested)
// ---------------------------------------------------------------------------

export function parseEnvelope(raw: string): Envelope {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Gateway sent a non-JSON frame');
  }
  if (typeof data !== 'object' || data === null || typeof (data as Envelope).type !== 'string') {
    throw new Error('Gateway sent an envelope without a "type"');
  }
  return data as Envelope;
}

export function encodeEnvelope(envelope: Envelope): string {
  return JSON.stringify(envelope);
}

export function buildConnect(token?: string, clientType = 'browser'): Envelope {
  const envelope: Envelope = { type: 'connect', client_type: clientType };
  if (token) envelope.token = token;
  return envelope;
}

export function buildCreateSession(agentId?: string, title?: string, mode?: string): Envelope {
  const envelope: Envelope = { type: 'create_session' };
  if (agentId) envelope.agent_id = agentId;
  if (title) envelope.title = title;
  if (mode) envelope.mode = mode;
  return envelope;
}

export function buildChat(message: string, sessionId?: string): Envelope {
  const envelope: Envelope = { type: 'chat', message };
  if (sessionId) envelope.session_id = sessionId;
  return envelope;
}

/** Session ids may arrive nested (`session.session_id` / `session.id`) or flat. */
export function extractSessionId(envelope: Envelope): string | undefined {
  const session = envelope.session as Record<string, unknown> | undefined;
  const candidates = [
    envelope.session_id,
    session?.session_id,
    session?.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class GatewayClient {
  private readonly options: {
    url: string;
    token?: string;
    agentId?: string;
    clientType: string;
    reconnect: boolean;
    maxReconnectAttempts: number;
    maxReconnectDelayMs: number;
    socketFactory: (url: string) => WebSocketLike;
  };
  private readonly events: GatewayEvents;
  private socket: WebSocketLike | null = null;
  private closedByUser = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private status: GatewayStatus = 'disconnected';
  private sessionId: string | undefined;

  private connectResolve: (() => void) | null = null;
  private createResolve: ((sessionId: string | undefined) => void) | null = null;
  private chatResolve: (() => void) | null = null;
  private chatReject: ((error: Error) => void) | null = null;
  private sawFirstToken = false;

  constructor(options: GatewayClientOptions, events: GatewayEvents = {}) {
    this.options = {
      url: options.url,
      token: options.token,
      agentId: options.agentId,
      clientType: options.clientType ?? 'browser',
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
      maxReconnectDelayMs: options.maxReconnectDelayMs ?? MAX_RECONNECT_DELAY_MS,
      socketFactory:
        options.socketFactory ?? ((url) => new WebSocket(url) as unknown as WebSocketLike),
    };
    this.events = events;
  }

  getStatus(): GatewayStatus {
    return this.status;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /** Restart the connection after a hard failure (resets the retry budget). */
  reconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    return this.open();
  }

  private setStatus(status: GatewayStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.events.onStatus?.(status);
  }

  /** Open the socket (if needed) and resolve once the gateway `ack`s. */
  open(): Promise<void> {
    if (this.status === 'connected' && this.socket) return Promise.resolve();
    if (this.socket) {
      return new Promise((resolve) => {
        this.connectResolve = resolve;
      });
    }
    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.closedByUser = false;
      this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
      let socket: WebSocketLike;
      try {
        socket = this.options.socketFactory(this.options.url);
      } catch (error) {
        this.setStatus('disconnected');
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      this.socket = socket;
      this.wire(socket, reject);
    });
  }

  private wire(socket: WebSocketLike, reject: (error: Error) => void): void {
    socket.addEventListener('open', () => {
      socket.send(encodeEnvelope(buildConnect(this.options.token, this.options.clientType)));
    });

    socket.addEventListener('message', (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      let envelope: Envelope;
      try {
        envelope = parseEnvelope(raw);
      } catch (error) {
        this.events.onError?.(error instanceof Error ? error.message : String(error));
        return;
      }
      this.handle(envelope);
    });

    socket.addEventListener('error', () => {
      // Connection state is surfaced via onStatus; the close handler drives
      // reconnection. A raw socket error is not a chat failure.
    });

    socket.addEventListener('close', () => {
      this.socket = null;
      if (this.closedByUser) {
        this.setStatus('disconnected');
        return;
      }
      this.failChat(new Error('Connection closed'));
      this.scheduleReconnect(reject);
    });
  }

  private scheduleReconnect(reject: (error: Error) => void): void {
    if (!this.options.reconnect || this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setStatus('disconnected');
      this.connectResolve = null;
      reject(new Error('Connection closed'));
      return;
    }
    this.setStatus('reconnecting');
    const delay = Math.min(
      DEFAULT_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
      this.options.maxReconnectDelayMs,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open().catch(() => {
        /* retried again by the close handler */
      });
    }, delay);
  }

  private handle(envelope: Envelope): void {
    switch (envelope.type) {
      case 'ack': {
        this.reconnectAttempts = 0;
        this.sessionId = extractSessionId(envelope) ?? this.sessionId;
        this.setStatus('connected');
        const resolve = this.connectResolve;
        this.connectResolve = null;
        resolve?.();
        break;
      }
      case 'session_created': {
        this.sessionId = extractSessionId(envelope) ?? this.sessionId;
        const resolve = this.createResolve;
        this.createResolve = null;
        resolve?.(this.sessionId);
        break;
      }
      case 'token': {
        if (!this.sawFirstToken) {
          this.sawFirstToken = true;
        }
        const text = typeof envelope.text === 'string' ? envelope.text : '';
        if (text) this.events.onToken?.(text);
        break;
      }
      case 'done': {
        this.sessionId = extractSessionId(envelope) ?? this.sessionId;
        const resolve = this.chatResolve;
        this.chatResolve = null;
        this.chatReject = null;
        this.events.onDone?.(this.sessionId);
        resolve?.();
        break;
      }
      case 'error': {
        const message = typeof envelope.message === 'string' ? envelope.message : 'Unknown gateway error';
        this.failChat(new Error(message));
        this.events.onError?.(message);
        break;
      }
      default:
        // Unknown/extra envelopes (e.g. `sessions`) are ignored by this client.
        break;
    }
  }

  private failChat(error: Error): void {
    const reject = this.chatReject;
    this.chatResolve = null;
    this.chatReject = null;
    reject?.(error);
  }

  private isConnected(): boolean {
    return this.status === 'connected' && this.socket !== null;
  }

  /** Create (or reset) the active session. Resolves with the session id. */
  async createSession(title?: string, mode?: string): Promise<string | undefined> {
    if (!this.isConnected()) {
      await this.open();
    }
    return new Promise((resolve) => {
      this.createResolve = resolve;
      this.socket?.send(encodeEnvelope(buildCreateSession(this.options.agentId, title, mode)));
    });
  }

  /** Send a message; resolves when the gateway emits `done`. */
  async chat(message: string): Promise<void> {
    if (!this.isConnected()) {
      await this.open();
    }
    if (!this.sessionId) {
      await this.createSession();
    }
    this.sawFirstToken = false;
    return new Promise((resolve, reject) => {
      this.chatResolve = resolve;
      this.chatReject = reject;
      this.socket?.send(encodeEnvelope(buildChat(message, this.sessionId)));
    });
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.setStatus('disconnected');
  }
}
