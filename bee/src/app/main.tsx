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
