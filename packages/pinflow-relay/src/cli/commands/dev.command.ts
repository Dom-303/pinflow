import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { runPinflowDev } from '../dev/dev-session.js';
import { getWorkspaceRoot } from '../utils.js';

interface DevCommandOptions {
  appRoot?: string;
  provider?: string;
  model?: string;
  command?: string;
  arg?: string[];
  interval?: string;
  port?: string;
  host?: string;
  bodyLimit?: string;
  raw?: boolean;
  open?: boolean | string;
  debug?: boolean;
}

function collectArg(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

export const DevCommand = new Command('dev')
  .description('Start PinFlow relay, runner, and app dev command')
  .argument(
    '[appCommand...]',
    'App dev command after --, for example: npm run dev',
  )
  .option(
    '--app-root <path>',
    'PinFlow app workspace root. Defaults to the nearest configured app.',
  )
  .option(
    '--provider <name>',
    'Runner provider preset: codex, claude, auto, or custom',
    'codex',
  )
  .option(
    '--model <name>',
    'Optional provider model override. Omit to use the local agent default.',
  )
  .option('--command <command>', 'Custom local agent command')
  .option(
    '--arg <arg>',
    'Custom runner command argument. Repeat for multiple args.',
    collectArg,
    [],
  )
  .option('--interval <ms>', 'Runner polling interval in milliseconds', '2000')
  .option('-p, --port <number>', 'Relay port to listen on (0 for dynamic)')
  .option('--host <string>', 'Relay host to bind to')
  .option(
    '--body-limit <bytes>',
    'Max relay request body size in bytes (default: 10MB)',
  )
  .option('--raw', 'Show full provider output in the terminal')
  .option(
    '--open [url]',
    'Open the detected app localhost URL, or an explicit URL, in the browser',
  )
  .option('--debug', 'Enable debug logging')
  .action(async (appCommand: string[], options: DevCommandOptions) => {
    try {
      const exitCode = await dev(appCommand, options);
      process.exitCode = exitCode;
    } catch (error) {
      console.error(`[pinflow-cli] Dev failed: ${error}`);
      process.exitCode = 1;
    }
  });

async function dev(
  appCommand: string[],
  options: DevCommandOptions,
): Promise<number> {
  const workspaceRoot = options.appRoot
    ? path.resolve(process.cwd(), options.appRoot)
    : getWorkspaceRoot();

  if (!workspaceRoot) {
    throw new Error(
      'No PinFlow app workspace found. Run this inside a configured app, pass --app-root <path>, or run pinflow init first.',
    );
  }

  const resolvedAppCommand = resolveAppCommand(workspaceRoot, appCommand);

  return runPinflowDev({
    workspaceRoot,
    appCommand: resolvedAppCommand,
    relay: {
      host: options.host,
      port: options.port ? parseInt(options.port, 10) : undefined,
      bodyLimit: options.bodyLimit
        ? parseInt(options.bodyLimit, 10)
        : undefined,
    },
    runner: {
      provider: options.provider ?? 'codex',
      model: options.model,
      command: options.command,
      args: options.arg?.length ? options.arg : undefined,
      intervalMs: Math.max(250, parseInt(options.interval ?? '2000', 10)),
      rawOutput: Boolean(options.raw),
    },
    debug: Boolean(options.debug),
    open: options.open,
  });
}

function resolveAppCommand(
  workspaceRoot: string,
  appCommand: string[],
): string[] {
  if (appCommand.length > 0) {
    return appCommand;
  }

  if (hasNpmDevScript(workspaceRoot)) {
    return ['npm', 'run', 'dev'];
  }

  throw new Error(
    'Missing app command. Add a package.json dev script or use: pinflow dev -- npm run dev',
  );
}

function hasNpmDevScript(workspaceRoot: string): boolean {
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(
      readFileSync(packageJsonPath, 'utf8'),
    ) as { scripts?: Record<string, unknown> };
    return typeof packageJson.scripts?.['dev'] === 'string';
  } catch {
    return false;
  }
}
