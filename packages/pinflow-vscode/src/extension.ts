import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

import { startStandardWorkflow } from './core/commands.js';
import { openLatestRunEvidence } from './core/evidence-commands.js';
import {
  claimExternalHandoff,
  completeExternalHandoff,
  failExternalHandoff,
  type ExternalHandoffActions,
  type ExternalHandoffClaim,
} from './core/external-handoff.js';
import {
  buildPinFlowPanelItems,
  type PinFlowPanelItem,
} from './core/panel-model.js';
import { getPinFlowWorkspaceStatus } from './core/workspace.js';

const execFileAsync = promisify(execFile);

export function activate(context: vscode.ExtensionContext): void {
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  statusItem.command = 'pinflow.openPanel';
  context.subscriptions.push(statusItem);
  const treeProvider = new PinFlowTreeDataProvider();
  let externalClaim: ExternalHandoffClaim | null = null;
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
    vscode.commands.registerCommand('pinflow.refreshPanel', () => {
      refreshStatus();
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
      const workspaceRoot = getCurrentWorkspaceRoot();

      if (!workspaceRoot) {
        await vscode.window.showInformationMessage(
          'Open a configured PinFlow workspace first.',
        );
        return;
      }

      await openLatestRunEvidence(workspaceRoot, {
        openFile: openEvidenceFile,
        showInformationMessage: (message) =>
          vscode.window.showInformationMessage(message),
      });
    }),
    vscode.commands.registerCommand('pinflow.openEvidenceFile', async (filePath) => {
      if (typeof filePath !== 'string') return;
      await openEvidenceFile(filePath);
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
    vscode.commands.registerCommand('pinflow.externalClaim', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();

      if (!workspaceRoot) {
        await vscode.window.showInformationMessage(
          'Open a configured PinFlow workspace first.',
        );
        return;
      }

      externalClaim = await claimExternalHandoff(
        workspaceRoot,
        createExternalActions(),
      );
      refreshStatus();
    }),
    vscode.commands.registerCommand('pinflow.externalComplete', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();

      if (!workspaceRoot || !externalClaim) {
        await vscode.window.showInformationMessage(
          'Claim an external PinFlow task first.',
        );
        return;
      }

      const completed = await completeExternalHandoff(
        workspaceRoot,
        externalClaim,
        createExternalActions(),
      );
      if (completed) externalClaim = null;
      refreshStatus();
    }),
    vscode.commands.registerCommand('pinflow.externalFail', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();

      if (!workspaceRoot || !externalClaim) {
        await vscode.window.showInformationMessage(
          'Claim an external PinFlow task first.',
        );
        return;
      }

      const reason = await vscode.window.showInputBox({
        prompt: 'Why should this external PinFlow task fail?',
        placeHolder: 'User cancelled the external session.',
        value: 'User cancelled the external session.',
      });
      if (!reason?.trim()) return;

      await failExternalHandoff(
        workspaceRoot,
        externalClaim,
        reason.trim(),
        createExternalActions(),
      );
      externalClaim = null;
      refreshStatus();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(refreshStatus),
  );

  const refreshTimer = setInterval(refreshStatus, 3000);
  context.subscriptions.push({
    dispose: () => clearInterval(refreshTimer),
  });

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

async function openEvidenceFile(filePath: string): Promise<void> {
  await vscode.window.showTextDocument(vscode.Uri.file(filePath));
}

function createExternalActions(): ExternalHandoffActions {
  return {
    runCommand: async (command, args, options) => {
      const result = await execFileAsync(command, args, {
        cwd: options.cwd,
        env: { ...process.env, FORCE_COLOR: '0' },
      });
      return {
        stdout: result.stdout,
        stderr: result.stderr,
      };
    },
    openFile: openEvidenceFile,
    showInformationMessage: (message) =>
      vscode.window.showInformationMessage(message),
    hasRepoDiff,
  };
}

async function hasRepoDiff(workspaceRoot: string): Promise<boolean> {
  const unstaged = await execFileAsync(
    'git',
    ['diff', '--quiet', '--no-ext-diff', '--', '.'],
    { cwd: workspaceRoot, env: { ...process.env, FORCE_COLOR: '0' } },
  )
    .then(() => false)
    .catch((error: { code?: number }) => error.code === 1);

  if (unstaged) return true;

  return execFileAsync(
    'git',
    ['diff', '--cached', '--quiet', '--no-ext-diff', '--', '.'],
    { cwd: workspaceRoot, env: { ...process.env, FORCE_COLOR: '0' } },
  )
    .then(() => false)
    .catch((error: { code?: number }) => error.code === 1);
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
    item.command = element.command;
    return item;
  }

  getChildren(): PinFlowPanelItem[] {
    return this.items;
  }
}
