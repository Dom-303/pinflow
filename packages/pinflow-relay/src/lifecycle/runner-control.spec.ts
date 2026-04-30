import { spawn } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RunnerControl } from './runner-control.js';
import { RelayHttpClient } from '../client/relay-http-client.js';

vi.mock('../client/relay-http-client.js', () => ({
  RelayHttpClient: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    pid: 12345,
    unref: vi.fn(),
  }),
}));

function mockStatus(sessions: Array<{ provider: string }>) {
  return {
    runner: {
      sessions,
    },
  };
}

describe('RunnerControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(spawn).mockReturnValue({
      pid: 12345,
      unref: vi.fn(),
    } as unknown as ReturnType<typeof spawn>);
  });

  it('should not spawn when a matching runner is already connected', async () => {
    vi.mocked(RelayHttpClient).mockImplementation(function () {
      return {
        getStatus: vi.fn().mockResolvedValue(mockStatus([{ provider: 'codex' }])),
      } as unknown as RelayHttpClient;
    } as unknown as typeof RelayHttpClient);

    const control = new RunnerControl('/test/workspace');

    const result = await control.ensureRunning({
      relayHost: '127.0.0.1',
      relayPort: 4400,
      provider: 'codex',
    });

    expect(result).toEqual({
      running: true,
      wasStarted: false,
      provider: 'codex',
    });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should spawn the local runner when no matching runner is connected', async () => {
    const getStatus = vi
      .fn()
      .mockResolvedValueOnce(mockStatus([]))
      .mockResolvedValueOnce(mockStatus([{ provider: 'codex' }]));
    vi.mocked(RelayHttpClient).mockImplementation(function () {
      return { getStatus } as unknown as RelayHttpClient;
    } as unknown as typeof RelayHttpClient);

    const control = new RunnerControl('/test/workspace', { debug: true });

    const result = await control.ensureRunning({
      relayHost: '127.0.0.1',
      relayPort: 4400,
      provider: 'codex',
      intervalMs: 750,
    });

    expect(result).toEqual({
      running: true,
      wasStarted: true,
      provider: 'codex',
    });
    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining('main.js'),
        'runner',
        '--provider',
        'codex',
        '--surface',
        'background',
        '--interval',
        '750',
        '--debug',
      ],
      expect.objectContaining({
        detached: true,
        stdio: 'ignore',
        cwd: '/test/workspace',
        env: expect.objectContaining({
          PINFLOW_RUNNER_AUTOSTART: '1',
        }),
      }),
    );
  });

  it('should pass custom runner command arguments to the spawned process', () => {
    const control = new RunnerControl('/test/workspace');

    control.spawn({
      provider: 'custom',
      command: 'my-agent',
      args: ['run', '--fast'],
      detached: false,
    });

    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining('main.js'),
        'runner',
        '--provider',
        'custom',
        '--command',
        'my-agent',
        '--surface',
        'terminal',
        '--arg',
        'run',
        '--arg',
        '--fast',
      ],
      expect.objectContaining({
        detached: false,
        stdio: 'inherit',
        cwd: '/test/workspace',
      }),
    );
  });

  it('should pass an explicit runner model to the spawned process', () => {
    const control = new RunnerControl('/test/workspace');

    control.spawn({
      provider: 'codex',
      model: 'gpt-5.5',
      detached: false,
    });

    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining('main.js'),
        'runner',
        '--provider',
        'codex',
        '--model',
        'gpt-5.5',
        '--surface',
        'terminal',
      ],
      expect.objectContaining({
        detached: false,
        stdio: 'inherit',
        cwd: '/test/workspace',
      }),
    );
  });
});
