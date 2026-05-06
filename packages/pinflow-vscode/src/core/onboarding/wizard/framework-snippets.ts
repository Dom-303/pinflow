/**
 * Framework-specific snippet templates shown when auto-patching is unavailable.
 * Pure module — no side effects, no dependencies.
 * @module
 */

import type { FrameworkId } from './app-detection.js';

/**
 * Returns a code snippet for manual wiring of the PinFlow plugin for the
 * given framework. Shown in the wizard fallback path when vite-config
 * auto-patching fails or the framework doesn't support auto-patching.
 */
export function getFrameworkSnippet(framework: FrameworkId): string {
  return SNIPPETS[framework];
}

const SNIPPETS: Record<FrameworkId, string> = {
  'react-vite': `\
// vite.config.ts
import { pinflow } from '@pinflow/react/vite';

export default defineConfig({
  plugins: [
    react(),
    pinflow(), // ← add this after react()
  ],
});`,

  'vue-vite': `\
// vite.config.ts
import { pinflow } from '@pinflow/vue/vite';

export default defineConfig({
  plugins: [
    vue(),
    pinflow(), // ← add this after vue()
  ],
});`,

  'react-webpack': `\
// webpack.config.js
const { PinFlowWebpackPlugin } = require('@pinflow/react/webpack');

module.exports = {
  plugins: [
    new PinFlowWebpackPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\\.[jt]sx?$/,
        use: ['@pinflow/transform/webpack-loader'],
        enforce: 'pre',
      },
    ],
  },
};`,

  'vue-webpack': `\
// webpack.config.js
const { PinFlowWebpackPlugin } = require('@pinflow/vue/webpack');

module.exports = {
  plugins: [
    new PinFlowWebpackPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\\.[jt]sx?$/,
        use: ['@pinflow/transform/webpack-loader'],
        enforce: 'pre',
      },
    ],
  },
};`,

  next: `\
// next.config.ts
import { withPinFlow } from '@pinflow/next';

const nextConfig = {};

export default withPinFlow(nextConfig);`,

  nuxt: `\
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinflow/nuxt'],
});`,

  'other-vite': `\
// vite.config.ts
import { pinflow } from '@pinflow/transform/plugins/vite';

export default defineConfig({
  plugins: [
    pinflow(), // ← add this to your plugins array
  ],
});`,

  'other-webpack': `\
// webpack.config.js
// See docs: https://pinflow.dev/docs/webpack
const { PinFlowWebpackPlugin } = require('@pinflow/transform/plugins/webpack');

module.exports = {
  plugins: [new PinFlowWebpackPlugin()],
};`,
};
