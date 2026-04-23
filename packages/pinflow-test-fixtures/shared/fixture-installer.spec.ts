import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: execSyncMock,
  execFileSync: vi.fn((command: string, args: string[]) => {
    if (
      command === 'git' &&
      Array.isArray(args) &&
      args[0] === 'rev-parse' &&
      args[1] === 'HEAD'
    ) {
      return 'abc123\n';
    }

    if (
      command === 'git' &&
      Array.isArray(args) &&
      args[0] === 'status' &&
      args[1] === '--porcelain' &&
      args[2] === '--untracked-files=all'
    ) {
      return '';
    }

    throw new Error(`Unexpected execFileSync: ${command} ${args.join(' ')}`);
  }),
}));

import { installFixture } from './fixture-installer.js';

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

describe('installFixture', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    execSyncMock.mockReset();
    while (tempDirs.length) {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it('purges the fixture Vite cache before reinstalling PinFlow packages', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'pinflow-workspace-'));
    const fixtureDir = mkdtempSync(join(tmpdir(), 'pinflow-fixture-'));

    tempDirs.push(workspaceRoot, fixtureDir);

    writeJson(join(workspaceRoot, 'package.json'), {
      name: 'pinflow',
      version: '0.6.0-pinflow.0',
    });
    writeFileSync(join(workspaceRoot, 'pnpm-lock.yaml'), 'lockfile');
    writeFileSync(
      join(workspaceRoot, '.npmrc'),
      '//localhost:4874/:_authToken="pinflow-preview"\n',
    );

    const overlayScopeDir = join(fixtureDir, 'node_modules', '@pinflow', 'overlay');
    mkdirSync(overlayScopeDir, { recursive: true });
    writeFileSync(join(overlayScopeDir, 'package.json'), '{"name":"@pinflow/overlay"}');

    const viteDepsDir = join(fixtureDir, 'node_modules', '.vite', 'deps');
    mkdirSync(viteDepsDir, { recursive: true });
    const staleOverlayBundle = join(viteDepsDir, '@pinflow_overlay.js');
    writeFileSync(staleOverlayBundle, 'stale overlay bundle');

    const result = installFixture(fixtureDir, {
      workspaceRoot,
      registryUrl: 'http://127.0.0.1:4874',
      registryPort: 4874,
      log: () => {},
      force: true,
    });

    expect(result.action).toBe('installed');
    expect(execSyncMock).toHaveBeenCalledWith(
      'npm install --no-package-lock --no-audit --no-fund',
      expect.objectContaining({ cwd: fixtureDir }),
    );
    expect(existsSync(staleOverlayBundle)).toBe(false);
  });
});
