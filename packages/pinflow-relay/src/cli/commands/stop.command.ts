import { Command } from 'commander';
import path from 'node:path';
import { RelayControl } from '../../lifecycle/relay-control.js';
import { getWorkspaceRoot } from '../utils.js';

interface StopCommandOptions {
  appRoot?: string;
}

export const StopCommand = new Command('stop')
  .description('Stop the running PinFlow relay')
  .option(
    '--app-root <path>',
    'PinFlow app workspace root. Defaults to the nearest configured app.',
  )
  .action(async (options: StopCommandOptions) => {
    try {
      await stop(options);
    } catch (error) {
      console.error(`[pinflow-cli] Failed to stop relay daemon: ${error}`);
      process.exit(1);
    }
  });

async function stop(options: StopCommandOptions) {
  const workspaceRoot = options.appRoot
    ? path.resolve(process.cwd(), options.appRoot)
    : getWorkspaceRoot();

  if (!workspaceRoot) {
    console.error(
      '[pinflow-cli] No PinFlow app workspace found. Run inside a configured app or pass --app-root <path>.',
    );
    process.exit(1);
  }

  const relayControl = new RelayControl(workspaceRoot);

  console.log(`[pinflow-cli] Stopping relay daemon...`);

  await relayControl.stop();

  console.log('[pinflow-cli] Relay daemon stopped');
}
