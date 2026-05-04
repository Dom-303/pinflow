import path from 'node:path';

import type { ExternalHandoffClaim } from '../external-handoff.js';
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
      tooltip: status.message,
      themeIcon: 'circle-filled',
      themeIconColor: 'charts.yellow',
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

function buildRunnerItem(latestRun: PinFlowRunEvidence | null): StatusViewItem {
  const summary = latestRun?.summary;
  if (!summary) {
    return { id: 'runner', label: 'Runner', description: 'idle', themeIcon: 'circle-outline' };
  }
  const provider = summary.provider ?? 'unknown';
  if (summary.status === 'processing') {
    return { id: 'runner', label: 'Runner', description: `via ${provider}`, themeIcon: 'loading~spin' };
  }
  if (summary.status === 'failed') {
    return {
      id: 'runner',
      label: 'Runner',
      description: `via ${provider}`,
      themeIcon: 'error',
      themeIconColor: 'charts.red',
    };
  }
  if (summary.status === 'processed') {
    return {
      id: 'runner',
      label: 'Runner',
      description: `via ${provider}`,
      themeIcon: 'check',
      themeIconColor: 'charts.green',
    };
  }
  return {
    id: 'runner',
    label: 'Runner',
    description: `via ${provider}`,
    themeIcon: 'circle-outline',
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
  };
}

function buildWorkspaceTooltip(
  appRoot: string,
  options: BuildStatusViewItemsOptions,
): string {
  const count = options.workspaceFolderCount ?? 1;
  const index = options.workspaceFolderIndex;
  if (count <= 1 || index === undefined || index < 0 || index >= count) {
    return appRoot;
  }
  return `${appRoot}\n${index + 1} of ${count} workspace folders`;
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
