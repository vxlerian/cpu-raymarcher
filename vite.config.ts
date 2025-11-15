import { defineConfig } from 'vite';

export default defineConfig({
  base: '/raymarcher-test/',
  build: {
    outDir: 'dist',
  },
  server: {
    hmr: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
  }
})
