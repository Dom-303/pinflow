import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { startStandardWorkflow, type TerminalFactory } from './commands.js';

async function createTempWorkspace() {
  return mkdtemp(path.join(tmpdir(), 'pinflow-vscode-commands-'));
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

describe('startStandardWorkflow', () => {
  it('starts pinflow dev and pinflow follow in visible terminals', () => {
    const calls: Array<{ terminal: string; text?: string; shown?: true }> = [];
    const createTerminal: TerminalFactory = (name, cwd) => ({
      sendText(text) {
        calls.push({ terminal: `${name}:${cwd}`, text });
      },
      show() {
        calls.push({ terminal: `${name}:${cwd}`, shown: true });
      },
    });

    startStandardWorkflow('/repo', createTerminal);

    expect(calls).toEqual([
      { terminal: 'PinFlow Dev:/repo', text: 'pinflow dev' },
      { terminal: 'PinFlow Dev:/repo', shown: true },
      { terminal: 'PinFlow Follow:/repo', text: 'pinflow follow' },
      { terminal: 'PinFlow Follow:/repo', shown: true },
    ]);
  });

  it('starts the source CLI inside the PinFlow monorepo', async () => {
    const workspaceRoot = await createTempWorkspace();
    const calls: Array<{ terminal: string; text?: string; shown?: true }> = [];
    const createTerminal: TerminalFactory = (name, cwd) => ({
      sendText(text) {
        calls.push({ terminal: `${name}:${cwd}`, text });
      },
      show() {
        calls.push({ terminal: `${name}:${cwd}`, shown: true });
      },
    });

    try {
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

      const appRoot = path.join(
        workspaceRoot,
        'packages',
        'pinflow-test-fixtures',
        'fixtures',
        'vite',
        'v5',
        'react-18-ts',
      );

      startStandardWorkflow(workspaceRoot, createTerminal, appRoot);

      expect(calls).toEqual([
        {
          terminal: `PinFlow Dev:${workspaceRoot}`,
          text: 'corepack pnpm exec tsx packages/pinflow-relay/src/cli/bin/main.ts dev --app-root packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts',
        },
        { terminal: `PinFlow Dev:${workspaceRoot}`, shown: true },
        {
          terminal: `PinFlow Follow:${workspaceRoot}`,
          text: 'corepack pnpm exec tsx packages/pinflow-relay/src/cli/bin/main.ts follow packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts',
        },
        { terminal: `PinFlow Follow:${workspaceRoot}`, shown: true },
      ]);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
