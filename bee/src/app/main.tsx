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

// Offline app shell (browser/PWA only, production only — never in dev, where a
// service worker would serve stale modules and break HMR).
if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  window.location.protocol.startsWith('http')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is best-effort */
    });
  });
}
