import { spawn } from 'node:child_process';
import path from 'node:path';

import * as vscode from 'vscode';

import { detectPinFlowCli, type CliCheckResult } from './cli-detection.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RunInitInAutoDeps {
  /** Agent provider passed to `--agent` (e.g. 'codex', 'claude'). */
  readonly defaultProvider: string;
  /** Called immediately after a successful exit-0 spawn, before success toast. */
  readonly onSuccess: () => Promise<void> | void;
  /** Opens a terminal for manual `pinflow init`; used as error-recovery action. */
  readonly runInitInTerminal: (cwd: string) => void;
}

// ---------------------------------------------------------------------------
// Internal DI (test-overridable vscode + child_process surface)
// ---------------------------------------------------------------------------

/** Minimal VS Code window API surface used by this module. */
interface VscodeWindowDeps {
  readonly withProgress: (
    options: { location: unknown; title: string; cancellable: boolean },
    task: (progress: { report: (value: { message?: string }) => void }) => Promise<void>,
  ) => Promise<void>;
  readonly showInformationMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
  readonly showErrorMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
}

interface VscodeEnvDeps {
  readonly openExternal: (uri: unknown) => Promise<boolean>;
}

interface VscodeUriDeps {
  readonly parse: (url: string) => unknown;
}

interface VscodeCommandsDeps {
  readonly executeCommand: (command: string, ...args: unknown[]) => Promise<unknown>;
}

type SpawnFn = typeof spawn;

export interface AutoInitInternalDeps {
  readonly detectCli: () => Promise<CliCheckResult>;
  readonly spawnChild: SpawnFn;
  readonly vscodeWindow: VscodeWindowDeps;
  readonly vscodeEnv: VscodeEnvDeps;
  readonly vscodeUri: VscodeUriDeps;
  readonly vscodeCommands: VscodeCommandsDeps;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPAWN_TIMEOUT_MS = 180_000; // 3 min

// ---------------------------------------------------------------------------
// Module-level concurrency lock (per-folder)
// ---------------------------------------------------------------------------

const pendingInits = new Set<string>();

/** Test-only helper — clears the pending-inits lock between tests. */
export const __test_resetPendingInits = (): void => {
  pendingInits.clear();
};

// ---------------------------------------------------------------------------
// Default (real) implementations
// ---------------------------------------------------------------------------

const DEFAULT_INTERNAL_DEPS: AutoInitInternalDeps = {
  detectCli: detectPinFlowCli,
  spawnChild: spawn,
  vscodeWindow: {
    withProgress: (options, task) =>
      vscode.window.withProgress(
        { ...options, location: vscode.ProgressLocation.Notification },
        task,
      ),
    showInformationMessage: (message, ...actions) =>
      vscode.window.showInformationMessage(message, ...actions),
    showErrorMessage: (message, ...actions) =>
      vscode.window.showErrorMessage(message, ...actions),
  },
  vscodeEnv: {
    openExternal: (uri) =>
      vscode.env.openExternal(uri as Parameters<typeof vscode.env.openExternal>[0]),
  },
  vscodeUri: { parse: (url) => vscode.Uri.parse(url) },
  vscodeCommands: {
    executeCommand: (cmd, ...args) => vscode.commands.executeCommand(cmd, ...args),
  },
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function runInitInAuto(
  cwd: string,
  deps: RunInitInAutoDeps,
  internalDeps: AutoInitInternalDeps = DEFAULT_INTERNAL_DEPS,
): Promise<void> {
  if (pendingInits.has(cwd)) return;
  pendingInits.add(cwd);

  try {
    const cliCheck = await internalDeps.detectCli();
    if (!cliCheck.available) {
      await showCliNotFoundToast(cwd, cliCheck.reason, deps.runInitInTerminal, internalDeps);
      return;
    }
    await spawnInit(cwd, deps, internalDeps);
  } finally {
    pendingInits.delete(cwd);
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function spawnInit(
  cwd: string,
  deps: RunInitInAutoDeps,
  internal: AutoInitInternalDeps,
): Promise<void> {
  const folderName = path.basename(cwd);

  await internal.vscodeWindow.withProgress(
    {
      location: 'Notification',
      title: `PinFlow setup for ${folderName}`,
      cancellable: false,
    },
    async (progress) => {
      const result = await runSpawn(cwd, deps.defaultProvider, internal.spawnChild, (line) =>
        updateProgressFromLine(progress, line),
      );

      if (result.code === 0) {
        await deps.onSuccess();
        showSuccessToast(folderName, internal);
      } else {
        showFailureToast(folderName, cwd, result.stderr, deps.runInitInTerminal, internal);
      }
    },
  );
}

interface SpawnResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function runSpawn(
  cwd: string,
  defaultProvider: string,
  spawnFn: SpawnFn,
  onStdoutLine: (line: string) => void,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawnFn(
      'pinflow',
      ['init', '--yes', '--agent', defaultProvider, '--app-root', cwd],
      { cwd },
    );

    let stdout = '';
    let stderr = '';
    let lineBuffer = '';

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, SPAWN_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      stdout += text;
      lineBuffer += text;

      let nlIdx: number;
      while ((nlIdx = lineBuffer.indexOf('\n')) !== -1) {
        const line = lineBuffer.slice(0, nlIdx);
        lineBuffer = lineBuffer.slice(nlIdx + 1);
        if (line.trim()) onStdoutLine(line);
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr || String(err) });
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function updateProgressFromLine(
  progress: { report: (value: { message?: string }) => void },
  line: string,
): void {
  const lower = line.toLowerCase();
  if (lower.includes('agent')) {
    progress.report({ message: 'Configuring agent…' });
  } else if (lower.includes('framework')) {
    progress.report({ message: 'Detecting framework…' });
  } else if (lower.includes('monorepo') || lower.includes('app root')) {
    progress.report({ message: 'Resolving app root…' });
  } else if (lower.includes('gitignore')) {
    progress.report({ message: 'Updating .gitignore…' });
  }
}

async function showCliNotFoundToast(
  cwd: string,
  reason: string | undefined,
  runInitInTerminal: (cwd: string) => void,
  internal: AutoInitInternalDeps,
): Promise<void> {
  const detail = reason ? ` (${reason})` : '';
  const action = await internal.vscodeWindow.showErrorMessage(
    `PinFlow CLI not found${detail}. Install it or use Terminal mode.`,
    'Open Terminal Anyway',
    'Open Docs',
  );
  if (action === 'Open Terminal Anyway') runInitInTerminal(cwd);
  if (action === 'Open Docs') {
    void internal.vscodeEnv.openExternal(
      internal.vscodeUri.parse('https://github.com/Dom-303/pinflow#installation'),
    );
  }
}

function showSuccessToast(folderName: string, internal: AutoInitInternalDeps): void {
  void internal.vscodeWindow
    .showInformationMessage(`PinFlow ready in ${folderName}.`, 'Open Folder Status')
    .then((action) => {
      if (action === 'Open Folder Status') {
        void internal.vscodeCommands.executeCommand('pinflow.status.focus');
      }
    });
}

function showFailureToast(
  folderName: string,
  cwd: string,
  stderr: string,
  runInitInTerminal: (cwd: string) => void,
  internal: AutoInitInternalDeps,
): void {
  const tail = stderr
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-3)
    .join('\n');

  const message = tail
    ? `PinFlow init failed for ${folderName}: ${tail}`
    : `PinFlow init failed for ${folderName}.`;

  void internal.vscodeWindow.showErrorMessage(message, 'Open Terminal').then((action) => {
    if (action === 'Open Terminal') runInitInTerminal(cwd);
  });
}
