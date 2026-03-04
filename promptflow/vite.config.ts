import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    // Override any PostCSS config discovery (which may include Tailwind)
    postcss: {
      plugins: [],
    },
  },
})
