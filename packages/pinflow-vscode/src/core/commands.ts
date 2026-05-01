import { formatPinFlowCliCommand } from './cli-command.js';

export interface WorkflowTerminal {
  sendText(text: string): void;
  show(): void;
}

export type TerminalFactory = (
  name: string,
  cwd: string,
) => WorkflowTerminal;

export function startStandardWorkflow(
  workspaceRoot: string,
  createTerminal: TerminalFactory,
  appRoot = workspaceRoot,
): void {
  const devTerminal = createTerminal('PinFlow Dev', workspaceRoot);
  devTerminal.sendText(formatPinFlowCliCommand(workspaceRoot, ['dev'], appRoot));
  devTerminal.show();

  const followTerminal = createTerminal('PinFlow Follow', workspaceRoot);
  followTerminal.sendText(
    formatPinFlowCliCommand(workspaceRoot, ['follow'], appRoot),
  );
  followTerminal.show();
}
