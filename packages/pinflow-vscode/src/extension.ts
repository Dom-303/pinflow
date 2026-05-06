import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

import { startStandardWorkflow } from './core/commands.js';
import { formatPinFlowCliCommand } from './core/cli-command.js';
import { runWizard } from './core/onboarding/index.js';
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
  type PinFlowRunEvidence,
} from './core/run-evidence.js';
import {
  buildPerFolderState,
  expandToAllWorkspaceFolders,
  pickActiveFolder,
  type PerFolderState,
} from './core/multi-folder-state.js';
import {
  buildActionFolderGroups,
  type ActionFolderGroup,
  type ActionsViewItem,
} from './core/views/actions-view-model.js';
import { RunsWebviewProvider } from './core/views/runs-webview-provider.js';
import type { FolderStatus, RunsWebviewSettings } from './core/views/runs-webview-messages.js';
import {
  buildStatusFolderGroups,
  type StatusFolderGroup,
  type StatusViewItem,
} from './core/views/status-view-model.js';
import { getBestPinFlowWorkspaceStatus } from './core/workspace.js';
import {
  createOverlaySettingsBridge,
  type BridgeVscodeDeps,
  type OverlaySettingsBridge,
} from './core/overlay-settings-bridge.js';

const execFileAsync = promisify(execFile);

const notifiedFailedRunKeys = new Set<string>();
const openedDevUrls = new Map<string, Set<string>>();
const lastSeenDevUrls = new Map<string, string>();
const firstRefreshFolders = new Set<string>();

function clampInterval(raw: number): number {
  if (!Number.isFinite(raw)) return 3000;
  return Math.min(60000, Math.max(500, Math.floor(raw)));
}

