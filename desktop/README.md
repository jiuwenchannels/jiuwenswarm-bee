# jiuwenswarm-bee-desktop

BeeChat as a **Windows desktop assistant**: a transparent, always-on-top character that floats over your other windows, with the chat inline. Click the character to expand a bubble + input; replies are spoken.

An Electron shell around the existing web app — the avatar, chat, gateway client, and voice all live in `../bee`.

## Features

- Transparent, frameless, always-on-top character (visible on all workspaces)
- **Inline chat**: click the character to expand a bubble + input; click again to collapse
- **Voice**: replies are read aloud (Web Speech API) with mouth lip-sync; toggle on/off
- Drag by the top grip; position is remembered
- System tray: show/hide assistant, open the full chat window, toggle click-through, quit
- Global hotkeys: `Ctrl+Shift+H` show/hide the assistant, `Ctrl+Shift+B` open the full chat window
- Single-instance; runs in the tray when hidden

## Requirements

- Windows 10/11, Node 18+
- A running JiuwenSwarm gateway (the web app auto-connects; see `../bee/.env`)

## Run

```bash
# 1. Build (or run) the web app
cd ../bee
npm install
npm run build            # produces bee/dist used by the shell
# ...or run the dev server: npm run dev

# 2. Run the desktop shell
cd ../desktop
npm install
npm start                # loads bee/dist
npm run start:dev        # loads the Vite dev server (http://localhost:5175)
```

## How it works

| File | Responsibility |
|---|---|
| `main.js` | Creates the transparent avatar window (`app://bee/index.html#avatar`), resizes it on expand/collapse, tray, hotkeys, window-state persistence, on-demand full chat window |
| `preload.js` | Safe IPC bridge (`setExpanded`, `openChat`, `setClickThrough`, `quit`) |
| `assets/` | tray icon |
| `../bee/src/components/Avatar/*` | the character, inline chat, and voice |

## Notes / limits

- Always-on-top cannot cover exclusive-fullscreen apps (games).
- On some GPUs transparency + hardware acceleration can flicker; if so, launch with `--disable-gpu`.
- Click-through mode (tray toggle) lets clicks pass through to the window beneath.
- Packaging: `npx electron-builder --win nsis`. Ship a code-signed build (unsigned binaries trigger SmartScreen/AV).
