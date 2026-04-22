/**
 * Config snippets displayed to the user after framework selection.
 * @module @pinflow/relay/cli/init/snippets
 */
import type { FrameworkId } from './types.js';

/**
 * Config snippet for each framework + bundler combination.
 * Displayed with syntax highlighting after package installation.
 */
export const CONFIG_SNIPPETS: Record<FrameworkId, string> = {
  next: `import type { NextConfig } from 'next';
import { withPinFlow } from '@pinflow/next';

const nextConfig: NextConfig = {};

export default withPinFlow()(nextConfig);`,

  nuxt: `export default defineNuxtConfig({
  modules: ['@pinflow/nuxt'],
});`,

  'react-vite': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';

export default defineConfig({
  plugins: [react(), pinflow()],
});`,

  'react-webpack': `const { PinFlowWebpackPlugin } = require('@pinflow/react/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@pinflow/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
      // ... your other loaders
    ],
  },
  plugins: [
    new PinFlowWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};`,

  'vue-vite': `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pinflow } from '@pinflow/vue/vite';

export default defineConfig({
  plugins: [vue(), pinflow()],
});`,

  'vue-webpack': `const { PinFlowWebpackPlugin } = require('@pinflow/vue/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@pinflow/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
      // ... your other loaders
    ],
  },
  plugins: [
    new PinFlowWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};`,

  'other-vite': `import { defineConfig } from 'vite';
import { pinflow } from '@pinflow/transform/plugins/vite';

export default defineConfig({
  plugins: [pinflow()],
});`,

  'other-webpack': `const {
  PinFlowWebpackPlugin,
} = require('@pinflow/transform/plugins/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@pinflow/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
      // ... your other loaders
    ],
  },
  plugins: [
    new PinFlowWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};`,
};
