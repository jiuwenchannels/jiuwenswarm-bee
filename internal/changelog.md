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
