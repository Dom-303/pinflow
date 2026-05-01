import { readdir, readFile } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';

import type { PinFlowWorkspaceResult } from './workspace.js';

export interface PinFlowPanelItem {
  readonly label: string;
  readonly description?: string;
}

interface RunSummary {
  readonly annotationId?: string;
  readonly status?: string;
  readonly provider?: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly diffPath?: string;
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
    ? await findLatestRunSummary(status.workspaceRoot)
    : null;

  if (status.status === 'relay-missing') {
    return [
      { label: 'Relay missing' },
      { label: runnerLabel(latestRun) },
      { label: latestRun ? latestRunLabel(latestRun) : 'No run evidence yet' },
      { label: 'Start with PinFlow: Start Workflow' },
    ];
  }

  return [
    {
      label: status.relay
        ? `Relay ready at ${status.relay.host}:${status.relay.port}`
        : 'Relay ready',
    },
    { label: runnerLabel(latestRun) },
    { label: latestRun ? latestRunLabel(latestRun) : 'No run evidence yet' },
    { label: latestRun?.diffPath ? 'Diff evidence recorded' : 'No diff yet' },
  ];
}

async function findLatestRunSummary(
  workspaceRoot: string,
): Promise<RunSummary | null> {
  const summaryPaths = await findSummaryFiles(
    path.join(workspaceRoot, '.pinflow', 'runs'),
  );
  const summaries: RunSummary[] = [];

  for (const summaryPath of summaryPaths) {
    try {
      summaries.push(JSON.parse(await readFile(summaryPath, 'utf8')) as RunSummary);
    } catch {
      // Ignore partially written run evidence.
    }
  }

  summaries.sort((left, right) => summaryTime(right) - summaryTime(left));

  return summaries[0] ?? null;
}

async function findSummaryFiles(dir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findSummaryFiles(entryPath)));
    } else if (entry.isFile() && entry.name === 'summary.json') {
      files.push(entryPath);
    }
  }

  return files;
}

function summaryTime(summary: RunSummary): number {
  return new Date(summary.finishedAt ?? summary.startedAt ?? 0).getTime();
}

function runnerLabel(summary: RunSummary | null): string {
  if (!summary) return 'Runner idle';

  return `Runner ${formatRunStatus(summary.status)} via ${
    summary.provider ?? 'unknown'
  }`;
}

function latestRunLabel(summary: RunSummary): string {
  return `Latest run: ${summary.annotationId ?? 'unknown annotation'}`;
}

function formatRunStatus(status?: string): string {
  if (status === 'processed') return 'done';
  if (status === 'processing') return 'working';
  if (status === 'failed') return 'failed';
  return status ?? 'unknown';
}
