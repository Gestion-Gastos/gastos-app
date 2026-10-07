import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' hace que funcione igual en local y en GitHub Pages (usuario.github.io/repo)
export default defineConfig({
  plugins: [react()],
  base: './',
})
