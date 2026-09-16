# Roadmap

Status of planned and missing work. Add items as they are discovered; move completed
items to [changelog.md](changelog.md).

## Done

- One-screen Q&A chat with streaming tokens
- Reactive bee avatar (mascot + vector styles)
- Both gateway protocols (SDK envelope + product event/req) with failover and reconnect
- Light/dark themes, mobile layout, accessibility basics
- Electron and Tauri desktop shells with voice + lip-sync
- Installer packaging (NSIS) for both shells
- Repository organised by domain; CI for the web app and shell syntax

## Next

- **Avatar art**: only two bee poses ship (`bee-static`, `bee-flying`); add dedicated
  thinking / talking frames so the state machine maps to real art.
- **Lint/format**: add ESLint + Prettier and wire them into CI.
- **Release automation**: a script to bump the three version manifests together and
  tag, instead of editing them by hand.
- **Golden-path E2E**: a smoke test that runs the app against a stub gateway in CI
  (the gateway is not yet available headless).
- **Chinese docs**: complete `docs/zh/` (currently an index plus a partial user guide).

## Known gaps / risks

| Risk | Note |
|---|---|
| Gateway protocol drift | All framing is isolated in `bee/src/gateway/`; version is visible via `ack.protocol_version` |
| Duplicate config facts across README/docs/.env | Canonical values live in `bee/src/gateway/config.ts` and `bee/.env.example`; docs link rather than restate |
| Shells can drift apart | Electron and Tauri implement the same feature set by hand; the mapping table in `architecture.md` is the contract |
| Signing | Installers are unsigned; expect SmartScreen/AV warnings until a signing certificate is configured |
