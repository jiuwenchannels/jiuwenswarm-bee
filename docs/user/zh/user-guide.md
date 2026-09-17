# BeeChat 用户指南

BeeChat 是一个单屏聊天机器人，带一个蜜蜂头像。输入问题，按 **Enter**，
答案会边生成边显示，同时 Buzz 会做出反应。

## 1. 环境要求

- 运行中的 JiuwenSwarm 网关（默认 `ws://127.0.0.1:19000/ws`）。
- 现代浏览器（Chrome/Chromium 107+、Firefox、Safari、Edge）。

## 2. 启动应用

```bash
cd apps/web
npm install
cp .env.example .env
npm run dev
```

打开终端输出的地址（默认 `http://localhost:5175`）。

## 3. 使用方法

| 操作 | 方式 |
|---|---|
| 发送消息 | 输入后按 **Enter**，或点击 **Send** |
| 换行 | **Shift + Enter** |
| 重新开始 | 点击 **New chat** |
| 出错后重试 | 点击 **Try again** |

## 4. 头像表示的连接状态

| 头像 | 含义 |
|---|---|
| 静止的蜜蜂，「Buzz is ready」 | 空闲，等待输入 |
| 飞行的蜜蜂，「Buzz is thinking…」 | 正在处理你的消息 |
| 静止的蜜蜂，「Buzz is answering…」 | 回复正在流式输出 |
| 灰色蜜蜂，「Buzz hit a problem」 | 出错了，请点击 **Try again** |

## 5. 连接状态

标题栏中的圆点表示网关状态：

| 圆点 | 状态 |
|---|---|
| 绿色 | 已连接 |
| 琥珀色 | 连接中 / 重连中 |
| 红色 | 离线 |

BeeChat 会以指数退避策略自动重连。

## 6. 配置

在 `apps/web/.env` 中设置：

| 变量 | 默认值 |
|---|---|
| `VITE_JIUWENSWARM_URL` | `ws://127.0.0.1:19000/ws` |
| `VITE_GATEWAY_TOKEN` | *（空）* |
| `VITE_AGENT_ID` | `researcher` |
| `VITE_APP_TITLE` | `BeeChat` |
| `VITE_LOCALE` | *自动*（根据浏览器选择 `en`/`zh`） |

## 7. 故障排查

| 现象 | 处理 |
|---|---|
| 一直显示离线 | 确认网关已启动，URL 与端口正确 |
| 发送后出现错误气泡 | 查看网关日志，点击 **Try again** |
| 蜜蜂图片不显示 | 请在 `apps/web/` 目录下运行，以便静态资源正确解析 |
