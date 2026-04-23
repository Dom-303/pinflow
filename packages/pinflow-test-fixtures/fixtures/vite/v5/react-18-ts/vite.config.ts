import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';

const PINFLOW_DEV_CACHE_TAG = 'pinflow-ui-2026-04-23b';

function pinflowLocalWorkspaceOverrides() {
  return {
    name: 'pinflow-local-workspace-overrides',
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        return html
          .replace(
            /import\('\/@pinflow\/overlay-init\.js(?:\?[^']*)?'\);/g,
            `import('/pinflow-local-overlay-init.ts?v=${PINFLOW_DEV_CACHE_TAG}');`,
          )
          .replace(
            /import\('\/@pinflow\/react-init\.js(?:\?[^']*)?'\);/g,
            `import('/pinflow-local-react-init.ts?v=${PINFLOW_DEV_CACHE_TAG}');`,
          );
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    pinflowLocalWorkspaceOverrides(),
    pinflow({
      debug: false,
      overlay: {
        initialMode: 'collapsed',
        initialTheme: 'light',
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
