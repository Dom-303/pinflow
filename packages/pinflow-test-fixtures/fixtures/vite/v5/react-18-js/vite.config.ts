import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { domscribe } from '@domscribe/react/vite';

export default defineConfig({
  plugins: [
    react(),
    domscribe({
      debug: false,
      overlay: true,
    }),
  ],
  build: {
    outDir: 'dist',
    minify: true,
  },
  resolve: {
    preserveSymlinks: true,
  },
});
