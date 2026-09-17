# jiuwenswarm-bee

**BeeChat** — your bee in the JiuwenSwarm: the simplest channel, a bee-avatar chatbot that only does questions and answers.

A single screen, a streaming reply, and **Buzz**, the JiuwenSwarm bee mascot, who reacts as you talk. No panels, no tool-call viewer, no settings sprawl.

> **Requires a running JiuwenSwarm gateway.** BeeChat auto-tries, in order (using `127.0.0.1`, since the gateway binds IPv4 and browsers may prefer `::1` for `localhost`):
> 1. `ws://127.0.0.1:19000/ws` — the **product** gateway (`jiuwenswarm-start`), web/E2A protocol
> 2. `ws://127.0.0.1:19001/v1/ws` — the **SDK** gateway (`python -m openjiuwen.gateway`), envelope protocol
> 3. `ws://127.0.0.1:19000/v1/ws` — the SDK gateway on the documented port

## Gateways

BeeChat speaks **both** gateway protocols:

| Gateway | URL | Protocol |
|---|---|---|
| **Product** (`jiuwenswarm-start`) | `ws://127.0.0.1:19000/ws` | `connection.ack` → `chat.send` → `chat.delta` / `chat.final` / `chat.processing_status` / `chat.error` |
| **SDK** (`python -m openjiuwen.gateway`) | `ws://127.0.0.1:19001/v1/ws` | `connect` / `create_session` / `chat` → `ack` / `token` / `done` / `error` |

To pin one, set `VITE_JIUWENSWARM_URL` (and optionally `VITE_GATEWAY_PROTOCOL`).



## Features

- One-screen Q&A conversation with streaming tokens
- Rich **Markdown + GFM** replies (tables, lists, links) with **syntax-highlighted** code blocks and a copy button, sanitized by `rehype-sanitize`
- Per-message actions: copy, copy as plain text, edit & resend, regenerate; timestamps + "edited" markers; error retry in place
- Reactive bee avatar: idle / thinking / answering / error
- **Character style is a setting**: **Classic** (the shipped mascot — now a transparent cut-out that bobs, blinks, pulses while speaking, and reacts) or **Animated** (the code-authored rigged SVG bee — blink, pointer gaze, lip-sync). Chosen in Settings → Appearance and applied across the website and the avatar view.
- **Voice-first avatar view**: push-to-talk with a live mic-level waveform and barge-in (talking cancels the bee mid-sentence), onboarding, a live activity line, and drop-a-text-file-to-compose
- **One obvious way (2026 pass)**: a single composer everywhere — type, or hold its one mic (Web Speech in browser/Android, offline whisper in the desktop shells). Voice/history/find/palette all live in **⚙ Settings** or the **⌘K** palette; the duplicate inline toggles (separate talk button, mute, language, character) are gone.
- Local **conversation history**: searchable sidebar grouped by day (Today / Previous 7 days / Older) with rename/delete, persisted across reloads, per-chat drafts
- **Light / dark / system** themes plus a settings panel (runtime gateway URL, agent, mode, voice) — all client-side
- Connection status shown only while connecting/reconnecting/offline (no permanent badge); auto-growing composer with stop-generation, starter prompts, and a keyboard hint
- Find in conversation (**⌘/Ctrl + F**), export a chat as Markdown, read replies aloud
- Docked history sidebar on wide screens; undo-delete; focus-trapped dialogs
- Command palette (**⌘/Ctrl + K**), keyboard-first input (Enter to send, Shift+Enter for newline, `/` to focus)
- Mobile layout, **installable PWA with an offline app shell**, accessibility: `aria-live` answers, reduced-motion support, `data-testid` coverage
- Spoken replies (TTS) and speech input (dictation): Web Speech in the browser, native TTS + speech recognition in the Android app, and **offline whisper.cpp** in the desktop shells (when installed — see below)
- Zero backend: talks to the JiuwenSwarm WebSocket gateway directly (no gateway changes needed)

## Quick start

```bash
# 0. Start JiuwenSwarm (must be running)
jiuwenswarm-start            # gateway on ws://127.0.0.1:19000

# 1. Install deps
cd bee
npm install

# 2. Configure env
cp .env.example .env         # optional: pin VITE_JIUWENSWARM_URL (unset = built-in target list)

# 3. Run
npm run dev                  # → http://localhost:5175
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_JIUWENSWARM_URL` | *unset* — tries the built-in target list | gateway endpoint |
| `VITE_GATEWAY_TOKEN` | *(empty)* | optional token for the `connect` frame |
| `VITE_AGENT_ID` | `researcher` | agent used by `create_session` |
| `VITE_APP_TITLE` | `BeeChat` | brand title |
| `VITE_LOCALE` | *auto* (`en`/`zh` from the browser) | UI language and mascot name; can also be switched in the GUI |

## Gateway protocol

BeeChat speaks the standard JiuwenSwarm envelope protocol (`type`-discriminated JSON):

| Direction | `type` | Key fields |
|---|---|---|
| client → server | `connect` | `client_type`, optional `token` |
| client → server | `create_session` | `agent_id`, `title`, `mode` |
| client → server | `chat` | `message`, optional `session_id` |
| server → client | `ack` | `protocol_version`, `session_id` |
| server → client | `session_created` | `session` |
| server → client | `token` | `text` |
| server → client | `done` | `session_id` |
| server → client | `error` | `message` |

