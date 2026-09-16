import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AppConfig, type GatewayTarget } from '../gateway/config';
import { GatewayClient } from '../gateway/gateway';
import { ProductGatewayClient } from '../gateway/gatewayProduct';
import type { ChatGateway, GatewayEvents, GatewayStatus } from '../gateway/protocol';
import { type AvatarEvent, type AvatarState, nextAvatarState } from '../avatar/avatar';
import {
  type ChatMessage,
  type Feedback,
  addUserMessage,
  appendToLastAssistant,
  failLastAssistant,
  finishLastAssistant,
  setFeedback,
  startAssistantMessage,
  stopLastAssistant,
  truncateFrom,
} from './messages';
import {
  type Conversation,
  createConversation,
  renameConversation as renameConversationPure,
  sortByRecency,
  withMessages,
} from './conversations';
import {
  loadActiveConversationId,
  loadConversations,
  saveActiveConversationId,
  saveConversations,
} from './conversationStorage';

export interface UseChatResult {
  messages: ChatMessage[];
  avatar: AvatarState;
  status: GatewayStatus;
  busy: boolean;
  url: string;
  send: (text: string) => void;
  stop: () => void;
  retry: () => void;
  regenerate: () => void;
  retryMessage: (id: string) => void;
  editMessage: (id: string, text: string) => void;
  feedback: (id: string, value: Feedback) => void;
  reconnect: () => void;
  conversations: Conversation[];
  activeId: string;
  activeTitle: string;
  newChat: () => void;
  selectConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
}

interface ChatState {
  conversations: Conversation[];
  activeId: string;
}

function initialChatState(): ChatState {
  const stored = loadConversations();
  const storedActive = loadActiveConversationId();
  if (stored.length === 0) {
    const conversation = createConversation();
    return { conversations: [conversation], activeId: conversation.id };
  }
  const ordered = sortByRecency(stored);
  const activeId = storedActive && ordered.some((c) => c.id === storedActive) ? storedActive : ordered[0].id;
  return { conversations: ordered, activeId };
}

