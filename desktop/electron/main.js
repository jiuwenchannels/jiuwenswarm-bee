'use strict';

/**
 * BeeChat desktop avatar (Electron).
 *
 * A single always-on-top, transparent, frameless window hosts the animated
 * character AND the chat bubble/inline input (`index.html#avatar`). There is no
 * separate chat window by default; the tray can still open the full app.
 */

const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, screen, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const AVATAR_COLLAPSED = { width: 220, height: 280 };
const AVATAR_EXPANDED = { width: 380, height: 620 };
// Packaged builds copy the web build to resources/bee-dist (extraResources).
const DIST_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'bee-dist')
  : path.join(__dirname, '..', '..', 'bee', 'dist');

// Brand assets are shared with the web app (single source of truth).
const BEE_ASSETS_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'bee-assets')
  : path.join(__dirname, '..', '..', 'bee', 'src', 'assets');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let avatarWindow = null;
let chatWindow = null;
let tray = null;
let clickThrough = false;

function stateFile() {
  return path.join(app.getPath('userData'), 'bee-desktop-state.json');
}

function log(...args) {
  const line = `${new Date().toISOString()} ${args.join(' ')}`;
  // eslint-disable-next-line no-console
  console.log(line);
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'bee-desktop.log'), `${line}\n`);
  } catch {
    /* best effort */
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return {};
  }
}

function saveState(patch) {
  try {
    fs.writeFileSync(stateFile(), JSON.stringify({ ...loadState(), ...patch }));
  } catch {
    /* best effort */
  }
}

