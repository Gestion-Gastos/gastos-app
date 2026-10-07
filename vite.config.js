import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' hace que funcione igual en local y en GitHub Pages (usuario.github.io/repo)
export default defineConfig({
  plugins: [react()],
  base: './',
  // Docs/ no es parte de la app; si un Excel está abierto ahí, Windows lo bloquea y Vite se cae
  server: { watch: { ignored: ['**/Docs/**'] } },
})
