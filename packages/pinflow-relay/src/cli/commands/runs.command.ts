import { Command } from 'commander';
import path from 'node:path';

import { getWorkspaceRoot } from '../utils.js';
import {
  findLatestRun,
  followLatestRunLog,
  formatLatestRun,
} from '../runs/run-log.js';

interface RunsCommandOptions {
  appRoot?: string;
}

interface RunsFollowOptions extends RunsCommandOptions {
  interval?: string;
  raw?: boolean;
}

function resolveWorkspaceRoot(options: RunsCommandOptions): string {
  const workspaceRoot = options.appRoot
    ? path.resolve(process.cwd(), options.appRoot)
    : getWorkspaceRoot();

  if (!workspaceRoot) {
    throw new Error(
      'No PinFlow app workspace found. Run inside a configured app or pass --app-root <path>.',
    );
  }

  return workspaceRoot;
}

export const RunsCommand = new Command('runs')
  .description('Inspect and follow local PinFlow run evidence')
  .addCommand(
    new Command('latest')
      .description('Show the latest local PinFlow run evidence')
      .option(
        '--app-root <path>',
        'PinFlow app workspace root. Defaults to the nearest configured app.',
      )
      .action(async (options: RunsCommandOptions) => {
        try {
          const latest = await findLatestRun(resolveWorkspaceRoot(options));
          if (!latest) {
            console.log('[pinflow-runs] No run evidence found.');
            return;
          }
          console.log(formatLatestRun(latest));
        } catch (error) {
          console.error(`[pinflow-runs] Latest failed: ${error}`);
          process.exitCode = 1;
        }
      }),
  )
  .addCommand(
    new Command('follow')
      .description('Follow the latest PinFlow run transcript from any terminal')
      .option(
        '--app-root <path>',
        'PinFlow app workspace root. Defaults to the nearest configured app.',
      )
      .option('--interval <ms>', 'Polling interval in milliseconds', '1000')
      .option('--raw', 'Show full provider transcript output')
      .action(async (options: RunsFollowOptions) => {
        try {
          await followLatestRunLog({
            workspaceRoot: resolveWorkspaceRoot(options),
            pollMs: options.interval
              ? parseInt(options.interval, 10)
              : undefined,
            mode: options.raw ? 'raw' : 'concise',
          });
        } catch (error) {
          console.error(`[pinflow-runs] Follow failed: ${error}`);
          process.exitCode = 1;
        }
      }),
  );