function createAvatarWindow() {
  const state = loadState();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  avatarWindow = new BrowserWindow({
    width: AVATAR_COLLAPSED.width,
    height: AVATAR_COLLAPSED.height,
    x: typeof state.petX === 'number' ? state.petX : width - AVATAR_COLLAPSED.width - 48,
    y: typeof state.petY === 'number' ? state.petY : height - AVATAR_COLLAPSED.height - 48,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  avatarWindow.setAlwaysOnTop(true, 'screen-saver');
  avatarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  log('[bee] loading avatar window (index.html#avatar)');
  avatarWindow.webContents.on('did-finish-load', () => log('[bee] avatar window loaded'));
  avatarWindow.webContents.on('did-fail-load', (_e, code, desc, url) =>
    log(`[bee] avatar load failed: ${code} ${desc} ${url}`),
  );
  avatarWindow.webContents.on('preload-error', (_e, preloadPath, error) =>
    log(`[bee] preload error (${preloadPath}): ${error && error.message}`),
  );
  avatarWindow.loadURL('app://bee/index.html#avatar');

  avatarWindow.on('moved', () => {
    const [x, y] = avatarWindow.getPosition();
    saveState({ petX: x, petY: y });
  });
  avatarWindow.on('closed', () => {
    avatarWindow = null;
  });

  if (state.petHidden) avatarWindow.hide();
}

function setAvatarExpanded(expanded) {
  if (!avatarWindow || avatarWindow.isDestroyed()) return;
  const size = expanded ? AVATAR_EXPANDED : AVATAR_COLLAPSED;
  const bounds = avatarWindow.getBounds();
  const display = screen.getDisplayMatching(bounds).workArea;
  // Anchor the bottom-right corner so the character stays put while growing.
  let x = bounds.x + bounds.width - size.width;
  let y = bounds.y + bounds.height - size.height;
  x = Math.min(Math.max(x, display.x), display.x + display.width - size.width);
  y = Math.min(Math.max(y, display.y), display.y + display.height - size.height);
  avatarWindow.setBounds({ x, y, width: size.width, height: size.height });
  saveState({ petX: x, petY: y });
}

function createChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.show();
    chatWindow.focus();
    return;
  }
  chatWindow = new BrowserWindow({
    width: 460,
    height: 720,
    minWidth: 360,
    minHeight: 520,
    title: 'BeeChat',
    backgroundColor: '#fdf8ea',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  const devUrl = process.env.BEECHAT_URL || (process.argv.includes('--dev') ? 'http://localhost:5175' : null);
  if (devUrl) chatWindow.loadURL(devUrl);
  else chatWindow.loadURL('app://bee/index.html');
  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

function setClickThrough(enabled) {
  clickThrough = enabled;
  if (avatarWindow && !avatarWindow.isDestroyed()) {
    avatarWindow.setIgnoreMouseEvents(enabled, { forward: true });
  }
}

function toggleAvatar() {
  if (!avatarWindow || avatarWindow.isDestroyed()) {
    createAvatarWindow();
    return;
  }
  if (avatarWindow.isVisible()) {
    avatarWindow.hide();
    saveState({ petHidden: true });
  } else {
    avatarWindow.show();
    saveState({ petHidden: false });
  }
}

function rebuildTray() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'Show / hide assistant', click: toggleAvatar },
    { label: 'Open full chat window', click: createChatWindow },
    { type: 'separator' },
    { label: 'Click-through', type: 'checkbox', checked: clickThrough, click: (item) => setClickThrough(item.checked) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  const iconPath = path.join(BEE_ASSETS_DIR, 'bee-static.png');
  tray = new Tray(nativeImage.createFromPath(iconPath));
  tray.setToolTip('BeeChat');
  tray.on('click', toggleAvatar);
  rebuildTray();
}

// --- Offline speech-to-text (whisper.cpp) --------------------------------
//
// The webview has no cloud recognizer, so the renderer records a 16 kHz WAV and
// this process transcribes it with a local whisper.cpp CLI. Nothing is bundled:
// drop `whisper-cli[.exe]` + a `ggml-*.bin` model into the userData `whisper/`
// folder (or point BEE_WHISPER_BIN / BEE_WHISPER_MODEL at them). When absent,
// the UI simply hides push-to-talk.

function whisperPaths() {
  const binName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
  const modelName = 'ggml-base.bin';
  const binOverride = process.env.BEE_WHISPER_BIN;
  const modelOverride = process.env.BEE_WHISPER_MODEL;
  const candidates = [];
  if (process.env.BEE_WHISPER_DIR) candidates.push(process.env.BEE_WHISPER_DIR);
  // repo-local `whisper/` (dev), then userData and the known packaged names.
  candidates.push(path.join(__dirname, '..', '..', 'whisper'));
  candidates.push(path.join(app.getPath('userData'), 'whisper'));
  const appData = app.getPath('appData');
  for (const name of [
    'BeeChat',
    'jiuwenswarm-bee-desktop-electron',
    'jiuwenswarm-bee-desktop',
    'com.jiuwenswarm.beechat',
  ]) {
    candidates.push(path.join(appData, name, 'whisper'));
  }
  for (const dir of candidates) {
    const bin = binOverride || path.join(dir, binName);
    const model = modelOverride || path.join(dir, modelName);
    if (fs.existsSync(bin) && fs.existsSync(model)) return { bin, model };
  }
  const fallback = process.env.BEE_WHISPER_DIR || candidates[0];
  return {
    bin: binOverride || path.join(fallback, binName),
    model: modelOverride || path.join(fallback, modelName),
  };
}

function voiceAvailable() {
  const { bin, model } = whisperPaths();
  return fs.existsSync(bin) && fs.existsSync(model);
}

function transcribeWav(bytes, lang) {
  const { bin, model } = whisperPaths();
  if (!voiceAvailable()) return { ok: false, error: 'voice-unavailable' };
  const wav = path.join(app.getPath('temp'), `bee-voice-${Date.now()}.wav`);
  const txt = `${wav}.txt`;
  const cleanup = () => {
    try {
      fs.unlinkSync(wav);
    } catch {
      /* best effort */
    }
    try {
      fs.unlinkSync(txt);
    } catch {
      /* best effort */
    }
  };
  try {
    fs.writeFileSync(wav, Buffer.from(new Uint8Array(bytes)));
  } catch (error) {
    return { ok: false, error: `write-failed: ${error.message}` };
  }
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(bin, ['-m', model, '-f', wav, '-l', lang || 'auto', '-nt', '-otxt'], {
        windowsHide: true,
      });
    } catch (error) {
      cleanup();
      resolve({ ok: false, error: `spawn-failed: ${error.message}` });
      return;
    }
    let stderr = '';
    child.stdout.on('data', () => {});
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      cleanup();
      resolve({ ok: false, error: error.message });
    });
    child.on('close', (code) => {
      let text = '';
      try {
        text = fs.readFileSync(txt, 'utf8').trim();
      } catch {
        /* -otxt produced nothing */
      }
      cleanup();
      if (code === 0 && text) resolve({ ok: true, text });
      else resolve({ ok: false, error: stderr || `exit ${code}` });
    });
  });
}

ipcMain.handle('bee:voice-available', () => voiceAvailable());
ipcMain.handle('bee:transcribe', (_event, bytes, lang) => transcribeWav(bytes, lang));

// --- IPC -----------------------------------------------------------------

ipcMain.on('bee:open-chat', () => createChatWindow());
ipcMain.on('bee:set-expanded', (_event, expanded) => setAvatarExpanded(Boolean(expanded)));
ipcMain.on('bee:set-click-through', (_event, enabled) => setClickThrough(Boolean(enabled)));
ipcMain.on('bee:log', (_event, message) => log(`[avatar] ${message}`));
ipcMain.on('bee:hide-pet', () => {
  if (avatarWindow && !avatarWindow.isDestroyed()) avatarWindow.hide();
  saveState({ petHidden: true });
  rebuildTray();
});
ipcMain.on('bee:quit', () => app.quit());

// --- Lifecycle ------------------------------------------------------------

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => toggleAvatar());

  app.whenReady().then(() => {
    log('[bee] app ready');
    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filePath = path.join(DIST_DIR, relative || 'index.html');
      if (!filePath.startsWith(DIST_DIR)) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(filePath).toString());
    });

    createAvatarWindow();
    createTray();

    globalShortcut.register('CommandOrControl+Shift+H', toggleAvatar);
    globalShortcut.register('CommandOrControl+Shift+B', createChatWindow);
  });

  app.on('window-all-closed', () => {
    // Keep running in the tray; quit from the tray menu.
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
