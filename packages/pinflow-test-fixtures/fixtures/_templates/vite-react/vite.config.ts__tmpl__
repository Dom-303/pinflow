import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';

export default defineConfig({
  plugins: [
    react(),
    pinflow({
      debug: false,
      overlay: {
        initialMode: 'expanded',
      },
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
