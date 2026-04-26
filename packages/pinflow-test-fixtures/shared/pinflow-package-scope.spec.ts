import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function readPackage(relativePath: string): {
  name?: string;
  dependencies?: Record<string, string>;
  publishConfig?: {
    access?: string;
  };
} {
  return JSON.parse(readRepoFile(relativePath)) as {
    name?: string;
    dependencies?: Record<string, string>;
    publishConfig?: {
      access?: string;
    };
  };
}

describe('pinflow package scopes', () => {
  it('uses @pinflow package identities for the public framework and runtime packages', () => {
    expect(readPackage('packages/pinflow-core/package.json').name).toBe(
      '@pinflow/core',
    );
    expect(readPackage('packages/pinflow-manifest/package.json').name).toBe(
      '@pinflow/manifest',
    );
    expect(readPackage('packages/pinflow-relay/package.json').name).toBe(
      '@pinflow/relay',
    );
    expect(readPackage('packages/pinflow-runtime/package.json').name).toBe(
      '@pinflow/runtime',
    );
    expect(readPackage('packages/pinflow-overlay/package.json').name).toBe(
      '@pinflow/overlay',
    );
    expect(readPackage('packages/pinflow-transform/package.json').name).toBe(
      '@pinflow/transform',
    );
    expect(readPackage('packages/pinflow-react/package.json').name).toBe(
      '@pinflow/react',
    );
    expect(readPackage('packages/pinflow-vue/package.json').name).toBe(
      '@pinflow/vue',
    );
    expect(readPackage('packages/pinflow-next/package.json').name).toBe(
      '@pinflow/next',
    );
    expect(readPackage('packages/pinflow-nuxt/package.json').name).toBe(
      '@pinflow/nuxt',
    );
  });

  it('uses @pinflow workspace dependencies across the renamed package graph', () => {
    expect(
      readPackage('packages/pinflow-transform/package.json').dependencies,
    ).toMatchObject({
      '@pinflow/core': 'workspace:*',
      '@pinflow/manifest': 'workspace:*',
      '@pinflow/overlay': 'workspace:*',
      '@pinflow/relay': 'workspace:*',
    });

    expect(
      readPackage('packages/pinflow-react/package.json').dependencies,
    ).toMatchObject({
      '@pinflow/core': 'workspace:*',
      '@pinflow/runtime': 'workspace:*',
      '@pinflow/transform': 'workspace:*',
    });

    expect(
      readPackage('packages/pinflow-next/package.json').dependencies,
    ).toMatchObject({
      '@pinflow/transform': 'workspace:*',
      '@pinflow/runtime': 'workspace:*',
      '@pinflow/react': 'workspace:*',
    });
  });

  it('marks every publishable package as public for npm release', () => {
    const publishablePackages = [
      'packages/pinflow-cli/package.json',
      'packages/pinflow-core/package.json',
      'packages/pinflow-manifest/package.json',
      'packages/pinflow-mcp/package.json',
      'packages/pinflow-next/package.json',
      'packages/pinflow-nuxt/package.json',
      'packages/pinflow-overlay/package.json',
      'packages/pinflow-react/package.json',
      'packages/pinflow-relay/package.json',
      'packages/pinflow-runtime/package.json',
      'packages/pinflow-transform/package.json',
      'packages/pinflow-vue/package.json',
    ];

    for (const packagePath of publishablePackages) {
      expect(readPackage(packagePath).publishConfig?.access).toBe('public');
    }
  });

  it('prefers @pinflow package names in the main onboarding docs', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('npm install -D @pinflow/next');
    expect(readme).toContain("import { withPinFlow } from '@pinflow/next';");
    expect(readme).toContain('npm install -D @pinflow/react');
    expect(readme).toContain("import { pinflow } from '@pinflow/react/vite';");
    expect(readme).toContain("require('@pinflow/react/webpack')");
    expect(readme).toContain('npm install -D @pinflow/vue');
    expect(readme).toContain("import { pinflow } from '@pinflow/vue/vite';");
    expect(readme).toContain("require('@pinflow/vue/webpack')");
    expect(readme).toContain('npm install -D @pinflow/transform');
    expect(readme).toContain(
      "import { pinflow } from '@pinflow/transform/plugins/vite';",
    );
    expect(readme).toContain("require('@pinflow/transform/plugins/webpack')");
  });

  it('uses pinflow-first package names and framework aliases in fixture sources', () => {
    const nextConfig = readRepoFile(
      'packages/pinflow-test-fixtures/fixtures/next/v16/ts/next.config.ts',
    );
    const reactViteConfig = readRepoFile(
      'packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts/vite.config.ts',
    );
    const vueViteConfig = readRepoFile(
      'packages/pinflow-test-fixtures/fixtures/vite/v5/vue-3-ts/vite.config.ts',
    );
    const webpackConfig = readRepoFile(
      'packages/pinflow-test-fixtures/fixtures/webpack/v5/react-19-ts/webpack.config.js',
    );
    const nuxtConfig = readRepoFile(
      'packages/pinflow-test-fixtures/fixtures/nuxt/v3/ts/nuxt.config.ts',
    );

    expect(nextConfig).toContain(
      "import { withPinFlow } from '@pinflow/next';",
    );
    expect(reactViteConfig).toContain(
      "import { pinflow } from '@pinflow/react/vite';",
    );
    expect(vueViteConfig).toContain(
      "import { pinflow } from '@pinflow/vue/vite';",
    );
    expect(webpackConfig).toContain(
      "const { PinFlowWebpackPlugin } = require('@pinflow/react/webpack');",
    );
    expect(webpackConfig).toContain(
      "loader: '@pinflow/transform/webpack-loader'",
    );
    expect(nuxtConfig).toContain("modules: ['@pinflow/nuxt']");
  });
});
