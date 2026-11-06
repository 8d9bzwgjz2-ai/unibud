import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sandbox preview support: the platform proxy forwards the external host and
// serves the origin over https. Everything here is inert outside the sandbox.
const previewMode = process.env.BASE44_PREVIEW_MODE === '1';
const sandboxHost = process.env.BASE44_SANDBOX_HOST_DOMAIN;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: previewMode && sandboxHost ? [`.${sandboxHost}`] : [],
    hmr: previewMode ? { protocol: 'wss', clientPort: 443 } : undefined,
    proxy: {
      // Single origin keeps the session cookie first-party.
      '/api': {
        target: process.env.API_URL || 'http://api:3001',
        changeOrigin: true,
      },
    },
  },
});
