import { useCallback, useEffect, useRef, useState } from 'react';

import { config, type GatewayTarget } from '../gateway/config';
import { GatewayClient } from '../gateway/gateway';
import { ProductGatewayClient } from '../gateway/gatewayProduct';
import type { ChatGateway, GatewayEvents, GatewayStatus } from '../gateway/protocol';
import { type AvatarEvent, type AvatarState, nextAvatarState } from '../avatar/avatar';
import {
  type ChatMessage,
  addUserMessage,
  appendToLastAssistant,
  failLastAssistant,
  finishLastAssistant,
  startAssistantMessage,
} from './messages';

export interface UseChatResult {
  messages: ChatMessage[];
  avatar: AvatarState;
  status: GatewayStatus;
  busy: boolean;
  url: string;
  send: (text: string) => void;
  retry: () => void;
  reset: () => void;
  reconnect: () => void;
}

function createGateway(target: GatewayTarget, events: GatewayEvents): ChatGateway {
  if (target.protocol === 'product') {
    return new ProductGatewayClient({ url: target.url, mode: config.mode }, events);
  }
  return new GatewayClient({ url: target.url, token: config.token, agentId: config.agentId }, events);
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [avatar, setAvatar] = useState<AvatarState>('idle');
  const [status, setStatus] = useState<GatewayStatus>('disconnected');
  const [busy, setBusy] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);

  const clientRef = useRef<ChatGateway | null>(null);
  const busyRef = useRef(false);
  const everConnectedRef = useRef(false);
  const lastUserRef = useRef<string | null>(null);

  const target = config.targets[Math.min(targetIndex, config.targets.length - 1)];

  const applyAvatar = useCallback((event: AvatarEvent) => {
    setAvatar((previous) => nextAvatarState(previous, event));
  }, []);

  const handleError = useCallback(
    (message: string) => {
      const hadInflightChat = busyRef.current;
      busyRef.current = false;
      setBusy(false);
      // Connection drops are reported by the status indicator, not as a chat
      // error, so only surface a bubble/avatar error for a real chat failure.
      if (!hadInflightChat) return;
      applyAvatar('error');
      setMessages((previous) => {
        const last = previous[previous.length - 1];
        if (last && last.role === 'assistant' && last.streaming) {
          return failLastAssistant(previous, message);
        }
        return previous;
      });
    },
    [applyAvatar],
  );

  useEffect(() => {
    const client = createGateway(target, {
      onStatus: (next) => {
        if (next === 'connected') everConnectedRef.current = true;
        setStatus(next);
      },
      onToken: (text) => {
        applyAvatar('first-token');
        setMessages((previous) => appendToLastAssistant(previous, text));
      },
      onDone: () => {
        busyRef.current = false;
        setBusy(false);
        applyAvatar('done');
        setMessages(finishLastAssistant);
      },
      onError: handleError,
    });
    clientRef.current = client;

    client.open().catch((error) => {
      // If we never reached the gateway, try the next candidate before
      // reporting a hard failure.
      if (!everConnectedRef.current && targetIndex + 1 < config.targets.length) {
        setTargetIndex(targetIndex + 1);
        return;
      }
      handleError(error instanceof Error ? error.message : String(error));
    });

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [targetIndex, target, applyAvatar, handleError]);

  const dispatch = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return;
      lastUserRef.current = trimmed;
      busyRef.current = true;
      setBusy(true);
      setMessages((previous) => startAssistantMessage(addUserMessage(previous, trimmed)));
      applyAvatar('send');
      clientRef.current?.chat(trimmed).catch((error) => {
        handleError(error instanceof Error ? error.message : String(error));
      });
    },
    [applyAvatar, handleError],
  );

  const retry = useCallback(() => {
    const last = lastUserRef.current;
    if (last) dispatch(last);
  }, [dispatch]);

  const reset = useCallback(() => {
    setMessages([]);
    applyAvatar('reset');
  }, [applyAvatar]);

  const reconnect = useCallback(() => {
    everConnectedRef.current = false;
    applyAvatar('reset');
    if (targetIndex !== 0) {
      setTargetIndex(0);
      return;
    }
    clientRef.current
      ?.reconnect()
      .catch((error) => handleError(error instanceof Error ? error.message : String(error)));
  }, [targetIndex, applyAvatar, handleError]);

  return { messages, avatar, status, busy, url: target.url, send: dispatch, retry, reset, reconnect };
}
