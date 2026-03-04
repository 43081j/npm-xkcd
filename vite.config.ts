import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
  },
  base: '/npm-xkcd/',
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
});
