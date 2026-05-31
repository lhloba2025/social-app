import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Backend target ───────────────────────────────────────────────────────────
//
// Default points to the Railway production backend (rehosted after the
// trial-expired outage in May 2026). The user upgraded to the Railway
// Hobby plan and redeployed `innovative-unity`, so the original URL is
// alive again.
//
// To run against a local backend instead (e.g. while developing the
// scheduler), set `VITE_BACKEND_URL=http://localhost:3001` in `.env.local`
// and restart Vite — the proxy picks the override up at boot.
//
// Note on `/api` rewrite: the Express server mounts its routes at
// `/api/...`, so we DO want the prefix forwarded as-is. Older revisions
// of this file stripped it because of an outdated Railway template;
// keeping VITE_BACKEND_STRIP_API as an opt-in lets us flip back if some
// future host expects unprefixed paths.
const BACKEND = (process.env.VITE_BACKEND_URL
  || 'https://social-app-production-7cfd.up.railway.app').replace(/\/+$/, '')

const STRIP_API = process.env.VITE_BACKEND_STRIP_API === '1'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        ...(STRIP_API ? { rewrite: (p) => p.replace(/^\/api/, '') } : {}),
      },
      '/auth': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/upload': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/uploads': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/health': {
        target: BACKEND,
        changeOrigin: true,
      },
    },
  },
});
