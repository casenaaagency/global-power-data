import { defineConfig } from 'vite'

// On GitHub Pages a project site is served from /<repo>/, so derive the base
// from the repository name during CI; locally and on root hosts it stays '/'.
const repo = (process.env.GITHUB_REPOSITORY || '').split('/')[1]
const base = process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/'

// Lean config. The site is a single semantic HTML document progressively
// enhanced by the modules in /src. We keep three in its own chunk so the
// semantic + motion layers can paint before the heavy WebGL bundle arrives.
export default defineConfig({
  base,
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
