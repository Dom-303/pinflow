import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  formatPinFlowCliCommand,
  getPinFlowCliInvocation,
} from './cli-command.js';

async function createTempWorkspace() {
  return mkdtemp(path.join(tmpdir(), 'pinflow-vscode-cli-'));
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

describe('PinFlow CLI invocation', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('uses the installed pinflow command for regular workspaces', () => {
    expect(getPinFlowCliInvocation(workspaceRoot, ['follow'])).toEqual({
      command: 'pinflow',
      args: ['follow'],
    });
    expect(formatPinFlowCliCommand(workspaceRoot, ['follow'])).toBe(
      'pinflow follow',
    );
  });

  it('uses the source CLI entrypoint inside the PinFlow monorepo', async () => {
    await writeJson(path.join(workspaceRoot, 'package.json'), {
      name: 'pinflow',
      private: true,
    });
    const cliEntryPath = path.join(
      workspaceRoot,
      'packages',
      'pinflow-relay',
      'src',
      'cli',
      'bin',
      'main.ts',
    );
    await mkdir(path.dirname(cliEntryPath), { recursive: true });
    await writeFile(cliEntryPath, '', 'utf8');

    expect(getPinFlowCliInvocation(workspaceRoot, ['follow'])).toEqual({
      command: 'corepack',
      args: [
        'pnpm',
        'exec',
        'tsx',
        'packages/pinflow-relay/src/cli/bin/main.ts',
        'follow',
      ],
    });
    expect(formatPinFlowCliCommand(workspaceRoot, ['follow'])).toBe(
      'corepack pnpm exec tsx packages/pinflow-relay/src/cli/bin/main.ts follow',
    );
  });

  it('passes the demo app root to monorepo dev and follow commands', async () => {
    const appRoot = path.join(
      workspaceRoot,
      'packages',
      'pinflow-test-fixtures',
      'fixtures',
      'vite',
      'v5',
      'react-18-ts',
    );
    await writeJson(path.join(workspaceRoot, 'package.json'), {
      name: 'pinflow',
      private: true,
    });
    const cliEntryPath = path.join(
      workspaceRoot,
      'packages',
      'pinflow-relay',
      'src',
      'cli',
      'bin',
      'main.ts',
    );
    await mkdir(path.dirname(cliEntryPath), { recursive: true });
    await writeFile(cliEntryPath, '', 'utf8');

    expect(formatPinFlowCliCommand(workspaceRoot, ['follow'], appRoot)).toBe(
      'corepack pnpm exec tsx packages/pinflow-relay/src/cli/bin/main.ts follow packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts',
    );
    expect(formatPinFlowCliCommand(workspaceRoot, ['dev'], appRoot)).toBe(
      'corepack pnpm exec tsx packages/pinflow-relay/src/cli/bin/main.ts dev --app-root packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts',
    );
  });
});
