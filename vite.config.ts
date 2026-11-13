import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Chemins relatifs : l'application fonctionne aussi dans un sous-dossier (GitHub Pages, Netlify…).
  base: './',
  plugins: [react()],
})
