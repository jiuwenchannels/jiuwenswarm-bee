import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the build also works when loaded by the desktop
  // shell over a custom protocol (file:// / app://).
  base: './',
  plugins: [react()],
  server: {
    port: 5175,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
