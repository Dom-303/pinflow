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
): void {
  const devTerminal = createTerminal('PinFlow Dev', workspaceRoot);
  devTerminal.sendText('pinflow dev');
  devTerminal.show();

  const followTerminal = createTerminal('PinFlow Follow', workspaceRoot);
  followTerminal.sendText('pinflow follow');
  followTerminal.show();
}
