import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

import { startStandardWorkflow } from './core/commands.js';
import { formatPinFlowCliCommand } from './core/cli-command.js';
import { openLatestRunEvidence } from './core/evidence-commands.js';
import {
  claimExternalHandoff,
  completeExternalHandoff,
  failExternalHandoff,
  type ExternalHandoffActions,
  type ExternalHandoffClaim,
} from './core/external-handoff.js';
import { findRunEvidence } from './core/run-evidence.js';
import {
  buildActionsViewItems,
  type ActionsViewItem,
} from './core/views/actions-view-model.js';
import {
  buildRunsViewTree,
  expandTimelineMarker,
  type RunsViewGroupNode,
  type RunsViewNode,
  type RunsViewRunNode,
} from './core/views/runs-view-model.js';
import {
  buildStatusViewItems,
  type StatusViewItem,
} from './core/views/status-view-model.js';
import { getBestPinFlowWorkspaceStatus } from './core/workspace.js';

const execFileAsync = promisify(execFile);

const RUN_EVIDENCE_LIMIT = 80;

const notifiedFailedRunKeys = new Set<string>();
let isFirstRefresh = true;

function clampInterval(raw: number): number {
  if (!Number.isFinite(raw)) return 3000;
  return Math.min(60000, Math.max(500, Math.floor(raw)));
}

