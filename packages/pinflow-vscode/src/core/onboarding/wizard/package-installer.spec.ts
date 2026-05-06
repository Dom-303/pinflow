import { describe, it, expect, vi } from 'vitest';

import { installPackage } from './package-installer.js';
import type { PackageInstallerDeps } from './package-installer.js';
import type { PackageManagerConfig } from './package-manager.js';

const pnpm: PackageManagerConfig = {
  id: 'pnpm',
  label: 'pnpm',
  installCmd: 'pnpm add -D',
};

function makeDeps(overrides?: Partial<PackageInstallerDeps>): PackageInstallerDeps {
  return {
    runCommand: vi.fn().mockResolvedValue({ exitCode: 0 }),
    readJson: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('installPackage', () => {
  it('returns already-present when packageName is in dependencies', async () => {
    // Arrange
    const deps = makeDeps({
      readJson: vi.fn().mockResolvedValue({
        dependencies: { '@pinflow/react': '^1.0.0' },
      }),
    });

    // Act
    const result = await installPackage('/app', '@pinflow/react', pnpm, vi.fn(), deps);

    // Assert
    expect(result.status).toBe('already-present');
    expect(deps.runCommand).not.toHaveBeenCalled();
  });

  it('returns already-present when packageName is in devDependencies', async () => {
    // Arrange
    const deps = makeDeps({
      readJson: vi.fn().mockResolvedValue({
        devDependencies: { '@pinflow/react': '^1.0.0' },
      }),
    });

    // Act
    const result = await installPackage('/app', '@pinflow/react', pnpm, vi.fn(), deps);

    // Assert
    expect(result.status).toBe('already-present');
    expect(deps.runCommand).not.toHaveBeenCalled();
  });

  it('runs pnpm with split argv and correct cwd when package is not installed', async () => {
    // Arrange
    const deps = makeDeps({
      readJson: vi.fn().mockResolvedValue({ dependencies: {} }),
    });

    // Act
    const result = await installPackage('/app', '@pinflow/react', pnpm, vi.fn(), deps);

    // Assert
    expect(result.status).toBe('installed');
    expect(deps.runCommand).toHaveBeenCalledWith(
      'pnpm',
      ['add', '-D', '@pinflow/react'],
      expect.objectContaining({ cwd: '/app' }),
    );
  });

  it('streams output lines from runCommand to the caller', async () => {
    // Arrange
    const onOutput = vi.fn();
    const deps = makeDeps({
      readJson: vi.fn().mockResolvedValue(undefined),
      runCommand: vi.fn(async (_bin, _args, opts) => {
        opts.onOutput('added 1 package in 3s');
        return { exitCode: 0 };
      }),
    });

    // Act
    await installPackage('/app', '@pinflow/react', pnpm, onOutput, deps);

    // Assert
    expect(onOutput).toHaveBeenCalledWith(expect.stringContaining('added 1 package in 3s'));
  });

  it('returns failed with stderr when runCommand exits non-zero', async () => {
    // Arrange
    const deps = makeDeps({
      readJson: vi.fn().mockResolvedValue(undefined),
      runCommand: vi.fn().mockResolvedValue({ exitCode: 127 }),
    });

    // Act
    const result = await installPackage('/app', '@pinflow/react', pnpm, vi.fn(), deps);

    // Assert
    expect(result.status).toBe('failed');
    expect(result.stderr).toContain('Exit code 127');
  });

  it('proceeds with install when package.json is missing (readJson returns undefined)', async () => {
    // Arrange
    const deps = makeDeps({
      readJson: vi.fn().mockResolvedValue(undefined),
    });

    // Act
    const result = await installPackage('/app', '@pinflow/react', pnpm, vi.fn(), deps);

    // Assert
    expect(result.status).toBe('installed');
    expect(deps.runCommand).toHaveBeenCalled();
  });
});
