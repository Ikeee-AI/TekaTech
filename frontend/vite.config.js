import { defineConfig } from 'vite'
import { env } from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'deployment-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ commit: env.RENDER_GIT_COMMIT || env.GITHUB_SHA || 'local' }),
      })
    },
  }],
})
