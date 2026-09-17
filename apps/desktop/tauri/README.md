# jiuwenswarm-bee-desktop-tauri

BeeChat as a **Windows desktop assistant**, built with **Tauri v2** — a tiny native shell (Rust) around the same web app, rendered by the OS webview (WebView2). Same behaviour as the Electron shell in `../electron/`, but the installer is a few MB instead of ~100 MB.

A transparent, always-on-top **character** floats over your desktop with the chat **inline** (click to expand a bubble + input). Replies are spoken (Web Speech API) with lip-sync.

## Requirements

- **Rust** (rustup) — `rustc`/`cargo` on PATH
- **MSVC build tools** (Visual Studio C++ Build Tools) on Windows
- **WebView2** runtime (preinstalled on Windows 11; Evergreen on older Windows 10)
- Node 18+ (Tauri CLI + web app)

```bash
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
# then open a NEW terminal
```

## Build the web app

The avatar UI comes from `../../web/dist` (`index.html#avatar`).

```bash
cd apps/web
npm install
npm run build
```

## Run / build

From the repository root:

```bash
cd apps/desktop/tauri
npm install              # @tauri-apps/cli
npm run dev              # runs the bee dev server + the native shell
npm run build            # release build → src-tauri/target/release/bundle/
```

First build compiles Rust (several minutes).

### Icons

`src-tauri/icons/icon.png` is a placeholder. Generate the full set before packaging:

```bash
npm run icon             # npx tauri icon ../../web/src/assets/bee-static.png
```

## Features

- Transparent, frameless, always-on-top character (bottom-right by default)
- Inline chat: click the character to expand/collapse the bubble + input
- Spoken replies with boundary-driven lip-sync; voice toggle
- Drag by the top grip; position remembered
- Tray: show/hide assistant, open full chat window, toggle click-through, quit
- Global hotkeys: `Ctrl+Shift+H` show/hide the assistant, `Ctrl+Shift+B` open the full chat window

## How it maps to the Electron shell

| Concern | Electron (`../electron/`) | Tauri (`here`) |
|---|---|---|
| Shell language | JavaScript (`main.js`) | Rust (`src-tauri/src/main.rs`) |
| Avatar UI | `apps/web/dist/index.html#avatar` | same (frontendDist) |
| Expand/collapse | `setBounds` on IPC | `set_size` via `set_avatar_expanded` command |
| Drag | `-webkit-app-region` on the grip | grip is draggable (CSS app-region) |
| Tray / hotkeys / click-through | Electron APIs | `TrayIconBuilder` + `global-shortcut` plugin + `set_ignore_cursor_events` |
| Full chat window | created on demand | `WebviewWindowBuilder` on demand |
| Window state | JSON in `userData` | JSON in `app_config_dir` |
| Bridge | `preload.js` (`window.bee`) | `window.__TAURI__.core.invoke` (`withGlobalTauri`) |

## Notes / limits

- Always-on-top cannot cover exclusive-fullscreen apps.
- If transparency flickers on a given GPU, disable hardware acceleration for the webview.
- The expand/collapse resize keeps the top-left corner (the Electron shell anchors the bottom-right); adjust in `set_avatar_expanded` if you prefer.
