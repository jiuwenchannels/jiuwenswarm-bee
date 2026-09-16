import { createRoot } from 'react-dom/client';

import App from './App';
import { LocaleProvider } from '../i18n/LocaleContext';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found');
}

createRoot(container).render(
  <LocaleProvider>
    <App />
  </LocaleProvider>,
);
