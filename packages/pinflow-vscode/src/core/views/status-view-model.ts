import path from 'node:path';

import type { ExternalHandoffClaim } from '../external-handoff.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';
import type { PinFlowWorkspaceResult } from '../workspace.js';

export type StatusItemId = 'relay' | 'runner' | 'workspace' | 'externalClaim';

export interface StatusViewItem {
  readonly id: StatusItemId;
  readonly label: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly themeIcon: string;
  readonly themeIconColor?: string;
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
): readonly StatusViewItem[] {
  const items: StatusViewItem[] = [
    buildRelayItem(status),
    buildRunnerItem(latestRun ?? null),
    buildWorkspaceItem(status),
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

function buildWorkspaceItem(status: PinFlowWorkspaceResult): StatusViewItem {
  const appRoot = status.appRoot ?? status.workspaceFolder;
  const isDemoFixture = appRoot.endsWith(DEMO_FIXTURE_SUFFIX);
  return {
    id: 'workspace',
    label: 'Workspace',
    description: isDemoFixture ? 'Demo Fixture' : path.basename(appRoot),
    tooltip: appRoot,
    themeIcon: 'folder',
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
