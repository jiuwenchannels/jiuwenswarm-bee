# Contributing to jiuwenswarm-bee

Thanks for helping with **BeeChat** (the `jiuwenswarm-bee` channel). This document
covers the repository layout, how to run and test each target, and the conventions
we follow.

## Repository layout

```
jiuwenswarm-bee/
├── apps/
│   ├── web/                 # The web app — the single source of truth
│   │   ├── src/
│   │   │   ├── app/         # App entry (App.tsx, main.tsx)
│   │   │   ├── components/  # avatar/ and chat/ UI (styles co-located)
│   │   │   ├── gateway/     # WebSocket clients + protocol types + config
│   │   │   ├── chat/        # Conversation state (useChat, message reducers)
│   │   │   ├── avatar/      # Avatar state machine + style preference
│   │   │   ├── platform/    # Browser/desktop-shell bridges, speech
│   │   │   └── theme/       # Design tokens (light/dark)
│   │   └── public/          # PWA manifest, icon, offline service worker
│   ├── desktop/
│   │   ├── electron/        # Electron shell (bundled Chromium) → apps/web/dist
│   │   └── tauri/           # Tauri v2 shell (OS WebView2) → apps/web/dist
│   └── mobile/              # Android app (Capacitor) → apps/web/dist
├── docs/
│   ├── user/                # End-user docs, per language (`en/`, `zh/`)
│   └── dev/                 # Maintainer docs: architecture, naming, run modes, roadmap
├── package.json             # npm workspaces root (apps/*)
├── CHANGELOG.md             # User-visible changes per release
└── .github/workflows/       # CI
```

The desktop shells contain **no product logic** — they load `apps/web/dist` and only add
OS behaviour (transparent always-on-top window, tray, hotkeys, click-through). Change
`apps/web/` and all three targets update.

## Prerequisites

- Node 18+ (see `.nvmrc`; CI uses Node 22)
- A running JiuwenSwarm gateway (for anything that talks to the agent)
- Rust + MSVC C++ build tools + WebView2 — **only** for the Tauri shell

## Build, test, run

Web app (the place you will work most of the time):

```bash
cd apps/web
npm install
npm run dev         # http://localhost:5175
npm run typecheck
npm test
npm run build       # typecheck + production build → apps/web/dist
```

Desktop shells:

```bash
# Electron (no extra toolchain)
cd apps/desktop/electron && npm install && npm start
cd apps/desktop/electron && npm run start:dev     # loads the Vite dev server

# Tauri (Rust toolchain required)
cd apps/desktop/tauri && npm install && npm run dev
cd apps/desktop/tauri && npm run build
```

Full run-mode matrix: [`docs/dev/run-modes.md`](docs/dev/run-modes.md).
Packaging installers: [`docs/dev/packaging.md`](docs/dev/packaging.md).

## Tests

- Unit tests live **next to the module** they cover (`*.test.ts` / `*.test.tsx`).
- Prefer pure functions (gateway framing, reducers, the avatar state machine) so the
  logic is testable without a live gateway.

## Coding conventions

- TypeScript + React; components in `PascalCase`, hooks/utilities in `camelCase`.
- No hardcoded product colours in components — use `apps/web/src/theme/tokens.css`.
- Keep all gateway framing inside `apps/web/src/gateway/`; the rest of the app talks to
  the `ChatGateway` interface only.
- Desktop-shell commands are camelCase IPC names prefixed with `bee:`.
- Names and user-facing copy follow [`docs/dev/naming.md`](docs/dev/naming.md):
  character **Buzz**, product **BeeChat**, and the hive vocabulary
  (`pollen` / `waggle` / `honey`) used only where it stays clear.

## Commit and pull request guidelines

- Concise conventional commits: `fix(scope): message`, `feat(scope): message`,
  `docs: message`, `refactor(scope): message`. Imperative mood.
- A PR should describe the change, list the validation commands you ran, and link the
  related issue. Include a screenshot or recording for UI changes.
- Keep PRs focused; do not mix refactors with behaviour changes.

## Versioning

Three manifests carry a version and must be bumped together for a release:

| Target | Field |
|---|---|
| Web app | `apps/web/package.json` → `version` |
| Electron | `apps/desktop/electron/package.json` → `version` |
| Tauri | `apps/desktop/tauri/src-tauri/tauri.conf.json` → `version` |

Record user-visible changes in [`CHANGELOG.md`](CHANGELOG.md).
