import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the build works from any folder or subpath (e.g. GitHub Pages project sites).
  base: './',
  plugins: [react()],
  build: {
    // Everything ships in one bundle on purpose: lesson content is mostly text and compresses ~3.3×
    // (≈370 kB gzipped), and a single file keeps the static deploy dead simple. Raise the warning
    // threshold so the build output stays clean.
    chunkSizeWarningLimit: 1600,
  },
})
