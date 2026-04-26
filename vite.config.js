import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/persons': { target: 'http://localhost:3001', changeOrigin: false },
      '/dinos':   { target: 'http://localhost:3001', changeOrigin: false },
    },
  },
})
