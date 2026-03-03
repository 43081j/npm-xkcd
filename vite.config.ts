import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
});
