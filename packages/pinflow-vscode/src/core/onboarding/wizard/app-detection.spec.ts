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

  it('omits the root from results when it has workspaces and no frontend framework', () => {
    // Arrange — eventbear-web style: root is a monorepo wrapper without FE deps
    const rootPkg = JSON.stringify({
      workspaces: ['apps/*'],
      devDependencies: { typescript: '^5.0.0' },
    });
    const apiPkg = JSON.stringify({ dependencies: { fastify: '^4.0.0' } });
    const webPkg = JSON.stringify({ devDependencies: { vite: '^5.0.0' } });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => {
        if (p === '/repo/package.json') return rootPkg;
        if (p === '/repo/apps/api/package.json') return apiPkg;
        if (p === '/repo/apps/web/package.json') return webPkg;
        return undefined;
      }),
      readdir: vi.fn((p: string) => {
        if (p === '/repo') return ['apps'];
        if (p === '/repo/apps') return ['api', 'web'];
        return [];
      }),
    });

    // Act
    const result = detectApps('/repo', deps);

    // Assert — only the workspace apps, not the wrapper root
    expect(result.map((r) => r.path)).toEqual(['/repo/apps/api', '/repo/apps/web']);
  });

  it('keeps the root in results when it has workspaces AND its own frontend framework', () => {
    // Arrange — root is both a monorepo and a frontend app
    const rootPkg = JSON.stringify({
      workspaces: ['packages/*'],
      devDependencies: { vite: '^5.0.0' },
    });
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

  it('supports the legacy yarn-classic workspaces.packages shape', () => {
    // Arrange
    const rootPkg = JSON.stringify({
      workspaces: { packages: ['apps/*'] },
      devDependencies: { typescript: '^5.0.0' },
    });
    const webPkg = JSON.stringify({ devDependencies: { vite: '^5.0.0' } });
    const deps = makeDeps({
      readFile: vi.fn((p: string) => {
        if (p === '/repo/package.json') return rootPkg;
        if (p === '/repo/apps/web/package.json') return webPkg;
        return undefined;
      }),
      readdir: vi.fn((p: string) => {
        if (p === '/repo') return ['apps'];
        if (p === '/repo/apps') return ['web'];
        return [];
      }),
    });

    // Act
    const result = detectApps('/repo', deps);

    // Assert
    expect(result.map((r) => r.path)).toEqual(['/repo/apps/web']);
  });
});