function runInitInTerminal(cwd: string): void {
  const terminal = vscode.window.createTerminal({ name: 'PinFlow Init', cwd });
  terminal.sendText(formatPinFlowCliCommand(cwd, ['init']));
  terminal.show();
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
  let trackedFolders: readonly PerFolderState[] = [];
  let activeFolder: string | undefined = undefined;

  function readRunsWebviewSettings(): RunsWebviewSettings {
    return {
      timeFormat: vscode.workspace
        .getConfiguration('pinflow')
        .get<'24h' | '12h'>('timeFormat', '24h'),
    };
  }

  const runsWebviewProvider = new RunsWebviewProvider({
    extensionUri: context.extensionUri,
    getCurrentSnapshot: () => ({
      runsByFolder: Object.fromEntries(
        trackedFolders.map((s) => [s.folder, s.runs] as const),
      ),
      folderStatuses: Object.fromEntries(
        trackedFolders.map((s) => [
          s.folder,
          (s.status.status === 'not-configured' ? 'not-configured' : 'configured') satisfies FolderStatus,
        ] as const),
      ),
      activeFolder,
    }),
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

  function notifyFailedRunsForFolder(
    state: PerFolderState,
    config: vscode.WorkspaceConfiguration,
  ): void {
    const notifyFailed = config.get<boolean>('notifications.runFailed', true);
    const failedRuns = state.runs.filter((run) => run.summary.status === 'failed');
    const isInitial = !firstRefreshFolders.has(state.folder);
    firstRefreshFolders.add(state.folder);

    if (isInitial) {
      for (const run of failedRuns) {
        notifiedFailedRunKeys.add(run.runId ?? run.summaryPath);
      }
      return;
    }

    for (const run of failedRuns) {
      const key = run.runId ?? run.summaryPath;
      if (notifiedFailedRunKeys.has(key)) continue;
      notifiedFailedRunKeys.add(key);
      if (notifyFailed) {
        void vscode.window.showErrorMessage(
          `PinFlow run failed: ${run.annotationId ?? run.runId ?? key}`,
        );
      }
    }
  }

  function maybeFireFirstRunToast(state: PerFolderState): void {
    const root = state.status.workspaceRoot;
    if (!root) return;
    const processedRun = state.runs.find((run) => run.summary.status === 'processed');
    if (!processedRun) return;
    const key = `pinflow.firstRunSeen.${root}`;
    const seen = context.globalState.get<boolean>(key, false);
    if (seen) return;
    void context.globalState.update(key, true);
    void showFirstRunToast(processedRun);
  }

  function handleAutoBrowserForFolder(
    state: PerFolderState,
    config: vscode.WorkspaceConfiguration,
  ): void {
    const currentUrl = state.status.devServer?.url;
    const lastSeen = lastSeenDevUrls.get(state.folder);

    // pinflow dev exited or URL changed — clear the debounce so a fresh start re-triggers.
    if (lastSeen && lastSeen !== currentUrl) {
      openedDevUrls.get(state.folder)?.delete(lastSeen);
    }
    if (currentUrl) {
      lastSeenDevUrls.set(state.folder, currentUrl);
    } else {
      lastSeenDevUrls.delete(state.folder);
      return;
    }

    const autoOpen = config.get<boolean>('preview.autoOpen', true);
    if (!autoOpen) return;

    let folderUrls = openedDevUrls.get(state.folder);
    if (!folderUrls) {
      folderUrls = new Set<string>();
      openedDevUrls.set(state.folder, folderUrls);
    }
    if (folderUrls.has(currentUrl)) return;
    folderUrls.add(currentUrl);

    try {
      void vscode.env.openExternal(vscode.Uri.parse(currentUrl));
    } catch {
      // Malformed URL — silent. Preview row stays clickable.
    }
  }

  async function refreshAll(): Promise<void> {
    const workspaceFolders = getWorkspaceFolders();

    if (workspaceFolders.length === 0) {
      statusItem.text = 'PinFlow: no workspace';
      statusItem.tooltip = 'Open a workspace folder to use PinFlow.';
      statusItem.show();
      statusProvider.setFolderGroups([]);
      actionsProvider.setFolderGroups([]);
      runsWebviewProvider.postRuns({ runsByFolder: {}, folderStatuses: {}, activeFolder: undefined });
      trackedFolders = [];
      activeFolder = undefined;
      void vscode.commands.executeCommand('setContext', 'pinflow.notConfigured', false);
      return;
    }

    const config = vscode.workspace.getConfiguration('pinflow');
    const preferredFolder = config.get<string>('workspace.preferredFolder', '');

    const candidates = expandToAllWorkspaceFolders(workspaceFolders);

    const folderStates = await Promise.all(
      candidates.map((folder) => buildPerFolderState(folder)),
    );
    trackedFolders = folderStates;
    activeFolder = pickActiveFolder(folderStates, preferredFolder);

    const allUnconfigured = folderStates.every(
      (s) => s.status.status === 'not-configured',
    );
    void vscode.commands.executeCommand(
      'setContext',
      'pinflow.notConfigured',
      allUnconfigured,
    );

    const runsByFolder: Record<string, readonly PinFlowRunEvidence[]> = {};
    const folderStatuses: Record<string, FolderStatus> = {};
    for (const state of folderStates) {
      runsByFolder[state.folder] = state.runs;
      folderStatuses[state.folder] =
        state.status.status === 'not-configured' ? 'not-configured' : 'configured';
    }

    const onboardingMode = vscode.workspace
      .getConfiguration('pinflow')
      .get<'auto' | 'terminal'>('onboarding.mode', 'auto');

    statusProvider.setFolderGroups(
      buildStatusFolderGroups(folderStates, { activeFolder, externalClaim, onboardingMode }),
    );
    runsWebviewProvider.postRuns({ runsByFolder, folderStatuses, activeFolder });
    actionsProvider.setFolderGroups(
      buildActionFolderGroups(folderStates, externalClaim, activeFolder),
    );

    // Status bar shows the active folder's status.
    const activeState = folderStates.find((s) => s.folder === activeFolder);
    if (activeState) {
      statusItem.text = formatStatusText(activeState.status.status);
      statusItem.tooltip = activeState.status.message;
      statusItem.show();
    } else {
      statusItem.hide();
    }

    // Per-folder side effects — skip unconfigured folders:
    for (const state of folderStates) {
      if (state.status.status === 'not-configured') continue;
      notifyFailedRunsForFolder(state, config);
      maybeFireFirstRunToast(state);
      handleAutoBrowserForFolder(state, config);
    }
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
    vscode.commands.registerCommand('pinflow.followRuns', (folderPath?: string) => {
      const fallback = folderPath ? null : getCurrentWorkspace();
      const targetFolder = folderPath ?? fallback?.commandRoot;
      const appRoot = folderPath ?? fallback?.appRoot;
      const terminal = vscode.window.createTerminal({
        name: 'PinFlow Follow',
        cwd: targetFolder,
      });
      terminal.sendText(
        targetFolder
          ? formatPinFlowCliCommand(targetFolder, ['follow'], appRoot)
          : 'pinflow follow',
      );
      terminal.show();
    }),
    vscode.commands.registerCommand('pinflow.openLatestRun', async (folderPath?: string) => {
      const workspaceRoot = folderPath ?? getCurrentWorkspaceRoot();
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
    vscode.commands.registerCommand('pinflow.startWorkflow', (folderPath?: string) => {
      const fallback = folderPath ? null : getCurrentWorkspace();
      const commandRoot = folderPath ?? fallback?.commandRoot;
      const appRoot = folderPath ?? fallback?.appRoot;
      if (!commandRoot) {
        void vscode.window.showInformationMessage('Open a configured PinFlow workspace first.');
        return;
      }
      startStandardWorkflow(
        commandRoot,
        (name, cwd) => vscode.window.createTerminal({ name, cwd }),
        appRoot,
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
    vscode.commands.registerCommand('pinflow.runInit', async (folderPath?: unknown) => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders?.length) {
        void vscode.window.showInformationMessage(
          'Open a workspace folder to run PinFlow init.',
        );
        return;
      }
      const cwd = resolveRunInitCwd(folderPath, folders, activeFolder);
      const config = vscode.workspace.getConfiguration('pinflow');
      const mode = config.get<'auto' | 'terminal'>('onboarding.mode', 'auto');
      if (mode === 'terminal') {
        runInitInTerminal(cwd);
        return;
      }
      await runWizard(cwd, {
        onSuccess: refreshAll,
        runInitInTerminal,
      });
    }),
    vscode.commands.registerCommand(
      'pinflow.runInitInTerminal',
      (folderPath?: unknown) => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
          void vscode.window.showInformationMessage(
            'Open a workspace folder to run PinFlow init.',
          );
          return;
        }
        const cwd = resolveRunInitCwd(folderPath, folders, activeFolder);
        runInitInTerminal(cwd);
      },
    ),
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
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      for (const removed of event.removed) {
        const folderPath = removed.uri.fsPath;
        openedDevUrls.delete(folderPath);
        lastSeenDevUrls.delete(folderPath);
        firstRefreshFolders.delete(folderPath);
      }
      refreshStatus();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('pinflow.refreshIntervalMs')) {
        applyRefreshInterval();
      }
      if (event.affectsConfiguration('pinflow.timeFormat')) {
        runsWebviewProvider.postSettings(readRunsWebviewSettings());
      }
      if (event.affectsConfiguration('pinflow.onboarding.mode')) {
        void refreshAll();
      }
    }),
  );

  context.subscriptions.push({
    dispose: () => {
      if (refreshTimer) clearInterval(refreshTimer);
    },
  });

  applyRefreshInterval();

  // --- C.1.14: overlay-settings bridge ---
  // One bridge per workspace folder. Bridges are created for all folders
  // currently open, and for any folders added later via onDidChangeWorkspaceFolders.
  function makeBridgeDeps(): BridgeVscodeDeps {
    return {
      getConfiguration: () => {
        const c = vscode.workspace.getConfiguration();
        return {
          get: <T,>(key: string) => c.get<T>(key),
          update: async (key: string, value: unknown, target?: unknown) =>
            c.update(key, value, target as number | boolean | undefined),
        };
      },
      onDidChangeConfiguration: (listener) =>
        vscode.workspace.onDidChangeConfiguration((e) =>
          listener({ affectsConfiguration: (k) => e.affectsConfiguration(k) }),
        ),
      createFileSystemWatcher: (glob: string) => {
        const w = vscode.workspace.createFileSystemWatcher(glob);
        return {
          onDidChange: (l) => w.onDidChange(l),
          onDidCreate: (l) => w.onDidCreate(l),
          onDidDelete: (l) => w.onDidDelete(l),
          dispose: () => w.dispose(),
        };
      },
    };
  }

  const overlayBridges = new Map<string, OverlaySettingsBridge>();

  async function addOverlayBridge(fsPath: string): Promise<void> {
    if (overlayBridges.has(fsPath)) return;
    const bridge = createOverlaySettingsBridge({
      workspaceRoot: fsPath,
      vscode: makeBridgeDeps(),
    });
    overlayBridges.set(fsPath, bridge);
    await bridge.activate();
  }

  async function removeOverlayBridge(fsPath: string): Promise<void> {
    const bridge = overlayBridges.get(fsPath);
    if (!bridge) return;
    overlayBridges.delete(fsPath);
    await bridge.dispose();
  }

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    void addOverlayBridge(folder.uri.fsPath);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
      for (const added of event.added) {
        await addOverlayBridge(added.uri.fsPath);
      }
      for (const removed of event.removed) {
        await removeOverlayBridge(removed.uri.fsPath);
      }
    }),
    {
      dispose: () => {
        for (const bridge of overlayBridges.values()) {
          void bridge.dispose();
        }
        overlayBridges.clear();
      },
    },
  );
  // --- end C.1.14 ---

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

