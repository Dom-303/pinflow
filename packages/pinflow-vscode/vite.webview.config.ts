import { defineConfig } from 'vite';
import path from 'node:path';

const here = import.meta.dirname;

export default defineConfig({
  root: path.resolve(here, 'src/runs-webview'),
  base: './',
  build: {
    outDir: path.resolve(here, 'dist/runs-webview'),
    emptyOutDir: true,
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(here, 'src/runs-webview/index.html'),
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks: { lit: ['lit'] },
      },
      // Default treeshake is correct: Lit's @customElement decorator
      // registers components as a module-level side effect, so we must
      // NOT mark moduleSideEffects: false (which would strip the
      // registrations and break component rendering at runtime).
    },
  },
});
