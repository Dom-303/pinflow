import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import {
  runInitInAuto,
  __test_resetPendingInits,
  type RunInitInAutoDeps,
  type AutoInitInternalDeps,
} from './auto-init.js';
import type { CliCheckResult } from './cli-detection.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake ChildProcess-like emitter. Call `_flush()` to trigger events. */
function makeChildProcess(exitCode: number, stdoutLines: string[] = [], stderrLines: string[] = []) {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  return {
    stdout: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        const key = `stdout:${event}`;
        listeners[key] ??= [];
        (listeners[key] as Array<(...args: unknown[]) => void>).push(handler);
      }),
    },
    stderr: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        const key = `stderr:${event}`;
        listeners[key] ??= [];
        (listeners[key] as Array<(...args: unknown[]) => void>).push(handler);
      }),
    },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners[event] ??= [];
      (listeners[event] as Array<(...args: unknown[]) => void>).push(handler);
    }),
    kill: vi.fn(),
    /** Emit all queued stdout/stderr, then close. */
    _flush() {
      for (const line of stdoutLines) {
        for (const h of listeners['stdout:data'] ?? []) h(Buffer.from(line + '\n'));
      }
      for (const line of stderrLines) {
        for (const h of listeners['stderr:data'] ?? []) h(Buffer.from(line + '\n'));
      }
      for (const h of listeners['close'] ?? []) h(exitCode);
    },
  };
}

type ChildProcess = ReturnType<typeof makeChildProcess>;

/** Build a withProgress mock that flushes the child after listeners are registered. */
function makeWithProgress(child: ChildProcess) {
  return vi.fn(
    async (
      _opts: unknown,
      task: (p: { report: ReturnType<typeof vi.fn> }) => Promise<void>,
    ) => {
      const progress = { report: vi.fn() };
      // Start the task — inside task, runSpawn is called synchronously,
      // registering all .on() listeners before it yields.
      const taskPromise = task(progress);
      // Flush the child now that listeners are attached.
      child._flush();
      await taskPromise;
    },
  );
}

