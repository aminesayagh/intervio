/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Backend requests, and the Google sign-in round trip, go to Spring Boot in development.
    proxy: {
      '/api': 'http://localhost:8080',
      // Keep the browser's host (localhost:5173) so Spring builds the Google return address
      // registered in Google Cloud: http://localhost:5173/login/oauth2/code/google
      '/oauth2': { target: 'http://localhost:8080', changeOrigin: false },
      '/login/oauth2': { target: 'http://localhost:8080', changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Interface tests (a calendar, many fields, the virtualized table) are heavy in
    // jsdom when they run in parallel: 30 s each, not the 5 s default, so a busy
    // machine doesn't fail them.
    testTimeout: 30_000,
  },
})
