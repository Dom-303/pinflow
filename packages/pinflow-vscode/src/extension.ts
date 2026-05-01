import * as vscode from 'vscode';

import { startStandardWorkflow } from './core/commands.js';
import {
  buildPinFlowPanelItems,
  type PinFlowPanelItem,
} from './core/panel-model.js';
import { getPinFlowWorkspaceStatus } from './core/workspace.js';

export function activate(context: vscode.ExtensionContext): void {
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  statusItem.command = 'pinflow.openPanel';
  context.subscriptions.push(statusItem);
  const treeProvider = new PinFlowTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('pinflow.status', treeProvider),
  );

  const refreshStatus = () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceFolder) {
      statusItem.text = 'PinFlow: no workspace';
      statusItem.tooltip = 'Open a workspace folder to use PinFlow.';
      statusItem.show();
      treeProvider.setItems([
        {
          label: 'Open a workspace folder to use PinFlow',
        },
      ]);
      return;
    }

    const status = getPinFlowWorkspaceStatus(workspaceFolder);
    statusItem.text = formatStatusText(status.status);
    statusItem.tooltip = status.message;
    statusItem.show();
    void buildPinFlowPanelItems(status).then((items) =>
      treeProvider.setItems(items),
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('pinflow.openPanel', () => {
      refreshStatus();
      void vscode.commands.executeCommand('pinflow.status.focus');
    }),
    vscode.commands.registerCommand('pinflow.followRuns', () => {
      const workspaceRoot = getCurrentWorkspaceRoot();
      const terminal = vscode.window.createTerminal({
        name: 'PinFlow Follow',
        cwd: workspaceRoot,
      });
      terminal.sendText('pinflow follow');
      terminal.show();
    }),
    vscode.commands.registerCommand('pinflow.openLatestRun', async () => {
      await vscode.window.showInformationMessage(
        'PinFlow run evidence viewer is coming in the next package.',
      );
    }),
    vscode.commands.registerCommand('pinflow.startWorkflow', () => {
      const workspaceRoot = getCurrentWorkspaceRoot();

      if (!workspaceRoot) {
        void vscode.window.showInformationMessage(
          'Open a configured PinFlow workspace first.',
        );
        return;
      }

      startStandardWorkflow(workspaceRoot, (name, cwd) =>
        vscode.window.createTerminal({ name, cwd }),
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

function getCurrentWorkspaceRoot(): string | undefined {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!workspaceFolder) {
    return;
  }

  return getPinFlowWorkspaceStatus(workspaceFolder).workspaceRoot;
}

class PinFlowTreeDataProvider
  implements vscode.TreeDataProvider<PinFlowPanelItem>
{
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    PinFlowPanelItem | undefined
  >();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
  private items: PinFlowPanelItem[] = [];

  setItems(items: PinFlowPanelItem[]): void {
    this.items = items;
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: PinFlowPanelItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = element.description;
    return item;
  }

  getChildren(): PinFlowPanelItem[] {
    return this.items;
  }
}
