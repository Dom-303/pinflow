import * as vscode from 'vscode';

import { getPinFlowWorkspaceStatus } from './core/workspace.js';

export function activate(context: vscode.ExtensionContext): void {
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  statusItem.command = 'pinflow.openPanel';
  context.subscriptions.push(statusItem);

  const refreshStatus = () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceFolder) {
      statusItem.text = 'PinFlow: no workspace';
      statusItem.tooltip = 'Open a workspace folder to use PinFlow.';
      statusItem.show();
      return;
    }

    const status = getPinFlowWorkspaceStatus(workspaceFolder);
    statusItem.text = formatStatusText(status.status);
    statusItem.tooltip = status.message;
    statusItem.show();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('pinflow.openPanel', () => {
      refreshStatus();
      void vscode.window.showInformationMessage(statusItem.tooltip ?? 'PinFlow');
    }),
    vscode.commands.registerCommand('pinflow.followRuns', () => {
      const terminal = vscode.window.createTerminal('PinFlow Follow');
      terminal.sendText('pinflow follow');
      terminal.show();
    }),
    vscode.commands.registerCommand('pinflow.openLatestRun', async () => {
      await vscode.window.showInformationMessage(
        'PinFlow run evidence viewer is coming in the next package.',
      );
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(refreshStatus),
  );

  refreshStatus();
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions from the extension context.
}

function formatStatusText(status: string): string {
  if (status === 'ready') return 'PinFlow: ready';
  if (status === 'relay-missing') return 'PinFlow: relay missing';
  return 'PinFlow: not configured';
}
