import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // auto-init dynamically imports @pinflow/overlay which isn't a direct
      // dependency — help Vite resolve it for tests (vi.mock intercepts at runtime)
      '@pinflow/overlay': path.resolve(
        __dirname,
        '../pinflow-overlay/src/index.ts',
      ),
    },
  },
  test: {
    name: '@pinflow/next',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    outputFile: './test-output/vitest/report.json',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './test-output/vitest/coverage',
      thresholds: {
        lines: 0.8,
        functions: 0.8,
        branches: 0.7,
        statements: 0.8,
      },
    },
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
});
