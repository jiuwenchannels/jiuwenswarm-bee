# Changelog

User-visible changes per release. The three version manifests (`bee/package.json`,
`desktop/electron/package.json`, `desktop/tauri/src-tauri/tauri.conf.json`) are bumped
together; see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Unreleased

A client-only polish pass on the web app (no gateway/backend changes).

- **Rich replies**: Markdown + GFM (tables, links, lists) with sanitized HTML, code
  blocks with language labels and a copy button.
- **Message actions**: copy, edit & resend, regenerate, and thumbs feedback; errors
  retry in place instead of duplicating the user's turn.
- **Conversation history**: locally persisted threads with a searchable sidebar
  (rename, delete) and per-chat composer drafts; "New chat" now starts a fresh gateway
  session.
- **Themes**: light / dark / system (follows `prefers-color-scheme`), persisted.
- **Settings panel**: runtime gateway URL, agent, mode, and voice toggle — no rebuild
  needed to point at another gateway.
- **Composer**: auto-growing input, stop-generation button, starter prompts.
- **Command palette** (`⌘/Ctrl + K`) and keyboard model (`/` focuses the composer).
- **Visual polish**: consistent Lucide icon set, toasts, day separators, hover actions,
  refined tokens, depth, and motion (all respecting reduced motion).
- **PWA manifest + icon**.
- **Second polish pass**: syntax-highlighted code, copy-as-plain-text, edited
  markers and hover timestamps, themed bee cut-out (fixes dark mode), streaming
  replies render as text then Markdown, settings grouped with an Advanced fold,
  localized + grouped history sidebar, sidebar scrim/swipe, top toasts, ⌘K chip,
  composer hint + autofocus, reduced aria-live noise, Inter variable font, and an
  offline service worker (still no backend changes).
- **Third pass**: find-in-conversation (⌘/Ctrl+F), export a chat as Markdown,
  read-aloud on replies, docked history sidebar on wide screens, undo-delete toast,
  sticky offline banner with a Gateway-settings shortcut, mobile-keyboard inset,
  focus-trapped dialogs, lazy-loaded Markdown/highlighter chunk, high-contrast
  tokens, and locale-aware dates.
- **2026 avatar pass**: the assistant is now a code-authored **rigged SVG bee**
  (independent wings / antennae / eyes / mouth) that breathes, blinks, follows the
  pointer, and lip-syncs; the classic raster art is a lazily-loaded option (the
  1.84 MB WebP no longer loads by default). The avatar view is **voice-first**:
  push-to-talk with a live mic-level waveform and **barge-in** (speaking cancels
  the bee mid-sentence), plus a live **activity line**, an onboarding hint, a
  proactive "I'm back" on reconnect, drop-a-text-file-to-compose, and fully
  localized chrome. Engine now recognizes `chat.activity` / `chat.tool` frames —
  rendered when a gateway emits them (backend-blocked, seam in place).
- **Desktop voice input (offline)**: the Electron and Tauri shells can now do
  push-to-talk with a local **whisper.cpp** CLI — the renderer records a 16 kHz
  WAV and the shell transcribes it; the talk button appears only when a
  `whisper-cli` binary + `ggml-*.bin` model are installed (userData `whisper/` or
  `BEE_WHISPER_*` env). Previously push-to-talk was hidden in the shells because
  their webview has no cloud recognizer. (Tauri Rust side not compiled in CI.)
- **Character style is now a Setting** (Settings → Appearance → Character):
  **Classic** (the shipped raster mascot) or **Animated** (the rigged SVG bee),
  **Classic by default**, applied to both the website and the avatar view. The
  old standalone `beechat.avatarStyle` localStorage key is replaced by the
  persisted settings.
- **Classic bee: transparent + alive.** Generated transparent cut-outs of the
  shipped art (`bee-static-cutout.png` / `bee-flying-cutout.png`, edge flood-fill
  + feather, common crop so the two poses stay aligned), dropping the
  `mix-blend-mode` hack and fixing dark mode. The flat art now moves: bob, a
  periodic blink squash, a talk pulse, a thinking rock, and an error shake.
- **One obvious way (UX simplification)**: voice now lives **only in the composer
  mic** — one hold-to-talk control that works in every view/shell (Web Speech or
  offline whisper), with barge-in and a live waveform, replacing the avatar's
  separate talk row. The avatar's redundant mute, language, and character toggles
  are removed; **all preferences are in Settings** (and reachable from ⌘K). The
  standalone language-toggle component is deleted.
- **The floating avatar is now voice-only.** It is a voice companion, not a chat
  window: one "Hold to talk" button, live waveform, barge-in, and a subtitle of
  what it is saying (or what you are saying). The composer, message list, expand
  toggle, and drop-to-compose are removed from the avatar; the **website** stays
  the place to type. Window sizes for Electron/Tauri/Android updated to fit.
  Voice input is now one shared engine (`useVoiceInput`) used by both the
  website composer mic and the avatar talk button.

## 0.1.0

Initial BeeChat release.

- One-screen Q&A channel with the Buzz bee avatar and streaming replies
- Speaks both JiuwenSwarm gateway protocols (SDK `/v1/ws` envelope and product `/ws`
  event/req), with failover across candidate endpoints and automatic reconnect
- Full-site view and `#avatar` view from the same build
- Electron and Tauri desktop shells: transparent always-on-top character, inline chat,
  spoken replies with lip-sync, tray, global hotkeys, click-through
- NSIS installers for both shells
- Light/dark themes, mobile layout, accessibility basics
