import type { Strings } from './types';

export const en: Strings = {
  character: 'Buzz',
  poweredBy: 'JiuwenSwarm',
  attribution: 'OpenJiuwen',
  hello: "I'm Buzz — your bee in the swarm. Ask me anything.",
  status: {
    disconnected: 'Offline',
    connecting: 'Connecting…',
    connected: 'Connected',
    reconnecting: 'Reconnecting…',
  },
  avatar: {
    idle: 'Buzz is ready',
    thinking: 'Buzz is thinking…',
    answering: 'Buzz is answering…',
    error: 'Buzz hit a problem',
  },
  avatarAlt: 'Jiuwen bee',
  avatarLabelFor: (state) => `Assistant bee (${state})`,
  composer: {
    placeholder: 'Ask Buzz anything…',
    send: 'Send',
    ariaLabel: 'Message',
    dictateStart: 'Start dictation',
    dictateStop: 'Stop dictation',
  },
  actions: {
    newChat: 'New chat',
    tryAgain: 'Try again',
    reconnect: 'Reconnect',
    latest: '↓ Latest',
  },
  offline: (url) => `Can't reach JiuwenSwarm at ${url}.`,
  voice: {
    on: '🔊 Voice on',
    off: '🔇 Voice off',
  },
  style: {
    mascot: 'Classic',
    vector: 'Animated',
  },
};
