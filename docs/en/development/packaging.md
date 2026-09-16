# BeeChat — building an installer

Two installers are possible, one per desktop shell. The **web app must be built first** because both shells package `bee/dist`.

```powershell
cd bee
npm run build            # produces bee/dist
```

---

## Electron installer (NSIS) — ready to go

The `desktop/electron/package.json` is already configured (`electron-builder`, `extraResources` copies `bee/dist` into the app, NSIS target).

```powershell
cd desktop/electron
npm install
npm run package          # → release\BeeChat Setup <version>.exe
npm run package:dir      # unpacked only → release\win-unpacked\ (no installer)
```

| Output | Path | Size |
|---|---|---|
| Installer | `desktop/electron/release/BeeChat Setup 0.1.0.exe` | ~82 MB |
| Unpacked app | `desktop/electron/release/win-unpacked/BeeChat.exe` | — |

The installer is a normal NSIS setup: choose the folder, desktop + start-menu shortcuts.

### If packaging fails with a symlink error

```
ERROR: Cannot create symbolic link ... winCodeSign ... A required privilege is not held
```

`electron-builder` extracts signing tools that contain macOS symlinks. Two fixes:

1. **Run the terminal as Administrator**, or turn on **Developer Mode** (Settings → System → For developers), then remove `"signAndEditExecutable": false` from `desktop/package.json` to get the exe icon/version too.
2. **Keep it simple (current setup):** `"signAndEditExecutable": false` skips signing/editing, so no symlinks are needed — the installer builds, but the `.exe` keeps the default Electron icon/version metadata.

---

## Tauri installer (much smaller)

```powershell
cd desktop/tauri
npm install
npm run icon             # generates the icon set from the bee PNG (run once)
npm run build            # → src-tauri\target\release\bundle\
```

| Output | Path |
|---|---|
| NSIS installer | `desktop/tauri/src-tauri/target/release/bundle/nsis/BeeChat_0.1.0_x64-setup.exe` |
| MSI | `desktop/tauri/src-tauri/target/release/bundle/msi/BeeChat_0.1.0_x64_en-US.msi` |

Requires **Rust + MSVC C++ build tools** (see `desktop/tauri/README.md`). Expect ~5 MB instead of ~82 MB, because it uses the OS WebView2 instead of bundling Chromium.

Tauri only builds the targets you ask for; the default `"targets": "all"` produces both NSIS and MSI.

---

## Code signing (both)

Unsigned installers trigger **Windows SmartScreen** ("Windows protected your PC") and may raise AV flags. For distribution, sign with an EV/OV code-signing certificate:

- **Electron:** configure `win.certificateFile` / `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD`.
- **Tauri:** set the signing identity in `tauri.conf.json` (`bundle.windows.certificateThumbprint`) or via `TAURI_SIGNING_*` env vars.
---

## Versioning

| Where | Field |
|---|---|
| Web app | `bee/package.json` → `version` |
| Electron | `desktop/electron/package.json` → `version` (used in the installer filename) |
| Tauri | `desktop/tauri/src-tauri/tauri.conf.json` → `version` |

Bump all three together for a release.

---

## Quick reference

| Shell | Command | Result | Size |
|---|---|---|---|
| Electron | `cd desktop/electron && npm run package` | `release/BeeChat Setup <v>.exe` | ~82 MB |
| Tauri | `cd desktop/tauri && npm run icon && npm run build` | `src-tauri/target/release/bundle/**` | ~5 MB |
