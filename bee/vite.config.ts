import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the build also works when loaded by the desktop
  // shell over a custom protocol (file:// / app://).
  base: './',
  plugins: [react()],
  server: {
    // Listen on all interfaces so phones/other devices on the LAN can reach the
    // dev server (e.g. http://192.168.x.x:5175). Dev only.
    host: true,
    port: 5175,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
