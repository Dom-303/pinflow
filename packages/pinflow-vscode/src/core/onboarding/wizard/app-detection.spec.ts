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
  it('classifies bare vite as other-vite', () => {
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
    expect(result[0]).toMatchObject({ path: '/project', framework: 'other-vite' });
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
    const a = result.find((r) => r.path === '/project/packages/a');
    const b = result.find((r) => r.path === '/project/packages/b');
    expect(a).toMatchObject({ framework: 'other-vite' });
    expect(b).toMatchObject({ framework: 'other-webpack' });
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

  it('skips node_modules entirely (no entries returned for it or its children)', () => {
    // Arrange
    const rootPkg = JSON.stringify({ devDependencies: { vite: '^5.0.0' } });
    const childPkg = JSON.stringify({ name: 'some-dep' });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => {
        if (p === '/project/package.json') return rootPkg;
        if (p === '/project/node_modules/foo/package.json') return childPkg;
        if (p === '/project/node_modules/bar/package.json') return childPkg;
        return undefined;
      }),
      readdir: vi.fn((p: string) => {
        if (p === '/project') return ['node_modules', 'apps'];
        if (p === '/project/node_modules') return ['foo', 'bar'];
        if (p === '/project/apps') return [];
        return [];
      }),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result.map((r) => r.path)).toEqual(['/project']);
  });

  it('skips dotfile-prefixed dirs like .git, .next, .turbo', () => {
    // Arrange
    const rootPkg = JSON.stringify({ devDependencies: { vite: '^5.0.0' } });
    const buriedPkg = JSON.stringify({ name: 'cached' });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => {
        if (p === '/project/package.json') return rootPkg;
        if (p === '/project/.next/cache/package.json') return buriedPkg;
        if (p === '/project/.turbo/package.json') return buriedPkg;
        return undefined;
      }),
      readdir: vi.fn((p: string) => {
        if (p === '/project') return ['.git', '.next', '.turbo'];
        if (p === '/project/.next') return ['cache'];
        return [];
      }),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result.map((r) => r.path)).toEqual(['/project']);
  });

  it('skips common build outputs (dist, build, out, coverage)', () => {
    // Arrange
    const rootPkg = JSON.stringify({ devDependencies: { vite: '^5.0.0' } });
    const buriedPkg = JSON.stringify({ name: 'build-artifact' });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => {
        if (p === '/project/package.json') return rootPkg;
        if (
          p === '/project/dist/package.json' ||
          p === '/project/build/package.json' ||
          p === '/project/out/package.json' ||
          p === '/project/coverage/package.json'
        ) {
          return buriedPkg;
        }
        return undefined;
      }),
      readdir: vi.fn((p: string) => {
        if (p === '/project') return ['dist', 'build', 'out', 'coverage'];
        return [];
      }),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result.map((r) => r.path)).toEqual(['/project']);
  });

  it('returns only frontend apps from a monorepo, dropping non-FE packages (eventbear-web case)', () => {
    // Arrange — root is a monorepo wrapper without FE deps; apps/api +
    // apps/pocketbase have no FE framework, only apps/web does.
    const rootPkg = JSON.stringify({
      workspaces: ['apps/*'],
      devDependencies: { typescript: '^5.0.0' },
    });
    const apiPkg = JSON.stringify({ dependencies: { fastify: '^4.0.0' } });
    const pocketbasePkg = JSON.stringify({ dependencies: { pocketbase: '^0.20.0' } });
    const webPkg = JSON.stringify({
      dependencies: { react: '^18.0.0' },
      devDependencies: { vite: '^5.0.0' },
    });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => {
        if (p === '/repo/package.json') return rootPkg;
        if (p === '/repo/apps/api/package.json') return apiPkg;
        if (p === '/repo/apps/pocketbase/package.json') return pocketbasePkg;
        if (p === '/repo/apps/web/package.json') return webPkg;
        return undefined;
      }),
      readdir: vi.fn((p: string) => {
        if (p === '/repo') return ['apps'];
        if (p === '/repo/apps') return ['api', 'pocketbase', 'web'];
        return [];
      }),
    });

    // Act
    const result = detectApps('/repo', deps);

    // Assert — only the FE app remains
    expect(result).toEqual([{ path: '/repo/apps/web', framework: 'react-vite' }]);
  });

  it('keeps the root when it has its own frontend framework', () => {
    // Arrange
    const rootPkg = JSON.stringify({ devDependencies: { vite: '^5.0.0' } });
    const subPkg = JSON.stringify({ devDependencies: { webpack: '^5.0.0' } });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => {
        if (p === '/repo/package.json') return rootPkg;
        if (p === '/repo/packages/x/package.json') return subPkg;
        return undefined;
      }),
      readdir: vi.fn((p: string) => {
        if (p === '/repo') return ['packages'];
        if (p === '/repo/packages') return ['x'];
        return [];
      }),
    });

    // Act
    const result = detectApps('/repo', deps);

    // Assert
    expect(result.map((r) => r.path)).toEqual(['/repo', '/repo/packages/x']);
  });

  it('returns empty when the only package.json present has no frontend framework (patternpilot case)', () => {
    // Arrange — Node CLI without FE framework
    const cliPkg = JSON.stringify({ dependencies: { commander: '^11.0.0' } });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => (p === '/repo/package.json' ? cliPkg : undefined)),
      readdir: vi.fn(() => []),
    });

    // Act
    const result = detectApps('/repo', deps);

    // Assert — falls through to manual-path branch in wizard
    expect(result).toEqual([]);
  });

  // --- New classification cases ---

  it('classifies vite + react as react-vite', () => {
    // Arrange
    const pkgJson = JSON.stringify({
      dependencies: { react: '^18.0.0' },
      devDependencies: { vite: '^5.0.0' },
    });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => (p.endsWith('package.json') ? pkgJson : undefined)),
      readdir: vi.fn().mockReturnValue([]),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ framework: 'react-vite' });
  });

  it('classifies vite + vue as vue-vite', () => {
    // Arrange
    const pkgJson = JSON.stringify({
      dependencies: { vue: '^3.0.0' },
      devDependencies: { vite: '^5.0.0' },
    });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => (p.endsWith('package.json') ? pkgJson : undefined)),
      readdir: vi.fn().mockReturnValue([]),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ framework: 'vue-vite' });
  });

  it('classifies vite only (no react/vue) as other-vite', () => {
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
    expect(result[0]).toMatchObject({ framework: 'other-vite' });
  });

  it('classifies webpack + react as react-webpack', () => {
    // Arrange
    const pkgJson = JSON.stringify({
      dependencies: { react: '^18.0.0' },
      devDependencies: { webpack: '^5.0.0' },
    });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => (p.endsWith('package.json') ? pkgJson : undefined)),
      readdir: vi.fn().mockReturnValue([]),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ framework: 'react-webpack' });
  });

  it('classifies webpack + vue as vue-webpack', () => {
    // Arrange
    const pkgJson = JSON.stringify({
      dependencies: { vue: '^3.0.0' },
      devDependencies: { webpack: '^5.0.0' },
    });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => (p.endsWith('package.json') ? pkgJson : undefined)),
      readdir: vi.fn().mockReturnValue([]),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ framework: 'vue-webpack' });
  });

  it('classifies webpack only as other-webpack', () => {
    // Arrange
    const pkgJson = JSON.stringify({ devDependencies: { webpack: '^5.0.0' } });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => (p.endsWith('package.json') ? pkgJson : undefined)),
      readdir: vi.fn().mockReturnValue([]),
    });

    // Act
    const result = detectApps('/project', deps);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ framework: 'other-webpack' });
  });

  it('classifies next + react as next (next dep alone forces next)', () => {
    // Arrange
    const pkgJson = JSON.stringify({
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
    });
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
