import path from 'node:path';

import {
  findLatestRunEvidence,
  type PinFlowRunEvidence,
  type PinFlowRunSummary,
} from './run-evidence.js';
import type { PinFlowWorkspaceResult } from './workspace.js';

export interface PinFlowPanelItem {
  readonly label: string;
  readonly description?: string;
  readonly command?: {
    readonly command: string;
    readonly title: string;
    readonly arguments?: readonly unknown[];
  };
}

export async function buildPinFlowPanelItems(
  status: PinFlowWorkspaceResult,
): Promise<PinFlowPanelItem[]> {
  if (status.status === 'not-configured') {
    return [
      { label: status.message },
      { label: 'Run pinflow init in this workspace' },
    ];
  }

  const latestRun = status.workspaceRoot
    ? await findLatestRunEvidence(status.workspaceRoot)
    : null;

  if (status.status === 'relay-missing') {
    return [
      { label: 'Relay missing' },
      { label: runnerLabel(latestRun?.summary ?? null) },
      {
        label: latestRun
          ? latestRunLabel(latestRun.summary)
          : 'No run evidence yet',
      },
      ...buildEvidenceItems(latestRun, status.workspaceRoot),
      { label: 'Start with PinFlow: Start Workflow' },
    ];
  }

  return [
    {
      label: status.relay
        ? `Relay ready at ${status.relay.host}:${status.relay.port}`
        : 'Relay ready',
    },
    { label: runnerLabel(latestRun?.summary ?? null) },
    {
      label: latestRun ? latestRunLabel(latestRun.summary) : 'No run evidence yet',
    },
    {
      label: latestRun?.hasDiff
        ? diffEvidenceLabel(latestRun)
        : 'No diff yet',
    },
    ...buildEvidenceItems(latestRun, status.workspaceRoot),
  ];
}

function runnerLabel(summary: PinFlowRunSummary | null): string {
  if (!summary) return 'Runner idle';

  return `Runner ${formatRunStatus(summary.status)} via ${
    summary.provider ?? 'unknown'
  }`;
}

function latestRunLabel(summary: PinFlowRunSummary): string {
  return `Latest run: ${summary.annotationId ?? 'unknown annotation'}`;
}

function formatRunStatus(status?: string): string {
  if (status === 'processed') return 'done';
  if (status === 'processing') return 'working';
  if (status === 'failed') return 'failed';
  return status ?? 'unknown';
}

function diffEvidenceLabel(evidence: PinFlowRunEvidence): string {
  const fileLabel =
    evidence.changedFiles.length === 1
      ? '1 file'
      : `${evidence.changedFiles.length} files`;

  return `Repo diff exists: ${fileLabel}, +${evidence.additions} -${evidence.deletions}`;
}

function buildEvidenceItems(
  evidence: PinFlowRunEvidence | null,
  workspaceRoot?: string,
): PinFlowPanelItem[] {
  if (!evidence) return [];

  const items: PinFlowPanelItem[] = [
    evidence.promptPath
      ? fileItem('Open prompt.md', evidence.promptPath)
      : null,
    evidence.transcriptPath
      ? fileItem('Open transcript.log', evidence.transcriptPath)
      : null,
    evidence.diffPath ? fileItem('Open diff.patch', evidence.diffPath) : null,
    ...evidence.changedFiles.map((file) =>
      fileItem('Changed: ' + file.path, path.join(workspaceRoot ?? '', file.path)),
    ),
  ].filter((item): item is PinFlowPanelItem => Boolean(item));

  return items;
}

function fileItem(label: string, filePath: string): PinFlowPanelItem {
  return {
    label,
    command: {
      command: 'pinflow.openEvidenceFile',
      title: label,
      arguments: [filePath],
    },
  };
}
