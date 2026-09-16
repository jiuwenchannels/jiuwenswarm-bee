/**
 * Client for the JiuwenSwarm *product* gateway WebSocket (the one the web UI
 * and the CLI use), e.g. `ws://localhost:19000/ws`.
 *
 * Protocol (different from the SDK gateway):
 *   server -> {"type":"event","event":"connection.ack","payload":{session_id,mode,...}}
 *   client -> {"type":"req","id":"chat-...","method":"chat.send","is_stream":true,
 *              "params":{session_id,content,query,mode,supports_user_interaction,agent_ref}}
 *   server -> {"type":"event","event":"chat.delta","payload":{content}}
 *   server -> {"type":"event","event":"chat.final","payload":{content}}
 *   server -> {"type":"event","event":"chat.processing_status","payload":{is_processing}}
 *   server -> {"type":"event","event":"chat.error","payload":{message}}
 */

import type { GatewayEvents, GatewayStatus, WebSocketLike } from './gateway';

export interface ProductGatewayOptions {
  url: string;
  mode?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  maxReconnectDelayMs?: number;
  socketFactory?: (url: string) => WebSocketLike;
}

export interface ProductFrame {
  type?: string;
  event?: string;
  payload?: Record<string, unknown>;
}

const DEFAULT_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 15_000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

export function parseProductFrame(raw: string): ProductFrame {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Gateway sent a non-JSON frame');
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('Gateway sent an invalid frame');
  }
  return data as ProductFrame;
}

export function productDeltaText(payload: Record<string, unknown> | undefined): string | null {
  const content = payload?.content;
  return typeof content === 'string' && content.length > 0 ? content : null;
}

export function isContentFinal(payload: Record<string, unknown> | undefined): boolean {
  const inner = payload?.event_type;
  return inner === undefined || inner === '' || inner === 'chat.final';
}

export function isTerminalEvent(event: string, payload: Record<string, unknown> | undefined): boolean {
  if (event === 'chat.error') return true;
  if (event === 'chat.final') return isContentFinal(payload);
  if (event === 'chat.processing_status') return payload?.is_processing === false;
  return false;
}

export function productErrorMessage(payload: Record<string, unknown> | undefined): string {
  const message = payload?.message ?? payload?.content ?? payload?.error;
  return typeof message === 'string' && message.length > 0 ? message : 'Agent error';
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class ProductGatewayClient {
  private readonly options: {
    url: string;
    mode: string;
    reconnect: boolean;
    maxReconnectAttempts: number;
    maxReconnectDelayMs: number;
    socketFactory: (url: string) => WebSocketLike;
  };
  private readonly events: GatewayEvents;

  private socket: WebSocketLike | null = null;
  private closedByUser = false;
  private acked = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private status: GatewayStatus = 'disconnected';
  private sessionId: string | undefined;
  private mode: string | undefined;

  private ackResolve: (() => void) | null = null;
  private chatResolve: (() => void) | null = null;
  private chatReject: ((error: Error) => void) | null = null;

  constructor(options: ProductGatewayOptions, events: GatewayEvents = {}) {
    this.options = {
      url: options.url,
      mode: options.mode ?? 'agent',
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

  private setStatus(status: GatewayStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.events.onStatus?.(status);
  }

  open(): Promise<void> {
    if (this.status === 'connected' && this.socket) return Promise.resolve();
    if (this.socket) {
      return new Promise((resolve) => {
        this.ackResolve = resolve;
      });
    }
    return new Promise((resolve, reject) => {
      this.ackResolve = resolve;
      this.acked = false;
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
    socket.addEventListener('message', (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      let frame: ProductFrame;
      try {
        frame = parseProductFrame(raw);
      } catch (error) {
        this.events.onError?.(error instanceof Error ? error.message : String(error));
        return;
      }
      // The very first frame must be the connection handshake.
      if (!this.acked) {
        if (frame.type === 'event' && frame.event === 'connection.ack') {
          this.acked = true;
          this.reconnectAttempts = 0;
          this.sessionId = typeof frame.payload?.session_id === 'string'
            ? (frame.payload.session_id as string)
            : this.sessionId;
          this.mode = typeof frame.payload?.mode === 'string'
            ? (frame.payload.mode as string)
            : this.mode;
          this.setStatus('connected');
          const resolve = this.ackResolve;
          this.ackResolve = null;
          resolve?.();
        } else {
          reject(new Error('Gateway did not send connection.ack'));
        }
        return;
      }
      if (frame.type !== 'event' || typeof frame.event !== 'string') return;
      this.handleEvent(frame.event, frame.payload);
    });

    socket.addEventListener('close', () => {
      this.socket = null;
      if (this.closedByUser) {
        this.setStatus('disconnected');
        return;
      }
      this.acked = false;
      this.failChat(new Error('Connection closed'));
      this.scheduleReconnect(reject);
    });
  }

  private scheduleReconnect(reject: (error: Error) => void): void {
    if (!this.options.reconnect || this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setStatus('disconnected');
      this.ackResolve = null;
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
        /* retried by the close handler */
      });
    }, delay);
  }

  private handleEvent(event: string, payload: Record<string, unknown> | undefined): void {
    switch (event) {
      case 'chat.delta': {
        const text = productDeltaText(payload);
        if (text) this.events.onToken?.(text);
        break;
      }
      case 'chat.final': {
        if (!isContentFinal(payload)) break; // control event wrapped in chat.final
        this.finishChat();
        break;
      }
      case 'chat.processing_status': {
        if (payload?.is_processing === false) this.finishChat();
        break;
      }
      case 'chat.error': {
        const message = productErrorMessage(payload);
        this.failChat(new Error(message));
        this.events.onError?.(message);
        break;
      }
      default:
        break;
    }
  }

  private finishChat(): void {
    const resolve = this.chatResolve;
    this.chatResolve = null;
    this.chatReject = null;
    this.events.onDone?.(this.sessionId);
    resolve?.();
  }

  private failChat(error: Error): void {
    const reject = this.chatReject;
    this.chatResolve = null;
    this.chatReject = null;
    reject?.(error);
  }

  async createSession(): Promise<string | undefined> {
    await this.open();
    return this.sessionId;
  }

  async chat(message: string): Promise<void> {
    if (!this.socket || this.status !== 'connected') {
      await this.open();
    }
    const id = `chat-${Math.random().toString(16).slice(2, 14)}`;
    const mode = this.mode ?? this.options.mode;
    return new Promise((resolve, reject) => {
      this.chatResolve = resolve;
      this.chatReject = reject;
      this.socket?.send(
        JSON.stringify({
          type: 'req',
          id,
          method: 'chat.send',
          is_stream: true,
          params: {
            session_id: this.sessionId,
            content: message,
            query: message,
            mode,
            supports_user_interaction: false,
            agent_ref: { mode, id: 'default' },
          },
        }),
      );
    });
  }

  reconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    return this.open();
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
