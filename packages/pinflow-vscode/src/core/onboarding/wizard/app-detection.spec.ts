import { describe, it, expect, vi } from 'vitest';

import { detectApps, type AppDetectionDeps } from './app-detection.js';

function makeDeps(overrides?: Partial<AppDetectionDeps>): AppDetectionDeps {
  return {
    readFile: vi.fn().mockReturnValue(undefined),
    readdir: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

describe('detectApps', () => {
  it('returns single entry when cwd has package.json with vite dep', () => {
    // Arrange
    const pkgJson = JSON.stringify({ devDependencies: { vite: '^5.0.0' } });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => (p.endsWith('package.json') ? pkgJson : undefined)),
      readdir: vi.fn().mockReturnValue([]),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ path: '/project', framework: 'vite' });
  });

  it('returns two entries for monorepo with packages/a and packages/b', () => {
    // Arrange
    const vitePkg = JSON.stringify({ devDependencies: { vite: '^5.0.0' } });
    const webpackPkg = JSON.stringify({ devDependencies: { webpack: '^5.0.0' } });

    const deps = makeDeps({
      readFile: vi.fn((p: string) => {
        if (p === '/project/packages/a/package.json') return vitePkg;
        if (p === '/project/packages/b/package.json') return webpackPkg;
        return undefined;
      }),
      readdir: vi.fn((p: string) => {
        if (p === '/project') return ['packages'];
        if (p === '/project/packages') return ['a', 'b'];
        return [];
      }),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toHaveLength(2);
    const paths = result.map((r) => r.path);
    expect(paths).toContain('/project/packages/a');
    expect(paths).toContain('/project/packages/b');
  });

  it('returns empty array when no package.json found anywhere', () => {
    // Arrange
    const deps = makeDeps({
      readFile: vi.fn().mockReturnValue(undefined),
      readdir: vi.fn().mockReturnValue([]),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toEqual([]);
  });

  it('detects next framework from package.json dependencies', () => {
    // Arrange
    const pkgJson = JSON.stringify({ dependencies: { next: '^14.0.0' } });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => (p.endsWith('package.json') ? pkgJson : undefined)),
      readdir: vi.fn().mockReturnValue([]),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ framework: 'next' });
  });
});
