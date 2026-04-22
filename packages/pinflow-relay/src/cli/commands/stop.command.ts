import { Command } from 'commander';
import { RelayControl } from '../../lifecycle/relay-control.js';
import { getWorkspaceRoot } from '../utils.js';

export const StopCommand = new Command('stop')
  .description('Stop the running PinFlow relay')
  .action(async () => {
    try {
      await stop();
    } catch (error) {
      console.error(`[pinflow-cli] Failed to stop relay daemon: ${error}`);
      process.exit(1);
    }
  });

async function stop() {
  const workspaceRoot = getWorkspaceRoot();

  if (!workspaceRoot) {
    console.error('[pinflow-cli] No workspace root found');
    process.exit(1);
  }

  const relayControl = new RelayControl(workspaceRoot);

  console.log(`[pinflow-cli] Stopping relay daemon...`);

  await relayControl.stop();

  console.log('[pinflow-cli] Relay daemon stopped');
}
