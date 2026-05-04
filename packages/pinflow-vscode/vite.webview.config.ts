import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/runs-webview'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/runs-webview'),
    emptyOutDir: true,
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/runs-webview/index.html'),
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks: { lit: ['lit'] },
      },
      treeshake: { moduleSideEffects: false },
    },
  },
});
