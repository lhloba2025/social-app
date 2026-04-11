import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
        target: 'https://social-app-production-7cfd.up.railway.app',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/auth': {
        target: 'https://social-app-production-7cfd.up.railway.app',
        changeOrigin: true,
      },
      '/upload': {
        target: 'https://social-app-production-7cfd.up.railway.app',
        changeOrigin: true,
      },
    },
  },
});
