import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    minify: false,
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
});
