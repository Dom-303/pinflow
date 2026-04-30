import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';

import { RelayControl } from '../../lifecycle/relay-control.js';
import { RunnerControl } from '../../lifecycle/runner-control.js';

export interface PinflowDevOptions {
  workspaceRoot: string;
  appCommand: string[];
  relay: {
    host?: string;
    port?: number;
    bodyLimit?: number;
  };
  runner: {
    provider: string;
    model?: string;
    surface?: 'terminal' | 'background' | 'external';
    command?: string;
    args?: string[];
    intervalMs?: number;
    rawOutput?: boolean;
  };
  debug?: boolean;
  open?: boolean | string;
}

interface RelayControlLike {
  validateAndClear(): Promise<{ host: string; port: number } | undefined>;
  ensureRunning(options: {
    host?: string;
    port?: number;
    bodyLimit?: number;
  }): Promise<{ host: string; port: number }>;
  stop(): Promise<void>;
}

interface RunnerControlLike {
  spawn(options: {
    provider: string;
    model?: string;
    command?: string;
    args?: string[];
    intervalMs?: number;
    rawOutput?: boolean;
    detached: false;
  }): ChildProcess;
}

type AppSpawner = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess;

export interface PinflowDevDependencies {
  relayControl?: RelayControlLike;
  runnerControl?: RunnerControlLike;
  spawnApp?: AppSpawner;
  openUrl?: (url: string) => void;
  stderr?: Pick<Writable, 'write'>;
}

type ChildExit = {
  code: number | null;
  signal: NodeJS.Signals | null;
};

export async function runPinflowDev(
  options: PinflowDevOptions,
  deps: PinflowDevDependencies = {},
): Promise<number> {
  const [appBin, ...appArgs] = options.appCommand;

  if (!appBin) {
    throw new Error('Missing app command. Use: pinflow dev -- npm run dev');
  }

  const stderr = deps.stderr ?? process.stderr;
  const relayControl =
    deps.relayControl ??
    new RelayControl(options.workspaceRoot, { debug: options.debug });
  const runnerControl =
    deps.runnerControl ??
    new RunnerControl(options.workspaceRoot, { debug: options.debug });
  const spawnApp = deps.spawnApp ?? spawn;
  const openUrl = deps.openUrl ?? ((url) => openExternalUrl(url, stderr));

  const existingRelay = await relayControl.validateAndClear();
  const relay = existingRelay
    ? existingRelay
    : await relayControl.ensureRunning({
        host: options.relay.host,
        port: options.relay.port,
        bodyLimit: options.relay.bodyLimit,
      });
  const ownsRelay = !existingRelay;

  stderr.write(`[pinflow-cli] Relay ready at http://${relay.host}:${relay.port}\n`);

  const runnerChild = runnerControl.spawn({
    provider: options.runner.provider,
    model: options.runner.model,
    surface: 'terminal',
    command: options.runner.command,
    args: options.runner.args,
    intervalMs: options.runner.intervalMs,
    rawOutput: options.runner.rawOutput,
    detached: false,
  });
  stderr.write(
    `[pinflow-cli] Runner started for ${options.runner.provider}\n`,
  );

  const appChild = spawnApp(appBin, appArgs, {
    cwd: options.workspaceRoot,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PINFLOW_RELAY_HOST: relay.host,
      PINFLOW_RELAY_PORT: String(relay.port),
    },
  });
  stderr.write(`[pinflow-cli] App command started: ${options.appCommand.join(' ')}\n`);
  attachAppOutput(appChild, options.open, openUrl);

  const appExit = waitForChild(appChild);
  const runnerExit = waitForChild(runnerChild);

  try {
    const first = await Promise.race([
      appExit.then((exit) => ({ name: 'app' as const, exit })),
      runnerExit.then((exit) => ({ name: 'runner' as const, exit })),
    ]);

    if (first.name === 'runner') {
      stderr.write('[pinflow-cli] Runner exited before the app command.\n');
      terminateChild(appChild);
      return exitToCode(first.exit);
    }

    return exitToCode(first.exit);
  } finally {
    terminateChild(runnerChild);

    if (ownsRelay) {
      await relayControl.stop();
    }
  }
}

function waitForChild(child: ChildProcess): Promise<ChildExit> {
  return new Promise((resolve, reject) => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
    child.once('error', reject);
  });
}

function exitToCode(exit: ChildExit): number {
  if (typeof exit.code === 'number') {
    return exit.code;
  }
  return exit.signal ? 1 : 0;
}

function terminateChild(child: ChildProcess): void {
  if (!child.killed) {
    child.kill('SIGTERM');
  }
}

function attachAppOutput(
  child: ChildProcess,
  open: boolean | string | undefined,
  openUrl: (url: string) => void,
): void {
  if (typeof open === 'string') {
    openUrl(open);
  }

  let openedDetectedUrl = false;
  pipeOutput(child.stdout, process.stdout, (text) => {
    if (open === true && !openedDetectedUrl) {
      const url = findLocalhostUrl(text);
      if (url) {
        openedDetectedUrl = true;
        openUrl(url);
      }
    }
  });
  pipeOutput(child.stderr, process.stderr);
}

function pipeOutput(
  source: Readable | null,
  target: Pick<Writable, 'write'>,
  onText?: (text: string) => void,
): void {
  source?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    target.write(chunk);
    onText?.(text);
  });
}

function findLocalhostUrl(text: string): string | null {
  const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?/);
  return match?.[0] ?? null;
}

function openExternalUrl(url: string, stderr: Pick<Writable, 'write'>): void {
  const candidates = browserOpenCandidates(url);
  let index = 0;

  const tryNext = (): void => {
    const candidate = candidates[index];
    index += 1;

    if (!candidate) {
      stderr.write(
        `[pinflow-cli] Could not open the browser automatically. Open ${url}\n`,
      );
      return;
    }

    const child = spawn(candidate.command, candidate.args, {
      detached: true,
      stdio: 'ignore',
    });

    child.once('error', tryNext);
    child.once('exit', (code) => {
      if (code && code !== 0) {
        tryNext();
      }
    });
    child.unref();
  };

  tryNext();
}

function browserOpenCandidates(url: string): Array<{
  command: string;
  args: string[];
}> {
  if (process.platform === 'darwin') {
    return [{ command: 'open', args: [url] }];
  }

  if (process.platform === 'win32') {
    return [{ command: 'cmd', args: ['/c', 'start', '', url] }];
  }

  return [
    { command: 'xdg-open', args: [url] },
    { command: 'wslview', args: [url] },
    { command: 'cmd.exe', args: ['/c', 'start', '', url] },
    {
      command: 'powershell.exe',
      args: ['-NoProfile', '-Command', 'Start-Process', url],
    },
  ];
}
