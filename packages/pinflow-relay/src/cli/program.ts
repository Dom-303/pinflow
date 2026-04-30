/**
 * PinFlow CLI
 *
 * Commands:
 *   serve   - Start the relay server (foreground or daemon)
 *   stop    - Stop a running daemon
 *   status  - Check relay status
 *   doctor  - Diagnose setup and relay health
 *   mcp     - Start MCP adapter for agent integration
 *   runner  - Run local agent autostart worker
 *   dev     - Start relay, runner, and app command
 *   runs    - Inspect and follow local run evidence
 *   follow  - Follow latest run evidence
 *   external - External visible agent handoff commands
 */
import { Command } from 'commander';
import { RELAY_VERSION } from '../version.js';
import { DevCommand } from './commands/dev.command.js';
import { ExternalCommand } from './commands/external.command.js';
import { FollowCommand } from './commands/follow.command.js';
import { InitCommand } from './commands/init.command.js';
import { ServeCommand } from './commands/serve.command.js';
import { StopCommand } from './commands/stop.command.js';
import { StatusCommand } from './commands/status.command.js';
import { DoctorCommand } from './commands/doctor.command.js';
import { McpCommand } from './commands/mcp.command.js';
import { RunnerCommand } from './commands/runner.command.js';
import { RunsCommand } from './commands/runs.command.js';

const program = new Command();

program
  .name('pinflow')
  .description(
    'PinFlow Relay - Local development server for UI-aware dev tooling',
  )
  .version(RELAY_VERSION);

/**
 * serve command - Start the relay server
 */
program.addCommand(ServeCommand);

/**
 * stop command - Stop a running daemon
 */
program.addCommand(StopCommand);

/**
 * status command - Check relay status
 */
program.addCommand(StatusCommand);

/**
 * doctor command - Diagnose setup and relay health
 */
program.addCommand(DoctorCommand);

/**
 * mcp command - Start MCP adapter for agent integration
 */
program.addCommand(McpCommand);

/**
 * runner command - Start local autostart worker
 */
program.addCommand(RunnerCommand);

/**
 * dev command - Start the full local development workflow
 */
program.addCommand(DevCommand);

/**
 * runs command - Inspect and follow local run evidence
 */
program.addCommand(RunsCommand);

/**
 * follow command - Short alias for following local run evidence
 */
program.addCommand(FollowCommand);

/**
 * external command - Visible external agent handoff
 */
program.addCommand(ExternalCommand);

/**
 * init command - Initialize PinFlow for a coding agent
 */
program.addCommand(InitCommand);

export { program };
