/**
 * Thin bridge to the desktop shells (Electron or Tauri). No-ops in the browser.
 *
 * Electron exposes `window.bee` (preload); Tauri exposes `window.__TAURI__`
 * (withGlobalTauri = true).
 */

interface ElectronBridge {
  setExpanded?: (expanded: boolean) => void;
  setClickThrough?: (enabled: boolean) => void;
  openChat?: () => void;
  quit?: () => void;
  voiceAvailable?: () => Promise<boolean>;
  transcribe?: (
    bytes: ArrayBuffer,
    lang?: string,
  ) => Promise<{ ok: boolean; text?: string; error?: string }>;
}

interface TauriGlobal {
  core?: { invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
}

/** Native overlay bridge exposed by the Android app (`OverlayService`). */
interface AndroidOverlayBridge {
  setExpanded?: (expanded: boolean) => void;
  moveBy?: (dx: number, dy: number) => void;
  close?: () => void;
}

function tauri(): TauriGlobal | undefined {
  return (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;
}

function electron(): ElectronBridge | undefined {
  return (window as unknown as { bee?: ElectronBridge }).bee;
}

function androidOverlay(): AndroidOverlayBridge | undefined {
  return (window as unknown as { AndroidBee?: AndroidOverlayBridge }).AndroidBee;
}

export function isDesktop(): boolean {
  return Boolean(electron()) || Boolean(tauri()?.core);
}

/** True when running inside a Capacitor native shell (the Android app). */
export function isNativeApp(): boolean {
  const capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}

/** True when running inside the Android floating overlay (the draggable pet window). */
export function isAndroidOverlay(): boolean {
  return Boolean(androidOverlay());
}

export const desktop = {
  isDesktop,

  /** Resize the avatar window between collapsed (avatar only) and expanded. */
  setExpanded(expanded: boolean): void {
    electron()?.setExpanded?.(expanded);
    void tauri()?.core?.invoke('set_avatar_expanded', { expanded });
    androidOverlay()?.setExpanded?.(expanded);
  },

  /** Move the floating overlay window by a delta (Android overlay only). */
  moveBy(dx: number, dy: number): void {
    androidOverlay()?.moveBy?.(dx, dy);
  },

  /** Close the floating overlay window (Android overlay only). */
  closeOverlay(): void {
    androidOverlay()?.close?.();
  },

  setClickThrough(enabled: boolean): void {
    electron()?.setClickThrough?.(enabled);
    void tauri()?.core?.invoke('set_click_through', { enabled });
  },

  /** Quit the desktop app (Electron/Tauri). No-op in the browser. */
  quit(): void {
    electron()?.quit?.();
    void tauri()?.core?.invoke('quit');
  },
};

/**
 * True when the desktop shell has an offline speech-to-text engine wired
 * (whisper.cpp binary + model present). The UI shows push-to-talk only then.
 */
export async function shellVoiceAvailable(): Promise<boolean> {
  const electronBridge = electron();
  if (electronBridge?.voiceAvailable) {
    try {
      return Boolean(await electronBridge.voiceAvailable());
    } catch {
      return false;
    }
  }
  const tauriGlobal = tauri();
  if (tauriGlobal?.core) {
    try {
      return Boolean(await tauriGlobal.core.invoke('voice_available'));
    } catch {
      return false;
    }
  }
  return false;
}

/** Transcribe 16 kHz mono WAV bytes via the shell's whisper.cpp; null on failure. */
export async function shellTranscribe(bytes: ArrayBuffer, lang?: string): Promise<string | null> {
  const electronBridge = electron();
  if (electronBridge?.transcribe) {
    try {
      const result = await electronBridge.transcribe(bytes, lang);
      return result?.ok ? (result.text ?? null) : null;
    } catch {
      return null;
    }
  }
  const tauriGlobal = tauri();
  if (tauriGlobal?.core) {
    try {
      const result = (await tauriGlobal.core.invoke('transcribe', {
        bytes: Array.from(new Uint8Array(bytes)),
        lang,
      })) as { ok?: boolean; text?: string } | null;
      return result?.ok ? (result.text ?? null) : null;
    } catch {
      return null;
    }
  }
  return null;
}