function resolveRunInitCwd(
  folderPath: unknown,
  workspaceFolders: readonly { uri: { fsPath: string } }[],
  active: string | undefined,
): string {
  if (typeof folderPath === 'string' && folderPath.trim()) return folderPath;
  if (active) return active;
  return workspaceFolders[0].uri.fsPath;
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

type StatusTreeNode = StatusFolderGroup | StatusViewItem;

class StatusTreeDataProvider implements vscode.TreeDataProvider<StatusTreeNode> {
  private readonly emitter = new vscode.EventEmitter<StatusTreeNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private groups: readonly StatusFolderGroup[] = [];
  private lastSignature = '';

  setFolderGroups(groups: readonly StatusFolderGroup[]): void {
    const signature = computeStatusSignature(groups);
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.groups = groups;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: StatusTreeNode): vscode.TreeItem {
    if ('children' in element) {
      const item = new vscode.TreeItem(
        element.displayName,
        element.isActive
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `folder:${element.id}`;
      item.description = `${element.runCount} run${element.runCount === 1 ? '' : 's'}`;
      item.iconPath = new vscode.ThemeIcon('folder');
      return item;
    }
    const leaf = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    leaf.id = element.id;
    leaf.description = element.description;
    leaf.tooltip = element.tooltip;
    leaf.iconPath = element.themeIconColor
      ? new vscode.ThemeIcon(element.themeIcon, new vscode.ThemeColor(element.themeIconColor))
      : new vscode.ThemeIcon(element.themeIcon);
    if (element.command) {
      leaf.command = {
        command: element.command.command,
        title: element.label,
        arguments: element.command.arguments?.slice(),
      };
    }
    return leaf;
  }

  getChildren(element?: StatusTreeNode): readonly StatusTreeNode[] {
    if (!element) return this.groups;
    if ('children' in element) return element.children;
    return [];
  }
}

function computeStatusSignature(groups: readonly StatusFolderGroup[]): string {
  // JSON keeps the format unambiguous if a folder path contains `,` or `|`.
  return JSON.stringify(
    groups.map((g) => [
      g.id,
      g.runCount,
      g.isActive,
      g.children.map((c) => [c.id, c.description ?? '']),
    ]),
  );
}

type ActionsTreeNode = ActionFolderGroup | ActionsViewItem;

class ActionsTreeDataProvider implements vscode.TreeDataProvider<ActionsTreeNode> {
  private readonly emitter = new vscode.EventEmitter<ActionsTreeNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private groups: readonly ActionFolderGroup[] = [];
  private lastSignature = '';

  setFolderGroups(groups: readonly ActionFolderGroup[]): void {
    const signature = computeActionsSignature(groups);
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.groups = groups;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: ActionsTreeNode): vscode.TreeItem {
    if ('children' in element) {
      const item = new vscode.TreeItem(
        element.displayName,
        element.isActive
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `folder:${element.id}`;
      item.iconPath = new vscode.ThemeIcon('folder');
      return item;
    }
    const leaf = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    leaf.id = element.id;
    leaf.iconPath = new vscode.ThemeIcon(element.themeIcon);
    leaf.command = {
      command: element.command,
      title: element.label,
      arguments: element.commandArguments?.slice(),
    };
    return leaf;
  }

  getChildren(element?: ActionsTreeNode): readonly ActionsTreeNode[] {
    if (!element) return this.groups;
    if ('children' in element) return element.children;
    return [];
  }
}

function computeActionsSignature(groups: readonly ActionFolderGroup[]): string {
  return JSON.stringify(
    groups.map((g) => [
      g.id,
      g.isActive,
      g.children.map((c) => [c.id, c.commandArguments ?? []]),
    ]),
  );
}