export function activate(context: vscode.ExtensionContext): void {
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  statusItem.command = 'pinflow.openPanel';
  context.subscriptions.push(statusItem);

  const statusProvider = new StatusTreeDataProvider();
  const runsProvider = new RunsTreeDataProvider();
  const actionsProvider = new ActionsTreeDataProvider();
  let externalClaim: ExternalHandoffClaim | null = null;

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('pinflow.status', statusProvider),
    vscode.window.registerTreeDataProvider('pinflow.runs', runsProvider),
    vscode.window.registerTreeDataProvider('pinflow.actions', actionsProvider),
  );

  const refreshStatus = () => {
    void refreshAll();
  };

  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  function applyRefreshInterval(): void {
    const config = vscode.workspace.getConfiguration('pinflow');
    const intervalMs = clampInterval(config.get<number>('refreshIntervalMs', 3000));
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refreshStatus, intervalMs);
  }

  async function refreshAll(): Promise<void> {
    const workspaceFolders = getWorkspaceFolders();

    if (!workspaceFolders.length) {
      statusItem.text = 'PinFlow: no workspace';
      statusItem.tooltip = 'Open a workspace folder to use PinFlow.';
      statusItem.show();
      statusProvider.setItems([]);
      runsProvider.setRoots([]);
      actionsProvider.setItems(buildActionsViewItems(externalClaim));
      return;
    }

    const workspaceStatus = getBestPinFlowWorkspaceStatus(workspaceFolders);
    if (!workspaceStatus) return;

    statusItem.text = formatStatusText(workspaceStatus.status);
    statusItem.tooltip = workspaceStatus.message;
    statusItem.show();

    const runEvidence = workspaceStatus.workspaceRoot
      ? await findRunEvidence(workspaceStatus.workspaceRoot, { limit: RUN_EVIDENCE_LIMIT })
      : [];

    statusProvider.setItems(
      buildStatusViewItems(workspaceStatus, externalClaim, runEvidence[0] ?? null),
    );
    const config = vscode.workspace.getConfiguration('pinflow');
    const todayExpandedByDefault = config.get<boolean>('runs.todayExpandedByDefault', true);
    const timeFormat = config.get<'24h' | '12h'>('timeFormat', '24h');
    const notifyFailed = config.get<boolean>('notifications.runFailed', true);

    const failedRuns = runEvidence.filter((run) => run.summary.status === 'failed');

    if (isFirstRefresh) {
      for (const run of failedRuns) {
        notifiedFailedRunKeys.add(run.runId ?? run.summaryPath);
      }
      isFirstRefresh = false;
    } else {
      for (const run of failedRuns) {
        const key = run.runId ?? run.summaryPath;
        if (notifiedFailedRunKeys.has(key)) continue;
        // Always track the key even when notifications are disabled.
        // This prevents a toast burst if the user re-enables the setting later.
        notifiedFailedRunKeys.add(key);
        if (notifyFailed) {
          void vscode.window.showErrorMessage(
            `PinFlow run failed: ${run.annotationId ?? run.runId ?? key}`,
          );
        }
      }
    }

    runsProvider.setRoots(buildRunsViewTree(runEvidence, new Date(), { todayExpandedByDefault, timeFormat }));
    actionsProvider.setItems(buildActionsViewItems(externalClaim));
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('pinflow.openContainer', () => {
      refreshStatus();
      void vscode.commands.executeCommand('workbench.view.extension.pinflow');
    }),
    vscode.commands.registerCommand('pinflow.openPanel', () => {
      void vscode.commands.executeCommand('pinflow.openContainer');
    }),
    vscode.commands.registerCommand('pinflow.refreshPanel', () => {
      refreshStatus();
    }),
    vscode.commands.registerCommand('pinflow.followRuns', () => {
      const workspace = getCurrentWorkspace();
      const terminal = vscode.window.createTerminal({
        name: 'PinFlow Follow',
        cwd: workspace?.commandRoot,
      });
      terminal.sendText(
        workspace
          ? formatPinFlowCliCommand(workspace.commandRoot, ['follow'], workspace.appRoot)
          : 'pinflow follow',
      );
      terminal.show();
    }),
    vscode.commands.registerCommand('pinflow.openLatestRun', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();
      if (!workspaceRoot) {
        await vscode.window.showInformationMessage('Open a configured PinFlow workspace first.');
        return;
      }
      await openLatestRunEvidence(workspaceRoot, {
        openFile: openEvidenceFile,
        showInformationMessage: (message) => vscode.window.showInformationMessage(message),
      });
    }),
    vscode.commands.registerCommand('pinflow.openEvidenceFile', async (filePath) => {
      if (typeof filePath !== 'string') return;
      await openEvidenceFile(filePath);
    }),
    vscode.commands.registerCommand('pinflow.startWorkflow', () => {
      const workspace = getCurrentWorkspace();
      if (!workspace) {
        void vscode.window.showInformationMessage('Open a configured PinFlow workspace first.');
        return;
      }
      startStandardWorkflow(
        workspace.commandRoot,
        (name, cwd) => vscode.window.createTerminal({ name, cwd }),
        workspace.appRoot,
      );
    }),
    vscode.commands.registerCommand('pinflow.openSettings', () => {
      void vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:dom-303.pinflow-vscode',
      );
    }),
    vscode.commands.registerCommand('pinflow.externalClaim', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();
      if (!workspaceRoot) {
        await vscode.window.showInformationMessage('Open a configured PinFlow workspace first.');
        return;
      }
      const provider = vscode.workspace
        .getConfiguration('pinflow')
        .get<string>('externalHandoff.defaultProvider', 'codex');
      externalClaim = await claimExternalHandoff(workspaceRoot, createExternalActions(), provider);
      refreshStatus();
    }),
    vscode.commands.registerCommand('pinflow.externalComplete', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();
      if (!workspaceRoot || !externalClaim) {
        await vscode.window.showInformationMessage('Claim an external PinFlow task first.');
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
        await vscode.window.showInformationMessage('Claim an external PinFlow task first.');
        return;
      }
      const reason = await vscode.window.showInputBox({
        prompt: 'Why should this external PinFlow task fail?',
        placeHolder: 'User cancelled the external session.',
        value: 'User cancelled the external session.',
      });
      if (!reason?.trim()) return;
      await failExternalHandoff(workspaceRoot, externalClaim, reason.trim(), createExternalActions());
      externalClaim = null;
      refreshStatus();
    }),
    vscode.commands.registerCommand(
      'pinflow.openRunDiff',
      async (node: RunsViewRunNode | undefined) => {
        const diffPath = node?.run?.diffPath;
        if (!diffPath) {
          await vscode.window.showInformationMessage('This run has no diff.patch.');
          return;
        }
        await openEvidenceFile(diffPath);
      },
    ),
    vscode.commands.registerCommand(
      'pinflow.openRunDirectory',
      async (node: RunsViewRunNode | undefined) => {
        const summaryPath = node?.run?.summaryPath;
        if (!summaryPath) return;
        const dir = vscode.Uri.file(path.dirname(summaryPath));
        await vscode.commands.executeCommand('revealFileInOS', dir);
      },
    ),
    vscode.workspace.onDidChangeWorkspaceFolders(refreshStatus),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('pinflow.refreshIntervalMs')) {
        applyRefreshInterval();
      }
    }),
  );

  context.subscriptions.push({
    dispose: () => {
      if (refreshTimer) clearInterval(refreshTimer);
    },
  });

  applyRefreshInterval();
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
  return getCurrentWorkspace()?.appRoot;
}

