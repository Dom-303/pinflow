import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pinflow } from '@pinflow/vue/vite';

export default defineConfig({
  plugins: [
    vue(),
    pinflow({
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
