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
}

interface TauriGlobal {
  core?: { invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
}

function tauri(): TauriGlobal | undefined {
  return (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;
}

function electron(): ElectronBridge | undefined {
  return (window as unknown as { bee?: ElectronBridge }).bee;
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

export const desktop = {
  isDesktop,

  /** Resize the avatar window between collapsed (avatar only) and expanded. */
  setExpanded(expanded: boolean): void {
    electron()?.setExpanded?.(expanded);
    void tauri()?.core?.invoke('set_avatar_expanded', { expanded });
  },

  setClickThrough(enabled: boolean): void {
    electron()?.setClickThrough?.(enabled);
    void tauri()?.core?.invoke('set_click_through', { enabled });
  },
};
