import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { RelayHttpClient } from '../client/relay-http-client.js';

export interface RunnerControlOptions {
  /** Enable debug logging. */
  debug?: boolean;
}

export interface RunnerEnsureOptions {
  relayHost: string;
  relayPort: number;
  provider?: string;
  model?: string;
  surface?: 'terminal' | 'background' | 'external';
  command?: string;
  args?: string[];
  intervalMs?: number;
  rawOutput?: boolean;
}

export interface RunnerEnsureResult {
  running: boolean;
  wasStarted: boolean;
  provider: string;
}

export class RunnerControl {
  private readonly debug: boolean;

  constructor(
    private readonly workspaceRoot: string,
    options: RunnerControlOptions = {},
  ) {
    this.debug = options.debug ?? false;
  }

  async ensureRunning(
    options: RunnerEnsureOptions,
  ): Promise<RunnerEnsureResult> {
    const provider = options.provider ?? 'codex';

    if (await this.hasActiveRunner(options, provider)) {
      return {
        running: true,
        wasStarted: false,
        provider,
      };
    }

    const child = this.spawn({
      provider,
      model: options.model,
      surface: options.surface,
      command: options.command,
      args: options.args,
      intervalMs: options.intervalMs,
      rawOutput: options.rawOutput,
    });

    if (!child.pid) {
      throw new Error('Failed to spawn runner. No PID returned from spawn.');
    }

    const running = await this.waitForRunner(options, provider);

    return {
      running,
      wasStarted: true,
      provider,
    };
  }

  spawn({
    provider,
    model,
    command,
    args,
    intervalMs,
    rawOutput,
    detached = true,
    surface,
  }: {
    provider: string;
    model?: string;
    surface?: 'terminal' | 'background' | 'external';
    command?: string;
    args?: string[];
    intervalMs?: number;
    rawOutput?: boolean;
    detached?: boolean;
  }): ChildProcess {
    const cliEntry = resolveCliEntryPath();
    const cliArgs = ['runner', '--provider', provider];

    if (command) {
      cliArgs.push('--command', command);
    }

    if (model) {
      cliArgs.push('--model', model);
    }

    cliArgs.push('--surface', surface ?? (detached ? 'background' : 'terminal'));

    for (const arg of args ?? []) {
      cliArgs.push('--arg', arg);
    }

    if (intervalMs && intervalMs > 0) {
      cliArgs.push('--interval', String(intervalMs));
    }

    if (rawOutput) {
      cliArgs.push('--raw');
    }

    if (this.debug) {
      cliArgs.push('--debug');
    }

    const child = spawn(process.execPath, [cliEntry, ...cliArgs], {
      detached,
      stdio: detached ? 'ignore' : 'inherit',
      env: {
        ...process.env,
        PINFLOW_RUNNER_AUTOSTART: '1',
      },
      cwd: this.workspaceRoot,
    });

    if (detached) {
      child.unref();
    }

    return child;
  }

  private async waitForRunner(
    options: RunnerEnsureOptions,
    provider: string,
  ): Promise<boolean> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 5_000) {
      if (await this.hasActiveRunner(options, provider)) {
        return true;
      }
      await sleep(150);
    }
    return false;
  }

  private async hasActiveRunner(
    options: RunnerEnsureOptions,
    provider: string,
  ): Promise<boolean> {
    try {
      const status = await new RelayHttpClient(
        options.relayHost,
        options.relayPort,
      ).getStatus();
      return Boolean(
        status.runner?.sessions.some((session) => session.provider === provider),
      );
    } catch {
      return false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveCliEntryPath(): string {
  const currentFileUrl = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFileUrl);
  return path.join(currentDir, '..', 'cli', 'bin', 'main.js');
}
