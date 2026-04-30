import { Command } from 'commander';
import {
  claimExternalTask,
  completeExternalTask,
  failExternalTask,
} from '../external/external-session.js';
import { getWorkspaceRoot } from '../utils.js';

interface ExternalCommonOptions {
  provider?: string;
  model?: string;
  label?: string;
  port?: string;
  host?: string;
  bodyLimit?: string;
  debug?: boolean;
  json?: boolean;
}

interface ExternalCompleteOptions extends ExternalCommonOptions {
  message?: string;
  runDir?: string;
}

interface ExternalFailOptions extends ExternalCommonOptions {
  error?: string;
  runDir?: string;
}

function getWorkspaceOrThrow(): string {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    throw new Error('No workspace root found');
  }
  return workspaceRoot;
}

function relayOptions(options: ExternalCommonOptions): {
  host?: string;
  port?: number;
  bodyLimit?: number;
} {
  return {
    host: options.host,
    port: options.port ? parseInt(options.port, 10) : undefined,
    bodyLimit: options.bodyLimit ? parseInt(options.bodyLimit, 10) : undefined,
  };
}

export const ExternalCommand = new Command('external')
  .description(
    'Claim and complete PinFlow tasks from an external visible agent',
  )
  .addCommand(
    new Command('claim')
      .description('Claim the next released task and write a prompt handoff')
      .option(
        '--provider <name>',
        'Provider/channel that will handle the task',
        'codex',
      )
      .option('--model <name>', 'Model name chosen by the user/session')
      .option('--label <label>', 'Human-readable external agent label')
      .option('-p, --port <number>', 'Relay port to use')
      .option('--host <string>', 'Relay host to use')
      .option(
        '--body-limit <bytes>',
        'Max relay request body size in bytes (default: 10MB)',
      )
      .option('--json', 'Print machine-readable JSON')
      .option('--debug', 'Enable debug logging')
      .action(async (options: ExternalCommonOptions) => {
        try {
          const result = await claimExternalTask({
            workspaceRoot: getWorkspaceOrThrow(),
            provider: options.provider ?? 'codex',
            model: options.model,
            label: options.label,
            relay: relayOptions(options),
            debug: Boolean(options.debug),
          });

          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(
              `[pinflow-cli] External handoff: ${result.annotationId}`,
            );
            console.log(`[pinflow-cli] Prompt: ${result.promptPath}`);
            console.log(`[pinflow-cli] Run evidence: ${result.runDir}`);
          }
        } catch (error) {
          console.error(`[pinflow-cli] External claim failed: ${error}`);
          process.exitCode = 1;
        }
      }),
  )
  .addCommand(
    new Command('complete')
      .description('Mark an external task completed after repo files changed')
      .argument('<annotationId>', 'Annotation ID to complete')
      .option('--message <message>', 'Completion message for PinFlow')
      .option('--run-dir <path>', 'Run evidence directory from external claim')
      .option('-p, --port <number>', 'Relay port to use')
      .option('--host <string>', 'Relay host to use')
      .option(
        '--body-limit <bytes>',
        'Max relay request body size in bytes (default: 10MB)',
      )
      .option('--debug', 'Enable debug logging')
      .action(
        async (annotationId: string, options: ExternalCompleteOptions) => {
          try {
            await completeExternalTask({
              workspaceRoot: getWorkspaceOrThrow(),
              annotationId,
              message: options.message,
              runDir: options.runDir,
              relay: relayOptions(options),
              debug: Boolean(options.debug),
            });
            console.log(
              `[pinflow-cli] External task completed: ${annotationId}`,
            );
          } catch (error) {
            console.error(`[pinflow-cli] External complete failed: ${error}`);
            process.exitCode = 1;
          }
        },
      ),
  )
  .addCommand(
    new Command('fail')
      .description('Mark an external task failed with a readable reason')
      .argument('<annotationId>', 'Annotation ID to fail')
      .requiredOption('--error <message>', 'Failure reason')
      .option('--run-dir <path>', 'Run evidence directory from external claim')
      .option('-p, --port <number>', 'Relay port to use')
      .option('--host <string>', 'Relay host to use')
      .option(
        '--body-limit <bytes>',
        'Max relay request body size in bytes (default: 10MB)',
      )
      .option('--debug', 'Enable debug logging')
      .action(async (annotationId: string, options: ExternalFailOptions) => {
        try {
          await failExternalTask({
            workspaceRoot: getWorkspaceOrThrow(),
            annotationId,
            errorDetails: options.error ?? 'External task failed.',
            runDir: options.runDir,
            relay: relayOptions(options),
            debug: Boolean(options.debug),
          });
          console.log(`[pinflow-cli] External task failed: ${annotationId}`);
        } catch (error) {
          console.error(`[pinflow-cli] External fail failed: ${error}`);
          process.exitCode = 1;
        }
      }),
  );
