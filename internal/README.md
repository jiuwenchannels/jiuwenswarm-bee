# Internal design notes

The full design and plan for this channel lives in the main docs tree:

`openjiuwen/jiuwenswarm/docs-michael/jiuwenswarm-bee-channel.md`

## Summary

- **Name:** BeeChat (folder `jiuwenswarm-bee`), avatar "Buzz".
- **Shape:** one screen, Q&A only, streaming replies, reactive bee avatar.
- **No backend:** talks directly to the JiuwenSwarm gateway at `ws://localhost:19000/v1/ws` using the standard envelope protocol.
- **Assets:** `bee-static.png` (idle) and `bee-flying.webp` (thinking) from the main web frontend.

## Module map

| File | Responsibility |
|---|---|
| `src/lib/gateway.ts` | WebSocket envelope client + reconnect (pure helpers unit-tested) |
| `src/lib/useChat.ts` | React hook wiring gateway events to messages + avatar state |
| `src/lib/messages.ts` | Pure conversation reducers |
| `src/lib/avatar.ts` | Pure avatar state machine |
| `src/lib/config.ts` | `VITE_*` environment config |
| `src/components/Avatar/` | The bee and its states |
| `src/components/Chat/` | Message list, bubble, composer |
| `src/theme/tokens.css` | Light/dark design tokens (no hardcoded colors in components) |
