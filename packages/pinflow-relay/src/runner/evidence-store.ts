import type { Dirent } from 'node:fs';
import {
  mkdir,
  writeFile,
  appendFile,
  readFile,
  readdir,
} from 'node:fs/promises';
import path from 'node:path';
import type { RunnerCommandConfig } from './runner.js';

export type RunEvidenceStatus =
  | 'claimed'
  | 'processing'
  | 'processed'
  | 'failed';

export interface RunEvidenceCreateInput {
  annotationId: string;
  provider: string;
  label: string;
  workspaceRoot: string;
  command: RunnerCommandConfig;
  userIntent?: string;
  sourceLocation?: {
    file?: string;
    line?: number | null;
    column?: number | null;
    componentName?: string;
    tagName?: string;
  };
}

export interface RunEvidenceSummary extends RunEvidenceCreateInput {
  runId: string;
  runDir: string;
  status: RunEvidenceStatus;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  errorDetails?: string;
  promptPath: string;
  contextPath: string;
  transcriptPath: string;
  diffPath: string;
}

export interface RunEvidenceRecorder {
  readonly paths: {
    runId: string;
    runDir: string;
    promptPath: string;
    contextPath: string;
    transcriptPath: string;
    diffPath: string;
    summaryPath: string;
  };
  writePrompt(prompt: string): Promise<void>;
  writeContext(context: unknown): Promise<void>;
  appendTranscript(message: string): Promise<void>;
  writeDiff(diff: string): Promise<void>;
  updateSummary(
    patch: Partial<
      Pick<
        RunEvidenceSummary,
        'status' | 'finishedAt' | 'exitCode' | 'errorDetails'
      >
    >,
  ): Promise<void>;
}

export interface RunEvidenceStore {
  createRun(input: RunEvidenceCreateInput): Promise<RunEvidenceRecorder>;
}

export interface RunEvidenceChangedFile {
  path: string;
}

export interface RunEvidenceView extends Pick<
  RunEvidenceSummary,
  | 'annotationId'
  | 'runId'
  | 'runDir'
  | 'status'
  | 'provider'
  | 'label'
  | 'startedAt'
  | 'finishedAt'
  | 'exitCode'
  | 'errorDetails'
  | 'promptPath'
  | 'contextPath'
  | 'transcriptPath'
  | 'diffPath'
> {
  model?: string;
  hasDiff: boolean;
  changedFiles: RunEvidenceChangedFile[];
  additions: number;
  deletions: number;
}

export interface FileRunEvidenceStoreOptions {
  now?: () => Date;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatDateParts(date: Date): {
  month: string;
  day: string;
  time: string;
} {
  const year = date.getFullYear();
  const monthNumber = pad(date.getMonth() + 1);
  const dayNumber = pad(date.getDate());
  return {
    month: `${year}-${monthNumber}`,
    day: `${year}-${monthNumber}-${dayNumber}`,
    time: `${pad(date.getHours())}${pad(date.getMinutes())}${pad(
      date.getSeconds(),
    )}`,
  };
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-|-$/g, '');
  return sanitized || 'annotation';
}

function makeRelative(workspaceRoot: string, filePath: string): string {
  return path.relative(workspaceRoot, filePath) || path.basename(filePath);
}

function resolveWorkspacePath(workspaceRoot: string, filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
}

