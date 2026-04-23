import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';
import { rewritePinflowInitImports } from '../../../../shared/pinflow-local-workspace-overrides.js';

const PINFLOW_DEV_CACHE_TAG = 'pinflow-ui-2026-04-24a';

function pinflowLocalWorkspaceOverrides() {
  return {
    name: 'pinflow-local-workspace-overrides',
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        return rewritePinflowInitImports(html, PINFLOW_DEV_CACHE_TAG);
      },
    },
    transform(code: string, id: string) {
      if (!id.includes('/src/')) {
        return null;
      }

      const rewritten = rewritePinflowInitImports(code, PINFLOW_DEV_CACHE_TAG);
      return rewritten === code ? null : rewritten;
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
        initialMode: 'expanded',
        initialTheme: 'light',
      },
    }),
  ],
  build: {
    outDir: 'dist',
    minify: true,
  },
  resolve: {
    preserveSymlinks: false,
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  optimizeDeps: {
    exclude: [
      '@pinflow/core',
      '@pinflow/runtime',
      '@pinflow/react',
      '@pinflow/relay',
      '@pinflow/manifest',
      '@pinflow/overlay',
      'lit',
      'lit-html',
      'lit/decorators.js',
      '@lit/reactive-element',
    ],
  },
});
