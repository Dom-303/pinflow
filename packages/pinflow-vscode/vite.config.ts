import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  resolve: {
    alias: {
      // The real `vscode` module is injected by the extension host at runtime.
      // Vitest can't resolve it from npm, so we point it at a tiny stub for
      // test runs only.
      vscode: path.resolve(__dirname, 'src/__test-utils__/vscode-stub.ts'),
    },
  },
  test: {
    name: 'pinflow-vscode',
    watch: false,
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
    outputFile: './test-output/vitest/report.json',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './test-output/vitest/coverage',
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        'src/__test-utils__/**',
      ],
    },
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
});
