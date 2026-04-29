/**
 * ⚠️ Preview fixture — `pnpm pinflow:preview` serves this.
 *
 * Unlike the sibling fixtures, this one loads the overlay + runtime
 * from workspace TypeScript source. If you edit this file or the init
 * shims next to it, verify the overlay still mounts with
 * `pnpm pinflow:preview:e2e`. See `.claude/rules/preview-pipeline.md`.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';
import {
  pinflowLocalPreviewViteConfig,
  rewritePinflowInitImports,
} from '../../../../shared/pinflow-local-workspace-overrides.js';

function pinflowLocalWorkspaceOverrides() {
  return {
    name: 'pinflow-local-workspace-overrides',
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        return rewritePinflowInitImports(html);
      },
    },
    transform(code: string, id: string) {
      if (!id.includes('/src/')) {
        return null;
      }

      const rewritten = rewritePinflowInitImports(code);
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
      runner: {
        autoStart: true,
        provider: 'codex',
      },
    }),
  ],
  build: {
    outDir: 'dist',
    minify: true,
  },
  ...pinflowLocalPreviewViteConfig(),
});