/** Build the AutoInitInternalDeps with sensible defaults. */
function makeInternalDeps(
  child: ChildProcess,
  overrides?: Partial<AutoInitInternalDeps>,
): AutoInitInternalDeps {
  return {
    detectCli: vi.fn<[], Promise<CliCheckResult>>().mockResolvedValue({ available: true }),
    spawnChild: vi.fn().mockReturnValue(child),
    vscodeWindow: {
      withProgress: makeWithProgress(child),
      showInformationMessage: vi.fn().mockResolvedValue(undefined),
      showErrorMessage: vi.fn().mockResolvedValue(undefined),
    },
    vscodeEnv: {
      openExternal: vi.fn().mockResolvedValue(true),
    },
    vscodeUri: {
      parse: vi.fn((url: string) => ({ toString: () => url })),
    },
    vscodeCommands: {
      executeCommand: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

/** Build the public RunInitInAutoDeps. */
function makeDeps(overrides?: Partial<RunInitInAutoDeps>): RunInitInAutoDeps {
  return {
    defaultProvider: 'codex',
    onSuccess: vi.fn().mockResolvedValue(undefined),
    runInitInTerminal: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runInitInAuto', () => {
  beforeEach(() => {
    __test_resetPendingInits();
    vi.clearAllMocks();
  });

  it('skips spawn when pendingInits already contains cwd', async () => {
    // Arrange
    const cwd = '/workspace/foo';
    const child = makeChildProcess(0);

    let firstResolve!: () => void;
    const barrier = new Promise<void>((r) => { firstResolve = r; });

    // The first call parks on the barrier before the child flushes.
    const internal = makeInternalDeps(child, {
      vscodeWindow: {
        withProgress: vi.fn(
          async (
            _opts: unknown,
            task: (p: { report: ReturnType<typeof vi.fn> }) => Promise<void>,
          ) => {
            await barrier; // park here
            const progress = { report: vi.fn() };
            const p = task(progress);
            child._flush();
            await p;
          },
        ) as Mock,
        showInformationMessage: vi.fn().mockResolvedValue(undefined),
        showErrorMessage: vi.fn().mockResolvedValue(undefined),
      },
    });
    const deps = makeDeps();

    // Start first call (will park at barrier).
    const first = runInitInAuto(cwd, deps, internal);

    // Act — second call while first holds the cwd in pendingInits.
    await runInitInAuto(cwd, deps, internal);

    // Unblock first call.
    firstResolve();
    await first;

    // Assert — spawn called only once (second call was no-op).
    expect(internal.spawnChild).toHaveBeenCalledTimes(1);
  });

  it('invokes onSuccess callback when subprocess exits 0', async () => {
    // Arrange
    const cwd = '/workspace/my-app';
    const child = makeChildProcess(0);
    const internal = makeInternalDeps(child);
    const deps = makeDeps();

    // Act
    await runInitInAuto(cwd, deps, internal);

    // Assert
    expect(deps.onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onSuccess on non-zero exit', async () => {
    // Arrange
    const cwd = '/workspace/my-app';
    const child = makeChildProcess(1, [], ['Error: something went wrong']);
    const internal = makeInternalDeps(child);
    const deps = makeDeps();

    // Act
    await runInitInAuto(cwd, deps, internal);

    // Assert
    expect(deps.onSuccess).not.toHaveBeenCalled();
  });

  it('shows error toast with stderr tail on failure', async () => {
    // Arrange
    const cwd = '/workspace/my-app';
    const stderrLines = ['line1', 'line2', 'Error: critical failure'];
    const child = makeChildProcess(1, [], stderrLines);
    const internal = makeInternalDeps(child);
    const deps = makeDeps();

    // Act
    await runInitInAuto(cwd, deps, internal);

    // Assert
    expect(internal.vscodeWindow.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Error: critical failure'),
      'Open Terminal',
    );
  });

  it('releases the concurrency lock in both success and failure', async () => {
    // Arrange
    const cwd = '/workspace/lock-test';

    // First call: success
    const childSuccess = makeChildProcess(0);
    const internalSuccess = makeInternalDeps(childSuccess);
    const depsSuccess = makeDeps();

    await runInitInAuto(cwd, depsSuccess, internalSuccess);

    // Act — second call (lock must have been released after success)
    const childFailure = makeChildProcess(1, [], ['err']);
    const internalFailure = makeInternalDeps(childFailure);
    const depsFailure = makeDeps();

    await runInitInAuto(cwd, depsFailure, internalFailure);

    // Assert — both calls actually spawned (lock was released each time)
    expect(internalSuccess.spawnChild).toHaveBeenCalledTimes(1);
    expect(internalFailure.spawnChild).toHaveBeenCalledTimes(1);
  });

  it('shows CLI-not-found toast and offers Open Terminal Anyway', async () => {
    // Arrange
    const cwd = '/workspace/no-cli';
    const child = makeChildProcess(0); // not used
    const internal = makeInternalDeps(child, {
      detectCli: vi.fn<[], Promise<CliCheckResult>>().mockResolvedValue({
        available: false,
        reason: 'not-on-path',
      }),
    });
    const deps = makeDeps();

    // Act
    await runInitInAuto(cwd, deps, internal);

    // Assert
    expect(internal.vscodeWindow.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('not-on-path'),
      'Open Terminal Anyway',
      'Open Docs',
    );
  });

  it('invokes spawn with correct args including --yes --agent and --app-root', async () => {
    // Arrange
    const cwd = '/workspace/correct-args';
    const child = makeChildProcess(0);
    const internal = makeInternalDeps(child);
    const deps = makeDeps({ defaultProvider: 'codex' });

    // Act
    await runInitInAuto(cwd, deps, internal);

    // Assert
    expect(internal.spawnChild).toHaveBeenCalledWith(
      'pinflow',
      ['init', '--yes', '--agent', 'codex', '--app-root', cwd],
      expect.objectContaining({ cwd }),
    );
  });

  it('maps provider "claude" to wizard agent id "claude-code"', async () => {
    // Arrange — the extension's externalHandoff.defaultProvider setting
    // accepts 'claude' but the wizard's --agent flag expects 'claude-code'.
    const cwd = '/workspace/claude-mapping';
    const child = makeChildProcess(0);
    const internal = makeInternalDeps(child);
    const deps = makeDeps({ defaultProvider: 'claude' });

    // Act
    await runInitInAuto(cwd, deps, internal);

    // Assert
    expect(internal.spawnChild).toHaveBeenCalledWith(
      'pinflow',
      ['init', '--yes', '--agent', 'claude-code', '--app-root', cwd],
      expect.objectContaining({ cwd }),
    );
  });
});
