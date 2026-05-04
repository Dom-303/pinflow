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
    },
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
});
