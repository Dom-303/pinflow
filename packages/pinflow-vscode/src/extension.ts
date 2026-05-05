import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

import { startStandardWorkflow } from './core/commands.js';
import { formatPinFlowCliCommand } from './core/cli-command.js';
import { buildFolderCandidates } from './core/folder-picker.js';
import { openLatestRunEvidence } from './core/evidence-commands.js';
import {
  claimExternalHandoff,
  completeExternalHandoff,
  failExternalHandoff,
  type ExternalHandoffActions,
  type ExternalHandoffClaim,
} from './core/external-handoff.js';
import {
  findRunEvidence,
  type PinFlowRunEvidence,
} from './core/run-evidence.js';
import {
  buildActionsViewItems,
  type ActionsViewItem,
} from './core/views/actions-view-model.js';
import { RunsWebviewProvider } from './core/views/runs-webview-provider.js';
import type { RunsWebviewSettings } from './core/views/runs-webview-messages.js';
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
  const actionsProvider = new ActionsTreeDataProvider();
  let externalClaim: ExternalHandoffClaim | null = null;
  let latestRunEvidence: readonly PinFlowRunEvidence[] = [];

  function readRunsWebviewSettings(): RunsWebviewSettings {
    return {
      timeFormat: vscode.workspace
        .getConfiguration('pinflow')
        .get<'24h' | '12h'>('timeFormat', '24h'),
    };
  }

  const runsWebviewProvider = new RunsWebviewProvider({
    extensionUri: context.extensionUri,
    getCurrentRuns: () => latestRunEvidence,
    getCurrentSettings: readRunsWebviewSettings,
    onOpenPrompt: (run) => {
      if (run.promptPath) {
        void vscode.commands.executeCommand(
          'pinflow.openEvidenceFile',
          run.promptPath,
        );
      }
    },
  });

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('pinflow.status', statusProvider),
    vscode.window.registerWebviewViewProvider(
      'pinflow.runs',
      runsWebviewProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
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
      latestRunEvidence = [];
      runsWebviewProvider.postRuns([]);
      actionsProvider.setItems(buildActionsViewItems(externalClaim));
      void vscode.commands.executeCommand(
        'setContext',
        'pinflow.notConfigured',
        false,
      );
      return;
    }

    const config = vscode.workspace.getConfiguration('pinflow');
    const preferredFolder = config.get<string>('workspace.preferredFolder', '');
    const workspaceStatus = getBestPinFlowWorkspaceStatus(workspaceFolders, {
      preferredFolder: preferredFolder.trim() || undefined,
    });
    if (!workspaceStatus) {
      void vscode.commands.executeCommand(
        'setContext',
        'pinflow.notConfigured',
        false,
      );
      return;
    }

    void vscode.commands.executeCommand(
      'setContext',
      'pinflow.notConfigured',
      workspaceStatus.status === 'not-configured',
    );

    statusItem.text = formatStatusText(workspaceStatus.status);
    statusItem.tooltip = workspaceStatus.message;
    statusItem.show();

    const runEvidence = workspaceStatus.workspaceRoot
      ? await findRunEvidence(workspaceStatus.workspaceRoot, { limit: RUN_EVIDENCE_LIMIT })
      : [];
    latestRunEvidence = runEvidence;

    const workspaceFolderIndex = workspaceFolders.findIndex(
      (folder) => folder === workspaceStatus.workspaceFolder,
    );
    statusProvider.setItems(
      buildStatusViewItems(workspaceStatus, externalClaim, runEvidence[0] ?? null, {
        workspaceFolderCount: workspaceFolders.length,
        workspaceFolderIndex:
          workspaceFolderIndex >= 0 ? workspaceFolderIndex : undefined,
      }),
    );
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

    const processedRun = runEvidence.find(
      (run) => run.summary.status === 'processed',
    );
    if (processedRun && workspaceStatus.workspaceRoot) {
      const firstRunKey = `pinflow.firstRunSeen.${workspaceStatus.workspaceRoot}`;
      const seen = context.globalState.get<boolean>(firstRunKey, false);
      if (!seen) {
        void context.globalState.update(firstRunKey, true);
        void showFirstRunToast(processedRun);
      }
    }

    runsWebviewProvider.postRuns(runEvidence);
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
    vscode.commands.registerCommand('pinflow.switchFolder', async () => {
      const folders = getWorkspaceFolders();
      if (folders.length === 0) {
        void vscode.window.showInformationMessage(
          'Open a workspace folder first.',
        );
        return;
      }
      const config = vscode.workspace.getConfiguration('pinflow');
      const preferredFolder = config.get<string>('workspace.preferredFolder', '');
      const candidates = buildFolderCandidates(folders, {
        preferredFolder: preferredFolder.trim() || undefined,
      });
      if (candidates.length === 0) {
        void vscode.window.showInformationMessage(
          'No workspace folder candidates available.',
        );
        return;
      }
      const items = candidates.map((c) => ({
        label: c.displayName,
        description: c.fsPath,
        detail: `${statusIcon(c.status)} ${statusLabel(c.status)}${c.isActive ? ' · current' : ''}`,
        candidate: c,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        title: 'Switch PinFlow Workspace Folder',
        placeHolder: 'Choose a folder to track',
      });
      if (!picked) return;
      if (picked.candidate.isActive) return;
      await config.update(
        'workspace.preferredFolder',
        picked.candidate.fsPath,
        vscode.ConfigurationTarget.Workspace,
      );
      refreshStatus();
    }),
    vscode.commands.registerCommand('pinflow.runInit', () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders?.length) {
        void vscode.window.showInformationMessage(
          'Open a workspace folder to run PinFlow init.',
        );
        return;
      }
      const cwd = folders[0].uri.fsPath;
      const terminal = vscode.window.createTerminal({
        name: 'PinFlow Init',
        cwd,
      });
      terminal.sendText(formatPinFlowCliCommand(cwd, ['init']));
      terminal.show();
    }),
    vscode.commands.registerCommand('pinflow.openDocumentation', () => {
      void vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/Dom-303/pinflow#readme'),
      );
    }),
    vscode.commands.registerCommand(
      'pinflow.openPreview',
      async (url: unknown) => {
        if (typeof url !== 'string' || !url.trim()) return;
        try {
          await vscode.env.openExternal(vscode.Uri.parse(url));
        } catch {
          void vscode.window.showInformationMessage(
            'Could not open preview URL.',
          );
        }
      },
    ),
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
    vscode.workspace.onDidChangeWorkspaceFolders(refreshStatus),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('pinflow.refreshIntervalMs')) {
        applyRefreshInterval();
      }
      if (event.affectsConfiguration('pinflow.timeFormat')) {
        runsWebviewProvider.postSettings(readRunsWebviewSettings());
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

async function showFirstRunToast(run: PinFlowRunEvidence): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    `Erster PinFlow-Run abgeschlossen: ${run.annotationId ?? run.runId ?? 'unknown'}`,
    'Run öffnen',
    'OK',
  );
  if (choice === 'Run öffnen' && run.promptPath) {
    await vscode.window.showTextDocument(vscode.Uri.file(run.promptPath));
  }
}

function formatStatusText(status: string): string {
  if (status === 'ready') return 'PinFlow: ready';
  if (status === 'relay-missing') return 'PinFlow: relay missing';
  return 'PinFlow: not configured';
}

function statusIcon(status: 'ready' | 'relay-missing' | 'not-configured'): string {
  if (status === 'ready') return '$(check)';
  if (status === 'relay-missing') return '$(circle-outline)';
  return '$(circle-slash)';
}

function statusLabel(status: 'ready' | 'relay-missing' | 'not-configured'): string {
  if (status === 'ready') return 'configured + relay running';
  if (status === 'relay-missing') return 'configured';
  return 'not configured';
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
    if (element.command) {
      item.command = {
        command: element.command.command,
        title: element.label,
        arguments: element.command.arguments?.slice(),
      };
    }
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

