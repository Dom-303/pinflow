import { describe, it, expect, vi, beforeEach } from 'vitest';

import { installFrameworkPlugin } from './framework-plugin.js';
import type { FrameworkPluginDeps } from './framework-plugin.js';

function makeOnOutput(): (line: string) => void {
  return vi.fn();
}

function makeDeps(overrides?: Partial<FrameworkPluginDeps>): FrameworkPluginDeps {
  return {
    detectPackageManager: vi.fn().mockReturnValue({
      id: 'pnpm',
      label: 'pnpm',
      installCmd: 'pnpm add -D',
    }),
    installPackage: vi.fn().mockResolvedValue({ status: 'installed' }),
    patchViteConfig: vi.fn().mockResolvedValue({ status: 'patched', configFile: '/app/vite.config.ts' }),
    showSnippetFallback: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('installFrameworkPlugin', () => {
  describe('react-vite happy path', () => {
    it('calls install + patch and returns patched status without showing a snippet', async () => {
      // Arrange
      const deps = makeDeps();
      const onOutput = makeOnOutput();

      // Act
      const result = await installFrameworkPlugin('/app', 'react-vite', '/workspace', onOutput, deps);

      // Assert
      expect(result.status).toBe('patched');
      expect(result.framework).toBe('react-vite');
      expect(result.appPath).toBe('/app');
      expect(deps.installPackage).toHaveBeenCalledOnce();
      expect(deps.patchViteConfig).toHaveBeenCalledOnce();
      expect(deps.showSnippetFallback).not.toHaveBeenCalled();
    });
  });

  describe('vue-vite happy path', () => {
    it('installs @pinflow/vue and patches with vue-vite framework', async () => {
      // Arrange
      const deps = makeDeps();
      const onOutput = makeOnOutput();

      // Act
      const result = await installFrameworkPlugin('/app', 'vue-vite', '/workspace', onOutput, deps);

      // Assert
      expect(result.status).toBe('patched');
      expect(result.framework).toBe('vue-vite');
      expect(deps.installPackage).toHaveBeenCalledWith(
        '/app',
        '@pinflow/vue',
        expect.objectContaining({ id: 'pnpm' }),
        onOutput,
      );
      expect(deps.patchViteConfig).toHaveBeenCalledWith('/app', 'vue-vite');
    });
  });

  describe('install fails', () => {
    it('returns install-failed immediately without calling patch', async () => {
      // Arrange
      const deps = makeDeps({
        installPackage: vi.fn().mockResolvedValue({ status: 'failed', stderr: 'Exit code 127' }),
      });
      const onOutput = makeOnOutput();

      // Act
      const result = await installFrameworkPlugin('/app', 'react-vite', '/workspace', onOutput, deps);

      // Assert
      expect(result.status).toBe('install-failed');
      expect(result.detail).toBe('Exit code 127');
      expect(deps.patchViteConfig).not.toHaveBeenCalled();
      expect(deps.showSnippetFallback).not.toHaveBeenCalled();
    });
  });

  describe('vite pattern-miss', () => {
    it('shows snippet fallback and returns snippet-only with detail pattern-miss', async () => {
      // Arrange
      const deps = makeDeps({
        patchViteConfig: vi.fn().mockResolvedValue({ status: 'pattern-miss' }),
      });
      const onOutput = makeOnOutput();

      // Act
      const result = await installFrameworkPlugin('/app', 'react-vite', '/workspace', onOutput, deps);

      // Assert
      expect(result.status).toBe('snippet-only');
      expect(result.detail).toBe('pattern-miss');
      expect(deps.showSnippetFallback).toHaveBeenCalledOnce();
      expect(deps.showSnippetFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          appPath: '/app',
          framework: 'react-vite',
          snippet: expect.any(String),
        }),
      );
    });
  });

  describe('next framework', () => {
    it('installs @pinflow/next, does not call patch, shows snippet, returns snippet-only', async () => {
      // Arrange
      const deps = makeDeps();
      const onOutput = makeOnOutput();

      // Act
      const result = await installFrameworkPlugin('/app', 'next', '/workspace', onOutput, deps);

      // Assert
      expect(result.status).toBe('snippet-only');
      expect(result.framework).toBe('next');
      expect(deps.installPackage).toHaveBeenCalledWith(
        '/app',
        '@pinflow/next',
        expect.any(Object),
        onOutput,
      );
      expect(deps.patchViteConfig).not.toHaveBeenCalled();
      expect(deps.showSnippetFallback).toHaveBeenCalledOnce();
    });
  });

  describe('react-webpack framework', () => {
    it('installs @pinflow/react, does not call patch, shows snippet, returns snippet-only', async () => {
      // Arrange
      const deps = makeDeps();
      const onOutput = makeOnOutput();

      // Act
      const result = await installFrameworkPlugin('/app', 'react-webpack', '/workspace', onOutput, deps);

      // Assert
      expect(result.status).toBe('snippet-only');
      expect(result.framework).toBe('react-webpack');
      expect(deps.installPackage).toHaveBeenCalledWith(
        '/app',
        '@pinflow/react',
        expect.any(Object),
        onOutput,
      );
      expect(deps.patchViteConfig).not.toHaveBeenCalled();
      expect(deps.showSnippetFallback).toHaveBeenCalledOnce();
    });
  });
});
