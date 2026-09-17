import '@fontsource-variable/inter';
import { createRoot } from 'react-dom/client';

import App from './App';
import { LocaleProvider } from '../i18n/LocaleContext';
import { ToastProvider } from '../components/common/ToastContext';
import { SettingsProvider } from '../settings/SettingsContext';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found');
}

createRoot(container).render(
  <SettingsProvider>
    <LocaleProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LocaleProvider>
  </SettingsProvider>,
);

// A service worker breaks the native shells: Capacitor and the Android overlay
// WebView serve the app from local assets via shouldInterceptRequest, but SW
// fetches bypass that and hit the (unreachable) network — "web page not
// available". Detect those webviews and keep them SW-free.
function isShellWebView(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return /; wv\)/.test(navigator.userAgent) || Boolean(capacitor?.isNativePlatform?.());
}

if ('serviceWorker' in navigator && isShellWebView()) {
  // Also clean up a worker registered by an older build.
  void navigator.serviceWorker
    .getRegistrations?.()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => {});
} else if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  window.location.protocol.startsWith('http')
) {
  // Offline app shell (browser/PWA only, production only — never in dev, where a
  // service worker would serve stale modules and break HMR).
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is best-effort */
    });
  });
}
