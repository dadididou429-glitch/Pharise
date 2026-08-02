import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://dadid.github.io/Pharise/
export default defineConfig({
  plugins: [react()],
  base: '/Pharise/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
