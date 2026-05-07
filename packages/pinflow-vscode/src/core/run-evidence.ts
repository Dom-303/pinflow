import { access, readdir, readFile } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';

export interface PinFlowRunSummary {
  readonly annotationId?: string;
  readonly runId?: string;
  readonly runDir?: string;
  readonly status?: string;
  readonly provider?: string;
  readonly label?: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly promptPath?: string;
  readonly transcriptPath?: string;
  readonly diffPath?: string;
}

export interface PinFlowChangedFile {
  readonly path: string;
}

export interface PinFlowRunEvidence {
  readonly annotationId?: string;
  readonly runId?: string;
  readonly summary: PinFlowRunSummary;
  readonly summaryPath: string;
  readonly promptPath: string | null;
  readonly transcriptPath: string | null;
  readonly diffPath: string | null;
  readonly hasDiff: boolean;
  readonly changedFiles: PinFlowChangedFile[];
  readonly additions: number;
  readonly deletions: number;
}

export interface FindRunEvidenceOptions {
  readonly limit?: number;
}

export async function findRunEvidence(
  workspaceRoot: string,
  options: FindRunEvidenceOptions = {},
): Promise<PinFlowRunEvidence[]> {
  const summaryPaths = await findSummaryFiles(
    path.join(workspaceRoot, '.pinflow', 'runs'),
  );
  const summaries: Array<{ summary: PinFlowRunSummary; summaryPath: string }> = [];

  for (const summaryPath of summaryPaths) {
    try {
      summaries.push({
        summary: JSON.parse(await readFile(summaryPath, 'utf8')) as PinFlowRunSummary,
        summaryPath,
      });
    } catch {
      // Ignore partially written run evidence.
    }
  }

  summaries.sort((left, right) => summaryTime(right.summary) - summaryTime(left.summary));

  const capped = options.limit !== undefined ? summaries.slice(0, options.limit) : summaries;
  const evidence: PinFlowRunEvidence[] = [];
  for (const entry of capped) {
    evidence.push(await buildEvidence(workspaceRoot, entry));
  }
  return evidence;
}

export async function findLatestRunEvidence(
  workspaceRoot: string,
): Promise<PinFlowRunEvidence | null> {
  const [latest = null] = await findRunEvidence(workspaceRoot, { limit: 1 });
  return latest;
}

async function buildEvidence(
  workspaceRoot: string,
  entry: { summary: PinFlowRunSummary; summaryPath: string },
): Promise<PinFlowRunEvidence> {
  const runDir = path.dirname(entry.summaryPath);
  const promptPath = await resolveExistingRunPath(workspaceRoot, runDir, entry.summary.promptPath, 'prompt.md');
  const transcriptPath = await resolveExistingRunPath(workspaceRoot, runDir, entry.summary.transcriptPath, 'transcript.log');
  const diffPath = await resolveExistingRunPath(workspaceRoot, runDir, entry.summary.diffPath, 'diff.patch');
  const diff = diffPath ? await readFile(diffPath, 'utf8').catch(() => '') : '';
  const parsedDiff = parseDiff(diff);

  return {
    annotationId: entry.summary.annotationId,
    runId: entry.summary.runId,
    summary: entry.summary,
    summaryPath: entry.summaryPath,
    promptPath,
    transcriptPath,
    diffPath,
    ...parsedDiff,
  };
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

async function resolveExistingRunPath(
  workspaceRoot: string,
  runDir: string,
  filePath: string | undefined,
  fallbackName: string,
): Promise<string | null> {
  const candidates = [
    filePath ? resolveWorkspacePath(workspaceRoot, filePath) : null,
    path.join(runDir, fallbackName),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveWorkspacePath(workspaceRoot: string, filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
}

function summaryTime(summary: PinFlowRunSummary): number {
  return new Date(summary.finishedAt ?? summary.startedAt ?? 0).getTime();
}

export function parseDiff(diff: string): {
  hasDiff: boolean;
  changedFiles: PinFlowChangedFile[];
  additions: number;
  deletions: number;
} {
  const changedFiles = new Set<string>();
  let additions = 0;
  let deletions = 0;

  for (const line of diff.split('\n')) {
    const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (match) {
      changedFiles.add(match[2]);
      continue;
    }

    if (line.startsWith('+++') || line.startsWith('---')) continue;

    if (line.startsWith('+')) additions += 1;
    if (line.startsWith('-')) deletions += 1;
  }

  return {
    hasDiff: diff.trim().length > 0,
    changedFiles: Array.from(changedFiles).map((filePath) => ({
      path: filePath,
    })),
    additions,
    deletions,
  };
}
