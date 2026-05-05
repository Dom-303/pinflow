import path from 'node:path';

import type { ExternalHandoffClaim } from '../external-handoff.js';
import type { PerFolderState } from '../multi-folder-state.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';
import type { PinFlowWorkspaceResult } from '../workspace.js';

export type StatusItemId =
  | 'relay'
  | 'runner'
  | 'workspace'
  | 'preview'
  | 'externalClaim';

export interface BuildStatusViewItemsOptions {
  readonly workspaceFolderCount?: number;
  readonly workspaceFolderIndex?: number;
}

export interface StatusViewItem {
  readonly id: StatusItemId;
  readonly label: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly themeIcon: string;
  readonly themeIconColor?: string;
  readonly command?: {
    readonly command: string;
    readonly arguments?: readonly unknown[];
  };
}

const DEMO_FIXTURE_SUFFIX = path.join(
  'packages',
  'pinflow-test-fixtures',
  'fixtures',
  'vite',
  'v5',
  'react-18-ts',
);

export function buildStatusViewItems(
  status: PinFlowWorkspaceResult,
  externalClaim: ExternalHandoffClaim | null,
  latestRun?: PinFlowRunEvidence | null,
  options: BuildStatusViewItemsOptions = {},
): readonly StatusViewItem[] {
  const items: StatusViewItem[] = [
    buildRelayItem(status),
    buildRunnerItem(latestRun ?? null),
    buildWorkspaceItem(status, options),
    buildPreviewItem(status.devServer),
  ];
  if (externalClaim) items.push(buildExternalClaimItem(externalClaim));
  return items;
}

function buildRelayItem(status: PinFlowWorkspaceResult): StatusViewItem {
  if (status.status === 'ready' && status.relay) {
    return {
      id: 'relay',
      label: 'Relay',
      description: `${status.relay.host}:${status.relay.port}`,
      tooltip: status.workspaceFolder,
      themeIcon: 'circle-filled',
      themeIconColor: 'charts.green',
    };
  }
  if (status.status === 'relay-missing') {
    return {
      id: 'relay',
      label: 'Relay',
      description: 'missing',
      tooltip: `${status.message}\nClick to start the workflow (relay + dev + agent)`,
      themeIcon: 'circle-filled',
      themeIconColor: 'charts.yellow',
      command: {
        command: 'pinflow.startWorkflow',
        arguments: [],
      },
    };
  }
  return {
    id: 'relay',
    label: 'Relay',
    description: 'not configured',
    tooltip: status.message,
    themeIcon: 'circle-outline',
  };
}

const RUNNER_COMMAND = {
  command: 'workbench.action.openSettings',
  arguments: ['pinflow.externalHandoff.defaultProvider'],
} as const;

function buildRunnerItem(latestRun: PinFlowRunEvidence | null): StatusViewItem {
  const summary = latestRun?.summary;
  const tooltip = 'Click to change the default provider in settings';
  if (!summary) {
    return {
      id: 'runner',
      label: 'Runner',
      description: 'idle',
      tooltip,
      themeIcon: 'circle-outline',
      command: RUNNER_COMMAND,
    };
  }
  const provider = summary.provider ?? 'unknown';
  if (summary.status === 'processing') {
    return {
      id: 'runner',
      label: 'Runner',
      description: `via ${provider}`,
      tooltip,
      themeIcon: 'loading~spin',
      command: RUNNER_COMMAND,
    };
  }
  if (summary.status === 'failed') {
    return {
      id: 'runner',
      label: 'Runner',
      description: `via ${provider}`,
      tooltip,
      themeIcon: 'error',
      themeIconColor: 'charts.red',
      command: RUNNER_COMMAND,
    };
  }
  if (summary.status === 'processed') {
    return {
      id: 'runner',
      label: 'Runner',
      description: `via ${provider}`,
      tooltip,
      themeIcon: 'check',
      themeIconColor: 'charts.green',
      command: RUNNER_COMMAND,
    };
  }
  return {
    id: 'runner',
    label: 'Runner',
    description: `via ${provider}`,
    tooltip,
    themeIcon: 'circle-outline',
    command: RUNNER_COMMAND,
  };
}

function buildWorkspaceItem(
  status: PinFlowWorkspaceResult,
  options: BuildStatusViewItemsOptions,
): StatusViewItem {
  const appRoot = status.appRoot ?? status.workspaceFolder;
  const isDemoFixture = appRoot.endsWith(DEMO_FIXTURE_SUFFIX);
  const description = isDemoFixture ? 'Demo Fixture' : path.basename(appRoot);

  const tooltip = buildWorkspaceTooltip(appRoot, options);

  return {
    id: 'workspace',
    label: 'Workspace',
    description,
    tooltip,
    themeIcon: 'folder',
    command: {
      command: 'pinflow.switchFolder',
      arguments: [],
    },
  };
}

function buildWorkspaceTooltip(
  appRoot: string,
  options: BuildStatusViewItemsOptions,
): string {
  const count = options.workspaceFolderCount ?? 1;
  const index = options.workspaceFolderIndex;
  if (count <= 1 || index === undefined || index < 0 || index >= count) {
    return `${appRoot}\nClick to switch folder`;
  }
  return `${appRoot}\n${index + 1} of ${count} workspace folders\nClick to switch folder`;
}

function buildPreviewItem(
  devServer: PinFlowWorkspaceResult['devServer'],
): StatusViewItem {
  if (!devServer) {
    return {
      id: 'preview',
      label: 'Preview',
      description: 'not running',
      tooltip: 'No dev server detected. Start with PinFlow: Start Workflow.',
      themeIcon: 'circle-outline',
    };
  }
  return {
    id: 'preview',
    label: 'Preview',
    description: `${devServer.host}:${devServer.port}`,
    tooltip: devServer.url,
    themeIcon: 'circle-filled',
    themeIconColor: 'charts.green',
    command: {
      command: 'pinflow.openPreview',
      arguments: [devServer.url],
    },
  };
}

function buildExternalClaimItem(claim: ExternalHandoffClaim): StatusViewItem {
  return {
    id: 'externalClaim',
    label: 'External Claim',
    description: claim.annotationId,
    tooltip: claim.label ?? claim.annotationId,
    themeIcon: 'bookmark',
  };
}

export interface StatusFolderGroup {
  readonly id: string;
  readonly displayName: string;
  readonly runCount: number;
  readonly isActive: boolean;
  readonly children: readonly StatusViewItem[];
}

export interface BuildStatusFolderGroupsOptions {
  readonly activeFolder?: string;
  readonly externalClaim?: ExternalHandoffClaim | null;
}

export function buildStatusFolderGroups(
  folders: readonly PerFolderState[],
  options: BuildStatusFolderGroupsOptions = {},
): readonly StatusFolderGroup[] {
  return folders.map((state) => ({
    id: state.folder,
    displayName: path.basename(state.folder),
    runCount: state.runs.length,
    isActive: state.folder === options.activeFolder,
    children: buildStatusViewItems(
      state.status,
      options.externalClaim ?? null,
      state.runs[0] ?? null,
    ),
  }));
}
