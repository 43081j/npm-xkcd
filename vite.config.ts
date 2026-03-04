import {defineConfig} from 'vite';
import {viteStaticCopy} from 'vite-plugin-static-copy';

export default defineConfig(({command}) => ({
  plugins: [
    command === 'build' && viteStaticCopy({
      targets: [{ src: 'node_modules/coi-serviceworker/coi-serviceworker.js', dest: '.' }]
    })
  ],
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
}));
