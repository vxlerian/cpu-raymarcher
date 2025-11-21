import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cpu-raymarcher/',
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