function extractModel(command: RunnerCommandConfig): string | undefined {
  const args = command.args ?? [];
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

function parseDiff(diff: string): {
  hasDiff: boolean;
  changedFiles: RunEvidenceChangedFile[];
  additions: number;
  deletions: number;
} {
  const changedFileSet = new Set<string>();
  let additions = 0;
  let deletions = 0;

  for (const line of diff.split('\n')) {
    const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (match) {
      changedFileSet.add(match[2]);
      continue;
    }

    if (line.startsWith('+++') || line.startsWith('---')) {
      continue;
    }

    if (line.startsWith('+')) additions += 1;
    if (line.startsWith('-')) deletions += 1;
  }

  return {
    hasDiff: diff.trim().length > 0,
    changedFiles: Array.from(changedFileSet).map((filePath) => ({
      path: filePath,
    })),
    additions,
    deletions,
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

async function readSummary(
  filePath: string,
): Promise<RunEvidenceSummary | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as RunEvidenceSummary;
  } catch {
    return null;
  }
}

function evidenceTimestamp(summary: RunEvidenceSummary): number {
  return new Date(summary.finishedAt ?? summary.startedAt).getTime();
}

export async function findLatestRunEvidence(
  workspaceRoot: string,
  annotationId: string,
): Promise<RunEvidenceView | null> {
  const summaries = await findSummaryFiles(
    path.join(workspaceRoot, '.pinflow', 'runs'),
  );
  const matching: RunEvidenceSummary[] = [];

  for (const summaryPath of summaries) {
    const summary = await readSummary(summaryPath);
    if (summary?.annotationId === annotationId) {
      matching.push(summary);
    }
  }

  matching.sort(
    (left, right) => evidenceTimestamp(right) - evidenceTimestamp(left),
  );
  const latest = matching[0];
  if (!latest) {
    return null;
  }

  const diff = await readFile(
    resolveWorkspacePath(workspaceRoot, latest.diffPath),
    'utf8',
  ).catch(() => '');

  return {
    annotationId: latest.annotationId,
    runId: latest.runId,
    runDir: latest.runDir,
    status: latest.status,
    provider: latest.provider,
    label: latest.label,
    model: extractModel(latest.command),
    startedAt: latest.startedAt,
    finishedAt: latest.finishedAt,
    exitCode: latest.exitCode,
    errorDetails: latest.errorDetails,
    promptPath: latest.promptPath,
    contextPath: latest.contextPath,
    transcriptPath: latest.transcriptPath,
    diffPath: latest.diffPath,
    ...parseDiff(diff),
  };
}

class FileRunEvidenceRecorder implements RunEvidenceRecorder {
  readonly paths: RunEvidenceRecorder['paths'];
  private summary: RunEvidenceSummary;

  constructor(
    input: RunEvidenceCreateInput,
    runId: string,
    runDir: string,
    startedAt: string,
  ) {
    const promptPath = path.join(runDir, 'prompt.md');
    const contextPath = path.join(runDir, 'context.json');
    const transcriptPath = path.join(runDir, 'transcript.log');
    const diffPath = path.join(runDir, 'diff.patch');
    const summaryPath = path.join(runDir, 'summary.json');

    this.paths = {
      runId,
      runDir,
      promptPath,
      contextPath,
      transcriptPath,
      diffPath,
      summaryPath,
    };
    this.summary = {
      ...input,
      runId,
      runDir: makeRelative(input.workspaceRoot, runDir),
      status: 'claimed',
      startedAt,
      promptPath: makeRelative(input.workspaceRoot, promptPath),
      contextPath: makeRelative(input.workspaceRoot, contextPath),
      transcriptPath: makeRelative(input.workspaceRoot, transcriptPath),
      diffPath: makeRelative(input.workspaceRoot, diffPath),
    };
  }

  async writePrompt(prompt: string): Promise<void> {
    await writeFile(this.paths.promptPath, prompt, 'utf8');
  }

  async writeContext(context: unknown): Promise<void> {
    await writeFile(
      this.paths.contextPath,
      `${JSON.stringify(context, null, 2)}\n`,
      'utf8',
    );
  }

  async appendTranscript(message: string): Promise<void> {
    await appendFile(this.paths.transcriptPath, message, 'utf8');
  }

  async writeDiff(diff: string): Promise<void> {
    await writeFile(this.paths.diffPath, diff, 'utf8');
  }

  async updateSummary(
    patch: Partial<
      Pick<
        RunEvidenceSummary,
        'status' | 'finishedAt' | 'exitCode' | 'errorDetails'
      >
    >,
  ): Promise<void> {
    this.summary = { ...this.summary, ...patch };
    await writeFile(
      this.paths.summaryPath,
      `${JSON.stringify(this.summary, null, 2)}\n`,
      'utf8',
    );
  }
}

export class FileRunEvidenceStore implements RunEvidenceStore {
  private readonly now: () => Date;

  constructor(options: FileRunEvidenceStoreOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async createRun(input: RunEvidenceCreateInput): Promise<RunEvidenceRecorder> {
    const now = this.now();
    const { month, day, time } = formatDateParts(now);
    const safeAnnotationId = sanitizePathSegment(input.annotationId);
    const runId = `${time}-${safeAnnotationId}`;
    const runDir = path.join(
      input.workspaceRoot,
      '.pinflow',
      'runs',
      month,
      day,
      runId,
    );
    await mkdir(runDir, { recursive: true });

    const recorder = new FileRunEvidenceRecorder(
      input,
      runId,
      runDir,
      now.toISOString(),
    );
    await recorder.appendTranscript(
      `[pinflow-runner] Run created: ${path.relative(input.workspaceRoot, runDir)}\n`,
    );
    await recorder.updateSummary({ status: 'claimed' });
    return recorder;
  }
}
