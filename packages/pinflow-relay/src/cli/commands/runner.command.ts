import { Command } from 'commander';
import { RelayControl } from '../../lifecycle/relay-control.js';
import { PinflowRunner, resolveRunnerCommand } from '../../runner/runner.js';
import { getWorkspaceRoot } from '../utils.js';

interface RunnerCommandOptions {
  provider?: string;
  model?: string;
  surface?: 'terminal' | 'background' | 'external';
  command?: string;
  arg?: string[];
  interval?: string;
  once?: boolean;
  dryRun?: boolean;
  raw?: boolean;
  debug?: boolean;
  bodyLimit?: string;
}

function collectArg(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function resolveSurface(
  surface: RunnerCommandOptions['surface'],
): NonNullable<RunnerCommandOptions['surface']> {
  if (
    surface === 'terminal' ||
    surface === 'background' ||
    surface === 'external'
  ) {
    return surface;
  }
  throw new Error(
    `Invalid runner surface "${surface}". Expected terminal, background, or external.`,
  );
}

export const RunnerCommand = new Command('runner')
  .description('Run the PinFlow local agent runner')
  .option(
    '--provider <name>',
    'Runner provider preset: codex, claude, auto, or custom',
    'codex',
  )
  .option(
    '--model <name>',
    'Optional provider model override. Omit to use the local agent default.',
  )
  .option(
    '--surface <surface>',
    'Execution surface reporting: terminal, background, or external',
    'terminal',
  )
  .option('--command <command>', 'Custom local agent command')
  .option(
    '--arg <arg>',
    'Custom command argument. Repeat for multiple args. Use {prompt} to pass the prompt as an argument; otherwise it is sent via stdin.',
    collectArg,
    [],
  )
  .option('--interval <ms>', 'Polling interval in milliseconds', '2000')
  .option('--once', 'Process at most one task and exit')
  .option('--raw', 'Show full provider output in the terminal')
  .option(
    '--dry-run',
    'Print the next released task prompt without claiming it',
  )
  .option(
    '--body-limit <bytes>',
    'Max relay request body size in bytes (default: 10MB)',
  )
  .option('--debug', 'Enable debug logging')
  .action(async (options: RunnerCommandOptions) => {
    try {
      await runner(options);
    } catch (error) {
      console.error(`[pinflow-cli] Runner failed: ${error}`);
      process.exit(1);
    }
  });

async function runner(options: RunnerCommandOptions): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();

  if (!workspaceRoot) {
    throw new Error('No workspace root found');
  }

  const provider = options.provider ?? 'codex';
  const surface = resolveSurface(options.surface ?? 'terminal');
  const bodyLimit = options.bodyLimit
    ? parseInt(options.bodyLimit, 10)
    : undefined;
  const relayControl = new RelayControl(workspaceRoot, {
    debug: options.debug ?? false,
  });
  const { host, port } = await relayControl.ensureRunning({ bodyLimit });
  const command = resolveRunnerCommand({
    provider,
    model: options.model,
    command: options.command,
    args: options.arg?.length ? options.arg : undefined,
  });

  const pollIntervalMs = Math.max(
    250,
    parseInt(options.interval ?? '2000', 10),
  );

  const pinflowRunner = new PinflowRunner({
    workspaceRoot,
    relayHost: host,
    relayPort: port,
    provider,
    label: `PinFlow Runner (${provider})`,
    command,
    surface,
    pollIntervalMs,
    once: Boolean(options.once || options.dryRun),
    dryRun: Boolean(options.dryRun),
    debug: Boolean(options.debug),
    outputMode: options.raw ? 'raw' : 'concise',
  });

  console.error(
    `[pinflow-cli] Runner connected to relay at http://${host}:${port}`,
  );
  console.error(
    `[pinflow-cli] Runner command: ${command.command} ${command.args.join(' ')}`,
  );

  const shutdown = (): void => {
    pinflowRunner.stop();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await pinflowRunner.start();
}
