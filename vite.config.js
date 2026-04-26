import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Person API → local Express server
      '/persons': {
        target: 'http://localhost:3001',
        changeOrigin: false,
      },
      // Dino API → RESTasaurus (bypasses browser CORS)
      '/api': {
        target: 'https://restasaurus.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
