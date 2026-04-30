import { Command } from 'commander';
import path from 'node:path';

import { followLatestRunLog } from '../runs/run-log.js';
import { getWorkspaceRoot } from '../utils.js';

interface FollowCommandOptions {
  interval?: string;
  raw?: boolean;
}

function resolveWorkspaceRoot(appRoot?: string): string {
  const workspaceRoot = appRoot
    ? path.resolve(process.cwd(), appRoot)
    : getWorkspaceRoot();

  if (!workspaceRoot) {
    throw new Error(
      'No PinFlow app workspace found. Run inside a configured app or pass an app path.',
    );
  }

  return workspaceRoot;
}

export const FollowCommand = new Command('follow')
  .description('Follow the latest PinFlow run transcript')
  .argument('[appRoot]', 'PinFlow app workspace root')
  .option('--interval <ms>', 'Polling interval in milliseconds', '1000')
  .option('--raw', 'Show full provider transcript output')
  .action(async (appRoot: string | undefined, options: FollowCommandOptions) => {
    try {
      await followLatestRunLog({
        workspaceRoot: resolveWorkspaceRoot(appRoot),
        pollMs: options.interval ? parseInt(options.interval, 10) : undefined,
        mode: options.raw ? 'raw' : 'concise',
      });
    } catch (error) {
      console.error(`[pinflow-follow] Follow failed: ${error}`);
      process.exitCode = 1;
    }
  });