function getCurrentWorkspace():
  | {
      commandRoot: string;
      appRoot: string;
    }
  | undefined {
  const status = getBestPinFlowWorkspaceStatus(getWorkspaceFolders());

  if (!status?.workspaceRoot) {
    return;
  }

  return {
    commandRoot: status.workspaceFolder,
    appRoot: status.workspaceRoot,
  };
}

function getWorkspaceFolders(): string[] {
  return vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? [];
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

class StatusTreeDataProvider
  implements vscode.TreeDataProvider<StatusViewItem>
{
  private readonly emitter = new vscode.EventEmitter<StatusViewItem | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private items: readonly StatusViewItem[] = [];

  setItems(items: readonly StatusViewItem[]): void {
    this.items = items;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: StatusViewItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.description = element.description;
    item.tooltip = element.tooltip;
    item.iconPath = element.themeIconColor
      ? new vscode.ThemeIcon(element.themeIcon, new vscode.ThemeColor(element.themeIconColor))
      : new vscode.ThemeIcon(element.themeIcon);
    return item;
  }

  getChildren(element?: StatusViewItem): readonly StatusViewItem[] {
    return element ? [] : this.items;
  }
}

class ActionsTreeDataProvider
  implements vscode.TreeDataProvider<ActionsViewItem>
{
  private readonly emitter = new vscode.EventEmitter<ActionsViewItem | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private items: readonly ActionsViewItem[] = [];

  setItems(items: readonly ActionsViewItem[]): void {
    this.items = items;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: ActionsViewItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.iconPath = new vscode.ThemeIcon(element.themeIcon);
    item.command = { command: element.command, title: element.label };
    return item;
  }

  getChildren(element?: ActionsViewItem): readonly ActionsViewItem[] {
    return element ? [] : this.items;
  }
}

class RunsTreeDataProvider
  implements vscode.TreeDataProvider<RunsViewNode>
{
  private readonly emitter = new vscode.EventEmitter<RunsViewNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private roots: readonly RunsViewGroupNode[] = [];

  setRoots(roots: readonly RunsViewGroupNode[]): void {
    this.roots = roots;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: RunsViewNode): vscode.TreeItem {
    if (element.kind === 'group') {
      const item = new vscode.TreeItem(
        `${element.label} (${element.children.length})`,
        element.defaultExpanded
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `group:${element.id}`;
      return item;
    }

    if (element.kind === 'run') {
      const item = new vscode.TreeItem(
        element.label,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `run:${element.run.runId ?? element.run.summaryPath}`;
      item.description = element.description;
      item.contextValue = 'pinflow.run';
      item.iconPath = element.themeIconColor
        ? new vscode.ThemeIcon(element.themeIcon, new vscode.ThemeColor(element.themeIconColor))
        : new vscode.ThemeIcon(element.themeIcon);
      return item;
    }

    if (element.kind === 'evidenceFile') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.id = `evidence:${element.absolutePath}`;
      item.iconPath = new vscode.ThemeIcon('file');
      item.command = {
        command: 'pinflow.openEvidenceFile',
        title: `Open ${element.label}`,
        arguments: [element.absolutePath],
      };
      return item;
    }

    if (element.kind === 'changedFiles') {
      const item = new vscode.TreeItem(
        `Changed files (${element.count})`,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `changedFiles:${element.runSummaryPath}`;
      item.iconPath = new vscode.ThemeIcon('files');
      return item;
    }

    if (element.kind === 'changedFile') {
      const item = new vscode.TreeItem(element.relativePath, vscode.TreeItemCollapsibleState.None);
      item.id = `changedFile:${element.runSummaryPath}:${element.relativePath}`;
      item.iconPath = new vscode.ThemeIcon('file');
      return item;
    }

    if (element.kind === 'timelineMarker') {
      const item = new vscode.TreeItem('Timeline', vscode.TreeItemCollapsibleState.Collapsed);
      item.id = `timeline:${element.evidence.summaryPath}`;
      item.iconPath = new vscode.ThemeIcon('timeline-view-icon');
      return item;
    }

    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = `timelineLine:${element.label}`;
    item.iconPath = new vscode.ThemeIcon('debug-stackframe-dot');
    return item;
  }

  async getChildren(element?: RunsViewNode): Promise<readonly RunsViewNode[]> {
    if (!element) return this.roots;
    if (element.kind === 'group') return element.children;
    if (element.kind === 'run') return element.children;
    if (element.kind === 'changedFiles') return element.children;
    if (element.kind === 'timelineMarker') return expandTimelineMarker(element);
    return [];
  }
}