function createGateway(target: GatewayTarget, config: AppConfig, events: GatewayEvents): ChatGateway {
  if (target.protocol === 'product') {
    return new ProductGatewayClient({ url: target.url, mode: config.mode }, events);
  }
  return new GatewayClient({ url: target.url, token: config.token, agentId: config.agentId }, events);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useChat(config: AppConfig): UseChatResult {
  const [chat, setChat] = useState<ChatState>(initialChatState);
  const [avatar, setAvatar] = useState<AvatarState>('idle');
  const [status, setStatus] = useState<GatewayStatus>('disconnected');
  const [busy, setBusy] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);

  const clientRef = useRef<ChatGateway | null>(null);
  const busyRef = useRef(false);
  const cancelledRef = useRef(false);
  const everConnectedRef = useRef(false);

  const active = useMemo(
    () => chat.conversations.find((c) => c.id === chat.activeId) ?? chat.conversations[0],
    [chat],
  );
  const messages = active?.messages ?? [];

  // Latest state for event handlers that must not re-subscribe.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const updateActive = useCallback((updater: (messages: ChatMessage[]) => ChatMessage[]) => {
    setChat((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) =>
        conversation.id === previous.activeId
          ? withMessages(conversation, updater(conversation.messages))
          : conversation,
      ),
    }));
  }, []);

  const applyAvatar = useCallback((event: AvatarEvent) => {
    setAvatar((previous) => nextAvatarState(previous, event));
  }, []);

  const handleError = useCallback(
    (message: string) => {
      const hadInflightChat = busyRef.current;
      busyRef.current = false;
      cancelledRef.current = false;
      setBusy(false);
      if (!hadInflightChat) return;
      applyAvatar('error');
      updateActive((previous) => {
        const last = previous[previous.length - 1];
        if (last && last.role === 'assistant' && last.streaming) {
          return failLastAssistant(previous, message);
        }
        return previous;
      });
    },
    [applyAvatar, updateActive],
  );

  const target = config.targets[Math.min(targetIndex, config.targets.length - 1)];

  useEffect(() => {
    const client = createGateway(target, config, {
      onStatus: (next) => {
        if (next === 'connected') everConnectedRef.current = true;
        setStatus(next);
      },
      onToken: (text) => {
        if (cancelledRef.current) return;
        applyAvatar('first-token');
        updateActive((previous) => appendToLastAssistant(previous, text));
      },
      onDone: () => {
        if (cancelledRef.current) {
          cancelledRef.current = false;
          return;
        }
        busyRef.current = false;
        setBusy(false);
        applyAvatar('done');
        updateActive(finishLastAssistant);
      },
      onError: handleError,
    });
    clientRef.current = client;

    client.open().catch((error) => {
      if (!everConnectedRef.current && targetIndex + 1 < config.targets.length) {
        setTargetIndex(targetIndex + 1);
        return;
      }
      handleError(errorMessage(error));
    });

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [targetIndex, target, config, applyAvatar, updateActive, handleError]);

  // Persist conversations locally (debounced so token streaming stays cheap).
  useEffect(() => {
    const timer = setTimeout(() => {
      saveConversations(chat.conversations);
      saveActiveConversationId(chat.activeId);
    }, 300);
    return () => clearTimeout(timer);
  }, [chat]);

  const runChat = useCallback(
    (text: string, appendUser: boolean) => {
      if (busyRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      busyRef.current = true;
      cancelledRef.current = false;
      setBusy(true);
      updateActive((previous) => {
        const base = appendUser ? addUserMessage(previous, trimmed) : previous;
        return startAssistantMessage(base);
      });
      applyAvatar('send');
      clientRef.current?.chat(trimmed).catch((error) => handleError(errorMessage(error)));
    },
    [applyAvatar, handleError, updateActive],
  );

  const send = useCallback(
    (text: string) => {
      runChat(text, true);
    },
    [runChat],
  );

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (!busyRef.current) return;
    busyRef.current = false;
    setBusy(false);
    applyAvatar('done');
    updateActive(stopLastAssistant);
  }, [applyAvatar, updateActive]);

  const regenerate = useCallback(() => {
    if (busyRef.current) return;
    const current = activeRef.current?.messages ?? [];
    let index = -1;
    for (let i = current.length - 1; i >= 0; i -= 1) {
      if (current[i].role === 'user') {
        index = i;
        break;
      }
    }
    if (index < 0) return;
    const text = current[index].text;
    updateActive((previous) => previous.slice(0, index + 1));
    runChat(text, false);
  }, [runChat, updateActive]);

  const retryMessage = useCallback(
    (id: string) => {
      if (busyRef.current) return;
      const current = activeRef.current?.messages ?? [];
      const index = current.findIndex((message) => message.id === id);
      if (index < 0) return;
      let userIndex = index - 1;
      while (userIndex >= 0 && current[userIndex].role !== 'user') userIndex -= 1;
      if (userIndex < 0) return;
      const text = current[userIndex].text;
      updateActive((previous) => truncateFrom(previous, id));
      runChat(text, false);
    },
    [runChat, updateActive],
  );

  const editMessage = useCallback(
    (id: string, text: string) => {
      if (busyRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const current = activeRef.current?.messages ?? [];
      const index = current.findIndex((message) => message.id === id);
      if (index < 0) return;
      updateActive((previous) =>
        previous
          .slice(0, index + 1)
          .map((message) => (message.id === id ? { ...message, text: trimmed } : message)),
      );
      runChat(trimmed, false);
    },
    [runChat, updateActive],
  );

  const retry = useCallback(() => {
    const current = activeRef.current?.messages ?? [];
    const errored = [...current].reverse().find((message) => message.role === 'assistant' && message.error);
    if (errored) retryMessage(errored.id);
    else regenerate();
  }, [regenerate, retryMessage]);

  const feedback = useCallback(
    (id: string, value: Feedback) => {
      updateActive((previous) => setFeedback(previous, id, value));
    },
    [updateActive],
  );

  const newChat = useCallback(() => {
    const conversation = createConversation();
    setChat((previous) => ({
      conversations: [conversation, ...previous.conversations],
      activeId: conversation.id,
    }));
    busyRef.current = false;
    cancelledRef.current = false;
    setBusy(false);
    applyAvatar('reset');
    // Start a fresh gateway session so the new thread has no shared context.
    clientRef.current?.createSession().catch(() => {});
  }, [applyAvatar]);

  const selectConversation = useCallback(
    (id: string) => {
      setChat((previous) =>
        previous.conversations.some((conversation) => conversation.id === id)
          ? { ...previous, activeId: id }
          : previous,
      );
      busyRef.current = false;
      cancelledRef.current = false;
      setBusy(false);
      applyAvatar('reset');
    },
    [applyAvatar],
  );

  const renameConversation = useCallback((id: string, title: string) => {
    setChat((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) =>
        conversation.id === id ? renameConversationPure(conversation, title) : conversation,
      ),
    }));
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setChat((previous) => {
        const remaining = previous.conversations.filter((conversation) => conversation.id !== id);
        if (remaining.length === 0) {
          const conversation = createConversation();
          return { conversations: [conversation], activeId: conversation.id };
        }
        const activeId =
          previous.activeId === id ? sortByRecency(remaining)[0].id : previous.activeId;
        return { conversations: remaining, activeId };
      });
      applyAvatar('reset');
    },
    [applyAvatar],
  );

  const reconnect = useCallback(() => {
    everConnectedRef.current = false;
    applyAvatar('reset');
    if (targetIndex !== 0) {
      setTargetIndex(0);
      return;
    }
    clientRef.current?.reconnect().catch((error) => handleError(errorMessage(error)));
  }, [targetIndex, applyAvatar, handleError]);

  return {
    messages,
    avatar,
    status,
    busy,
    url: target.url,
    send,
    stop,
    retry,
    regenerate,
    retryMessage,
    editMessage,
    feedback,
    reconnect,
    conversations: chat.conversations,
    activeId: chat.activeId,
    activeTitle: active?.title ?? '',
    newChat,
    selectConversation,
    renameConversation,
    deleteConversation,
  };
}
