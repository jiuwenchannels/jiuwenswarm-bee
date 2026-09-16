# Changelog

User-visible changes per release. The three version manifests (`bee/package.json`,
`desktop/electron/package.json`, `desktop/tauri/src-tauri/tauri.conf.json`) are bumped
together; see [CONTRIBUTING.md](../CONTRIBUTING.md).

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
