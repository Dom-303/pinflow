import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { PassThrough } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { runPinflowDev } from './dev-session.js';

function createChild(pid = 12345): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  child.pid = pid;
  child.kill = vi.fn().mockReturnValue(true);
  child.killed = false;
  return child;
}

function createChildWithOutput(pid = 12345): ChildProcess {
  const child = createChild(pid);
  Object.assign(child, {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  return child;
}

describe('runPinflowDev', () => {
  it('starts a relay, foreground runner, and app command, then stops owned relay', async () => {
    const runnerChild = createChild(111);
    const appChild = createChild(222);
    const relayControl = {
      validateAndClear: vi.fn().mockResolvedValue(undefined),
      ensureRunning: vi
        .fn()
        .mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const runnerControl = {
      spawn: vi.fn().mockReturnValue(runnerChild),
    };
    const spawnApp = vi.fn().mockImplementation(() => {
      queueMicrotask(() => appChild.emit('exit', 0, null));
      return appChild;
    });

    const exitCode = await runPinflowDev(
      {
        workspaceRoot: '/repo',
        appCommand: ['npm', 'run', 'dev'],
        runner: {
          provider: 'codex',
          model: 'gpt-5.5',
          intervalMs: 750,
        },
        relay: {
          host: '127.0.0.1',
          port: 4400,
          bodyLimit: 5_242_880,
        },
      },
      {
        relayControl,
        runnerControl,
        spawnApp,
        stderr: { write: vi.fn() },
      },
    );

    expect(exitCode).toBe(0);
    expect(relayControl.ensureRunning).toHaveBeenCalledWith({
      host: '127.0.0.1',
      port: 4400,
      bodyLimit: 5_242_880,
    });
    expect(runnerControl.spawn).toHaveBeenCalledWith({
      provider: 'codex',
      model: 'gpt-5.5',
      surface: 'terminal',
      command: undefined,
      args: undefined,
      intervalMs: 750,
      rawOutput: undefined,
      detached: false,
    });
    expect(spawnApp).toHaveBeenCalledWith(
      'npm',
      ['run', 'dev'],
      expect.objectContaining({
        cwd: '/repo',
        stdio: ['inherit', 'pipe', 'pipe'],
        env: expect.objectContaining({
          PINFLOW_RELAY_HOST: '127.0.0.1',
          PINFLOW_RELAY_PORT: '4400',
        }),
      }),
    );
    expect(runnerChild.kill).toHaveBeenCalledWith('SIGTERM');
    expect(relayControl.stop).toHaveBeenCalledTimes(1);
  });

  it('opens the first detected localhost app URL when requested', async () => {
    const runnerChild = createChild(111);
    const appChild = createChildWithOutput(222);
    const openUrl = vi.fn();
    const relayControl = {
      validateAndClear: vi.fn().mockResolvedValue(undefined),
      ensureRunning: vi
        .fn()
        .mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const runnerControl = {
      spawn: vi.fn().mockReturnValue(runnerChild),
    };
    const spawnApp = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        appChild.stdout?.emit(
          'data',
          Buffer.from('Local: http://localhost:5173/\n'),
        );
        appChild.emit('exit', 0, null);
      });
      return appChild;
    });

    await runPinflowDev(
      {
        workspaceRoot: '/repo',
        appCommand: ['npm', 'run', 'dev'],
        runner: {
          provider: 'codex',
        },
        relay: {},
        open: true,
      },
      {
        relayControl,
        runnerControl,
        spawnApp,
        openUrl,
        stderr: { write: vi.fn() },
      },
    );

    expect(openUrl).toHaveBeenCalledWith('http://localhost:5173/');
  });

  it('reuses an existing relay and leaves it running after the app exits', async () => {
    const runnerChild = createChild(111);
    const appChild = createChild(222);
    const relayControl = {
      validateAndClear: vi
        .fn()
        .mockResolvedValue({ host: '127.0.0.1', port: 4301 }),
      ensureRunning: vi.fn(),
      stop: vi.fn(),
    };
    const runnerControl = {
      spawn: vi.fn().mockReturnValue(runnerChild),
    };
    const spawnApp = vi.fn().mockImplementation(() => {
      queueMicrotask(() => appChild.emit('exit', 0, null));
      return appChild;
    });

    await runPinflowDev(
      {
        workspaceRoot: '/repo',
        appCommand: ['npm', 'run', 'dev'],
        runner: {
          provider: 'codex',
        },
        relay: {},
      },
      {
        relayControl,
        runnerControl,
        spawnApp,
        stderr: { write: vi.fn() },
      },
    );

    expect(relayControl.ensureRunning).not.toHaveBeenCalled();
    expect(relayControl.stop).not.toHaveBeenCalled();
  });

  it('stops the app and returns failure when the runner exits first', async () => {
    const runnerChild = createChild(111);
    const appChild = createChild(222);
    const relayControl = {
      validateAndClear: vi.fn().mockResolvedValue(undefined),
      ensureRunning: vi
        .fn()
        .mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const runnerControl = {
      spawn: vi.fn().mockImplementation(() => {
        queueMicrotask(() => runnerChild.emit('exit', 1, null));
        return runnerChild;
      }),
    };
    const spawnApp = vi.fn().mockReturnValue(appChild);

    const exitCode = await runPinflowDev(
      {
        workspaceRoot: '/repo',
        appCommand: ['npm', 'run', 'dev'],
        runner: {
          provider: 'codex',
        },
        relay: {},
      },
      {
        relayControl,
        runnerControl,
        spawnApp,
        stderr: { write: vi.fn() },
      },
    );

    expect(exitCode).toBe(1);
    expect(appChild.kill).toHaveBeenCalledWith('SIGTERM');
    expect(relayControl.stop).toHaveBeenCalledTimes(1);
  });
});
