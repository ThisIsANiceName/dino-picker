import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const api = { target: process.env.API_TARGET ?? 'http://localhost:3001', changeOrigin: false }

// Every API prefix served by server/app.js must be listed here (keep in sync with API_PREFIXES).
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/persons': api,
      '/dinos': api,
      '/designs': api,
      '/team': api,
      '/uploads': api,
      '/health': api,
    },
  },
})
