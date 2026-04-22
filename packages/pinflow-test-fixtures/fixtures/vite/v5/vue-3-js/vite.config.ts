import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { domscribe } from '@domscribe/vue/vite';

export default defineConfig({
  plugins: [
    vue(),
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
