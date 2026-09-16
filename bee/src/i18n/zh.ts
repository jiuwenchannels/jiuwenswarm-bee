import type { Strings } from './types';

export const zh: Strings = {
  character: '嗡嗡',
  poweredBy: 'JiuwenSwarm',
  attribution: 'OpenJiuwen',
  hello: '我是嗡嗡 —— 你在蜂群中的那只蜜蜂。有什么想问的，尽管说。',
  status: {
    disconnected: '离线',
    connecting: '连接中…',
    connected: '已连接',
    reconnecting: '重连中…',
  },
  avatar: {
    idle: '嗡嗡准备好了',
    thinking: '嗡嗡正在思考…',
    answering: '嗡嗡正在回答…',
    error: '嗡嗡遇到问题',
  },
  avatarAlt: '久问蜜蜂',
  avatarLabelFor: (state) => `助手蜜蜂（${state}）`,
  composer: {
    placeholder: '问问嗡嗡…',
    send: '发送',
    ariaLabel: '消息',
    dictateStart: '开始语音输入',
    dictateStop: '停止语音输入',
  },
  actions: {
    newChat: '新对话',
    tryAgain: '重试',
    reconnect: '重新连接',
    latest: '↓ 最新',
  },
  offline: (url) => `无法连接到 JiuwenSwarm（${url}）。`,
  voice: {
    on: '🔊 语音开',
    off: '🔇 语音关',
  },
  style: {
    mascot: '经典',
    vector: '动效',
  },
};
