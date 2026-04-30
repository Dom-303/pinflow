import { Command } from 'commander';
import path from 'node:path';
import { RelayControl } from '../../lifecycle/relay-control.js';
import { getWorkspaceRoot } from '../utils.js';

interface StatusCommandOptions {
  appRoot?: string;
}

export const StatusCommand = new Command('status')
  .description('Check whether the PinFlow relay is running')
  .option(
    '--app-root <path>',
    'PinFlow app workspace root. Defaults to the nearest configured app.',
  )
  .action(async (options: StatusCommandOptions) => {
    try {
      await status(options);
    } catch (error) {
      console.error(`[pinflow-cli] Failed to check relay status: ${error}`);
      process.exit(1);
    }
  });

async function status(options: StatusCommandOptions) {
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

  const { running, runData, lockData } = await relayControl.getStatus();

  if (!running || !runData || !lockData) {
    console.warn('[pinflow-cli] Relay is not running.');
    console.log('\nStart with: pinflow serve');
    process.exit(1);
  }

  const { pid } = runData;
  const { host, port, startedAt } = lockData;
  const uptime = Date.now() - new Date(startedAt).getTime();

  console.log('[pinflow-cli] Relay is running');
  console.log(`  PID:     ${pid}`);
  console.log(`  Port:    ${port}`);
  console.log(`  Host:    ${host}`);

  console.log(`\nEndpoints:`);
  console.log(`  HTTP: http://${host}:${port}`);
  console.log(`  WS:   ws://${host}:${port}/ws`);
  console.log(`  Health: http://${host}:${port}/health`);
  console.log(`  Uptime: ${formatUptime(uptime)}`);

  process.exit(0);
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${secs}s`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours < 24) {
    return `${hours}h ${mins}m`;
  }

  const days = Math.floor(hours / 24);
  const hrs = hours % 24;

  return `${days}d ${hrs}h`;
}
