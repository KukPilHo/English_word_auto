import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/English_word_auto/',
  build: {
    chunkSizeWarningLimit: 1000
  }
})
