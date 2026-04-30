import { readdir, readFile } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import type { Writable } from 'node:stream';

import {
  dedupeConciseOutput,
  formatConciseChunk,
  type RunOutputMode,
} from '../../runner/output-format.js';

interface RunSummary {
  annotationId?: string;
  runId?: string;
  runDir?: string;
  status?: string;
  provider?: string;
  label?: string;
  startedAt?: string;
  finishedAt?: string;
  transcriptPath?: string;
  diffPath?: string;
  command?: {
    command?: string;
    args?: string[];
  };
}

export interface LatestRun {
  summary: RunSummary;
  summaryPath: string;
  transcriptPath: string | null;
}

export interface FollowRunLogOptions {
  workspaceRoot: string;
  pollMs?: number;
  mode?: RunOutputMode;
  stdout?: Pick<Writable, 'write'>;
  stderr?: Pick<Writable, 'write'>;
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

function resolveWorkspacePath(
  workspaceRoot: string,
  filePath?: string,
): string | null {
  if (!filePath) return null;
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
}

function runTime(summary: RunSummary): number {
  return new Date(summary.finishedAt ?? summary.startedAt ?? 0).getTime();
}

function extractModel(summary: RunSummary): string | undefined {
  const args = summary.command?.args ?? [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === '-m' || arg === '--model') && args[index + 1]) {
      return args[index + 1];
    }
    if (arg.startsWith('--model=')) {
      return arg.slice('--model='.length);
    }
  }
  return undefined;
}

export async function findLatestRun(
  workspaceRoot: string,
): Promise<LatestRun | null> {
  const files = await findSummaryFiles(
    path.join(workspaceRoot, '.pinflow', 'runs'),
  );
  const summaries: Array<{ summary: RunSummary; summaryPath: string }> = [];

  for (const summaryPath of files) {
    try {
      summaries.push({
        summary: JSON.parse(await readFile(summaryPath, 'utf8')) as RunSummary,
        summaryPath,
      });
    } catch {
      // Ignore partially written or malformed summaries.
    }
  }

  summaries.sort(
    (left, right) => runTime(right.summary) - runTime(left.summary),
  );
  const latest = summaries[0];
  if (!latest) return null;

  return {
    ...latest,
    transcriptPath: resolveWorkspacePath(
      workspaceRoot,
      latest.summary.transcriptPath,
    ),
  };
}

export function formatLatestRun(
  run: LatestRun,
  mode: RunOutputMode | 'full' = 'full',
): string {
  const model = extractModel(run.summary);
  if (mode === 'concise') {
    return [
      `[pinflow] Latest: ${formatStatus(run.summary.status)} · ${formatProvider(
        run.summary.provider,
        model,
      )}`,
      '[pinflow] Full details: pinflow follow --raw',
      '',
    ].join('\n');
  }

  const lines = [
    `[pinflow-runs] Run: ${run.summary.runDir ?? run.summaryPath}`,
    `[pinflow-runs] Annotation: ${run.summary.annotationId ?? 'unknown'}`,
    `[pinflow-runs] Status: ${run.summary.status ?? 'unknown'}`,
    `[pinflow-runs] Provider: ${run.summary.provider ?? 'unknown'}${
      model ? ` (${model})` : ''
    }`,
    run.summary.diffPath ? `[pinflow-runs] Diff: ${run.summary.diffPath}` : '',
  ].filter(Boolean);
  return `${lines.join('\n')}\n\n`;
}

function formatStatus(status?: string): string {
  if (status === 'processed') return 'done';
  if (status === 'processing') return 'working';
  if (status === 'failed') return 'failed';
  return status ?? 'unknown';
}

function formatProvider(provider?: string, model?: string): string {
  return [provider ?? 'unknown', model].filter(Boolean).join('/');
}

export async function followLatestRunLog(
  options: FollowRunLogOptions,
): Promise<void> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const pollMs = Math.max(250, options.pollMs ?? 1000);
  const mode = options.mode ?? 'concise';
  let currentTranscriptPath: string | null = null;
  let offset = 0;
  let announcedWaiting = false;
  let pendingLine = '';
  let seenConciseLines = new Set<string>();

  for (;;) {
    const latest = await findLatestRun(options.workspaceRoot);
    if (!latest?.transcriptPath) {
      if (!announcedWaiting) {
        stderr.write('[pinflow-runs] Waiting for run evidence ...\n');
        announcedWaiting = true;
      }
      await sleep(pollMs);
      continue;
    }

    if (latest.transcriptPath !== currentTranscriptPath) {
      currentTranscriptPath = latest.transcriptPath;
      offset = 0;
      pendingLine = '';
      seenConciseLines = new Set<string>();
      if (mode === 'concise') {
        stdout.write(formatLatestRun(latest, 'concise'));
      } else {
        stdout.write(formatLatestRun(latest));
      }
    }

    try {
      const transcript = await readFile(latest.transcriptPath, 'utf8');
      if (transcript.length > offset) {
        const nextChunk = transcript.slice(offset);
        if (mode === 'raw') {
          stdout.write(nextChunk);
        } else {
          const formatted = formatConciseChunk(pendingLine + nextChunk);
          pendingLine = formatted.pendingLine;
          const output = dedupeConciseOutput(
            formatted.output,
            seenConciseLines,
          );
          if (output) {
            stdout.write(output);
          }
        }
        offset = transcript.length;
      }
    } catch {
      // The run directory can appear before the transcript is flushed.
    }

    await sleep(pollMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
