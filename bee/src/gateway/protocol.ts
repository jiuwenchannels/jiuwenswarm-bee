/**
 * Shared gateway transport surface.
 *
 * Both gateway clients — the SDK envelope client (`gateway.ts`) and the product
 * event/req client (`gatewayProduct.ts`) — implement `ChatGateway` and emit
 * `GatewayEvents`. This module owns the transport contract so the rest of the app
 * never depends on a specific gateway flavour.
 */

export type GatewayStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** A `type`-discriminated JSON envelope (used by the SDK gateway). */
export interface Envelope {
  type: string;
  [key: string]: unknown;
}

/** The minimal WebSocket surface the clients need (so tests can fake it). */
export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  addEventListener(
    type: 'open' | 'close' | 'error' | 'message',
    handler: (event: { data?: unknown }) => void,
  ): void;
}

export interface GatewayEvents {
  onStatus?: (status: GatewayStatus) => void;
  onToken?: (text: string) => void;
  onDone?: (sessionId?: string) => void;
  onError?: (message: string) => void;
}

/** Common surface implemented by both gateway clients (SDK and product). */
export interface ChatGateway {
  open(): Promise<void>;
  createSession(title?: string, mode?: string): Promise<string | undefined>;
  chat(message: string): Promise<void>;
  reconnect(): Promise<void>;
  close(): void;
  getStatus(): GatewayStatus;
  getSessionId(): string | undefined;
}