All framing lives in `bee/src/gateway/`.

## Desktop assistant avatar (Windows)

The assistant as an **always-on-top desktop character**: a transparent, frameless window that floats over other windows and holds the chat *inline* — click the character to expand it into a bubble + input. Replies are **spoken** (TTS) with boundary-driven lip-sync; nothing opens in a separate window by default.

Open `index.html#avatar` in the web app for the same view in the browser.

**Two shells** are provided:

| Shell | Folder | Runtime | Installer |
|---|---|---|---|
| **Electron** (ready to run) | `desktop/` | bundled Chromium + Node | ~100 MB |
| **Tauri v2** (lightweight) | `desktop/tauri/` | OS webview (WebView2) | ~5 MB |

```bash
cd bee && npm install && npm run build      # build the web app (or run its dev server)

cd ../desktop/electron && npm install && npm start          # Electron
# or
cd ../desktop/tauri && npm install && npm run dev           # Tauri (needs Rust + MSVC build tools)
```

Both give: a draggable assistant (position remembered), click-to-expand inline chat, spoken replies, a tray menu (show/hide, open full chat, click-through, quit), and hotkeys (`Ctrl+Shift+H` show/hide the assistant, `Ctrl+Shift+B` full chat window). See [`desktop/electron/README.md`](desktop/electron/README.md) and [`desktop/tauri/README.md`](desktop/tauri/README.md).

### The character and voice

- The character is now a **code-authored rigged SVG bee** (`bee/src/components/avatar/RiggedBee.tsx`): independent parts, blink, pointer gaze, and lip-sync. The classic raster art is a lazily-loaded style option.
- Voice uses the **Web Speech API** (`speechSynthesis`, built into WebView2/Chromium) with `onboundary` driving the mouth; no API key needed.

### Voice input in the desktop shells (offline whisper.cpp)

Electron/Tauri webviews ship no cloud recognizer, so push-to-talk there runs **locally**: the renderer records a 16 kHz WAV and the shell transcribes it with a **whisper.cpp** CLI. Nothing is bundled — install it once:

1. Get a `whisper-cli` binary (build [whisper.cpp](https://github.com/ggml-org/whisper.cpp), or use a release) and a model, e.g. `ggml-base.bin` (from `models/download-ggml-model.sh base`).
2. Put both in the shell's userData `whisper/` folder:
   - Electron: `%APPDATA%\jiuwenswarm-bee\whisper\` (or wherever `app.getPath('userData')` points)
   - Tauri: the app-config dir `…/whisper/`
3. Or point at them explicitly with `BEE_WHISPER_DIR` / `BEE_WHISPER_BIN` / `BEE_WHISPER_MODEL`.

When the binary + model are present the talk button appears; otherwise it stays hidden. The browser (`#avatar` in Chrome/Edge) and Android keep their built-in recognizers — none of this applies there.

## Android app

`mobile/` wraps the same web build in a Capacitor app that opens straight into the **avatar view** and shrinks into **Picture-in-Picture** when you leave it — the bee floats over other apps on the phone. It talks to the gateway over the LAN (`ws://<pc-ip>:19000/ws`).

```bash
cd bee && npm install && npm run build   # build the web app
cd ../mobile && npm install && npm run sync && npm run open   # build/run in Android Studio
```

Requires JDK 21 + Android SDK (see [`mobile/README.md`](mobile/README.md)).

## Development

```bash
cd bee
npm run dev         # Vite dev server on :5175
npm test            # Vitest unit tests
npm run typecheck   # TypeScript check
npm run build       # typecheck + production build → dist/
npm run preview     # serve the production build
```

## Repository layout

```
jiuwenswarm-bee/
  bee/                  The Vite/React/TS web app (the single source of truth)
    src/
      app/              Entry (main.tsx) and view roots (App.tsx)
      components/       avatar/, chat/, history/, settings/, common/ UI (styles co-located)
      gateway/          WebSocket clients + protocol types + config
      chat/             Conversation state (useChat, message + conversation reducers, drafts)
      avatar/            Avatar state machine + style preference
      settings/         Persisted user settings + provider
      platform/         Desktop-shell bridge and Web Speech TTS
      lib/              Clipboard, Markdown stripping, code highlighting
      theme/            Theme resolution + design tokens (light/dark)
      assets/           classic bee art (transparent `*-cutout.png` used; originals kept)
  public/               PWA manifest, icon, offline service worker
  desktop/
    electron/           Electron shell: always-on-top bee avatar + chat window
    tauri/              Tauri v2 shell: same app, lightweight native (Rust) wrapper
  mobile/               Android app (Capacitor): avatar view + Picture-in-Picture
  docs/
    en/                 User + development docs (English)
    zh/                 User docs (Chinese)
  internal/             Architecture, roadmap, changelog, design notes (not shipped)
```

## Design notes

- The mascot assets are the same ones used by the main JiuwenSwarm web UI.
- Products colors are never hardcoded in components; everything goes through `src/theme/tokens.css`.
- The avatar is decorative to screen readers; application state is exposed through status and message text.
