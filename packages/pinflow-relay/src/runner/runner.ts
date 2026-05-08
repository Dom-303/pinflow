import {
  execFile,
  spawn,
  type ChildProcessByStdio,
} from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { promisify } from 'node:util';
import {
  AnnotationStatusEnum,
  PinFlowErrorCode,
  type Annotation,
  type AnnotationDispatchTarget,
  type AnnotationStatus,
} from '@pinflow/core';
import { RelayHttpClient, RelayError } from '../client/relay-http-client.js';
import type {
  AnnotationProcessResponse,
  RunnerHeartbeatRequestBody,
  RunnerSurface,
  RunnerStatus,
} from '../schema.js';
import {
  extractModel,
  FileRunEvidenceStore,
  type RunEvidenceRecorder,
  type RunEvidenceStore,
} from './evidence-store.js';
import {
  dedupeConciseOutput,
  formatConciseChunk,
  type RunOutputMode,
} from './output-format.js';
import { buildRunContextPayload } from './context-payload.js';
import { buildRunCostMetadata } from './cost-metadata.js';
import { buildRunnerPrompt } from './prompt.js';

export interface RunnerCommandConfig {
  command: string;
  args: string[];
  promptMode: 'stdin' | 'arg';
}

export interface PinflowRunnerOptions {
  workspaceRoot: string;
  relayHost: string;
  relayPort: number;
  provider: string;
  label: string;
  command: RunnerCommandConfig;
  pollIntervalMs: number;
  once: boolean;
  dryRun: boolean;
  debug?: boolean;
  outputMode?: RunOutputMode;
  runnerId?: string;
  surface?: RunnerSurface;
}

export interface ProcessSpawner {
  spawn(
    command: string,
    args: string[],
    options: {
      cwd: string;
      env: NodeJS.ProcessEnv;
      stdio: ['pipe', 'pipe', 'pipe'];
    },
  ): ChildProcessByStdio<Writable, Readable, Readable>;
}

export interface RunnerClient {
  sendRunnerHeartbeat(
    body: RunnerHeartbeatRequestBody,
  ): Promise<unknown>;
  processAnnotation(
    body?: Parameters<RelayHttpClient['processAnnotation']>[0],
  ): Promise<AnnotationProcessResponse>;
  updateAnnotationStatus(
    annotationId: string,
    status: AnnotationStatus,
    options: { errorDetails?: string },
  ): Promise<unknown>;
  updateAnnotationResponse(
    annotationId: string,
    message: string,
  ): Promise<unknown>;
  listAnnotations(options: {
    statuses?: AnnotationStatus[];
    limit?: number;
    offset?: number;
  }): Promise<{ annotations: Annotation[] }>;
}

const DEFAULT_SPAWNER: ProcessSpawner = {
  spawn: (command, args, options) => spawn(command, args, options),
};

export interface WorkspaceInspector {
  snapshot(workspaceRoot: string): Promise<string>;
  diff(workspaceRoot: string, beforeSnapshot?: string): Promise<string>;
}

export type ProviderPreflightResult =
  | { ok: true; details?: string }
  | { ok: false; errorDetails: string };

export interface ProviderPreflight {
  check(input: {
    provider: string;
    workspaceRoot: string;
    command: RunnerCommandConfig;
  }): Promise<ProviderPreflightResult>;
}

const execFileAsync = promisify(execFile);
const providerPreflightCache = new Map<string, ProviderPreflightResult>();

const DEFAULT_WORKSPACE_INSPECTOR: WorkspaceInspector = {
  async snapshot(workspaceRoot) {
    const status = await execFileAsync(
      'git',
      ['status', '--porcelain=v1', '--untracked-files=all', '--', '.'],
      {
        cwd: workspaceRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
      },
    );
    const unstagedDiff = await gitDiff(workspaceRoot, [
      'diff',
      '--no-ext-diff',
      '--binary',
      '--',
      '.',
    ]);
    const stagedDiff = await gitDiff(workspaceRoot, [
      'diff',
      '--cached',
      '--no-ext-diff',
      '--binary',
      '--',
      '.',
    ]);
    return JSON.stringify({
      status: status.stdout,
      diffFingerprints: diffFingerprints({
        unstaged: unstagedDiff,
        staged: stagedDiff,
      }),
    });
  },
  async diff(workspaceRoot, beforeSnapshot) {
    const unstagedDiff = await gitDiff(workspaceRoot, [
      'diff',
      '--no-ext-diff',
      '--binary',
      '--',
      '.',
    ]);
    const stagedDiff = await gitDiff(workspaceRoot, [
      'diff',
      '--cached',
      '--no-ext-diff',
      '--binary',
      '--',
      '.',
    ]);
    const beforeFingerprints = readSnapshotFingerprints(beforeSnapshot);

    return formatWorkspaceDiff({
      unstaged: filterNewDiffChunks(
        unstagedDiff,
        'unstaged',
        beforeFingerprints,
      ),
      staged: filterNewDiffChunks(stagedDiff, 'staged', beforeFingerprints),
    });
  },
};

async function gitDiff(
  workspaceRoot: string,
  args: string[],
): Promise<string> {
  const result = await execFileAsync('git', args, {
    cwd: workspaceRoot,
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 50 * 1024 * 1024,
  });
  return result.stdout;
}

interface GitDiffChunk {
  scope: 'unstaged' | 'staged';
  path: string;
  content: string;
}

function normalizeDiffChunkContent(content: string): string {
  return `${content.trimEnd()}\n`;
}

function hashContent(content: string): string {
  return createHash('sha256')
    .update(normalizeDiffChunkContent(content))
    .digest('hex');
}

function parseGitDiffChunks(
  diff: string,
  scope: 'unstaged' | 'staged',
): GitDiffChunk[] {
  const chunks: GitDiffChunk[] = [];
  const lines = diff.split('\n');
  let current: { path: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    chunks.push({
      scope,
      path: current.path,
      content: `${current.lines.join('\n')}\n`,
    });
    current = null;
  };

  for (const line of lines) {
    const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (match) {
      flush();
      current = { path: match[2], lines: [line] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  flush();
  return chunks;
}

export function diffFingerprints(input: {
  unstaged: string;
  staged: string;
}): Record<string, string> {
  const fingerprints: Record<string, string> = {};
  for (const chunk of [
    ...parseGitDiffChunks(input.unstaged, 'unstaged'),
    ...parseGitDiffChunks(input.staged, 'staged'),
  ]) {
    fingerprints[`${chunk.scope}:${chunk.path}`] = hashContent(chunk.content);
  }
  return fingerprints;
}

function readSnapshotFingerprints(
  snapshot: string | undefined,
): Record<string, string> {
  if (!snapshot) return {};
  try {
    const parsed = JSON.parse(snapshot) as {
      diffFingerprints?: Record<string, string>;
    };
    return parsed.diffFingerprints ?? {};
  } catch {
    return {};
  }
}

export function filterNewDiffChunks(
  diff: string,
  scope: 'unstaged' | 'staged',
  beforeFingerprints: Record<string, string>,
): string {
  return parseGitDiffChunks(diff, scope)
    .filter((chunk) => {
      const key = `${chunk.scope}:${chunk.path}`;
      return beforeFingerprints[key] !== hashContent(chunk.content);
    })
    .map((chunk) => chunk.content)
    .join('');
}

function formatWorkspaceDiff(input: {
  unstaged: string;
  staged: string;
}): string {
  return [
    input.unstaged,
    input.staged ? `\n# Staged changes changed during this run\n${input.staged}` : '',
  ]
    .filter(Boolean)
    .join('');
}

const DEFAULT_PROVIDER_PREFLIGHT: ProviderPreflight = {
  async check({ provider, workspaceRoot, command }) {
    if (provider !== 'codex' && provider !== 'claude') {
      return { ok: true };
    }

    const cacheKey = [
      provider,
      workspaceRoot,
      command.command,
      ...command.args,
    ].join('\0');
    const cached = providerPreflightCache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await execFileAsync(command.command, ['--version'], {
        cwd: workspaceRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 5_000,
      });
      const version = (result.stdout || result.stderr).trim();
      const passed = {
        ok: true,
        details: version ? `${provider} CLI: ${version}` : undefined,
      } satisfies ProviderPreflightResult;
      providerPreflightCache.set(cacheKey, passed);
      return passed;
    } catch (error) {
      const failed = {
        ok: false,
        errorDetails: formatCommandStartError(error, command.command),
      } satisfies ProviderPreflightResult;
      providerPreflightCache.set(cacheKey, failed);
      return failed;
    }
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNoWorkError(error: unknown): boolean {
  return (
    error instanceof RelayError &&
    error.code === PinFlowErrorCode.DS_ANNOTATION_NOTFOUND
  );
}

function renderArgs(args: string[], prompt: string): string[] {
  return args.map((arg) => (arg === '{prompt}' ? prompt : arg));
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatCommand(command: RunnerCommandConfig): string {
  return [command.command, ...command.args].join(' ');
}

function extractConfiguredModel(command: RunnerCommandConfig): string | undefined {
  const modelFlagIndex = command.args.findIndex(
    (arg) => arg === '-m' || arg === '--model',
  );
  return modelFlagIndex >= 0 ? command.args[modelFlagIndex + 1] : undefined;
}

function formatCommandStartError(error: unknown, command: string): string {
  const message = formatErrorMessage(error);
  if (message.includes('ENOENT')) {
    return `Runner command "${command}" was not found. Install the selected provider CLI or configure a custom runner command.`;
  }
  return `Runner command could not start: ${message}`;
}

function formatRunnerExitError(
  provider: string,
  command: RunnerCommandConfig,
  result: { code: number | null; stdout: string; stderr: string },
): string {
  const output = `${result.stdout}\n${result.stderr}`;
  const configuredModel = extractConfiguredModel(command);
  const unsupportedCodexModel = output.match(
    /The '([^']+)' model requires a newer version of Codex/i,
  );

  if (provider === 'codex' && unsupportedCodexModel) {
    const model = configuredModel ?? unsupportedCodexModel[1];
    return `Codex CLI is too old for model "${model}". Update the Codex CLI/app used by this runner, or choose a model supported by that local Codex installation.`;
  }

  return `Runner command exited with code ${result.code}.`;
}

function toDispatchProvider(
  provider: string,
): AnnotationDispatchTarget['provider'] {
  if (provider === 'codex' || provider === 'claude' || provider === 'manual') {
    return provider;
  }
  return 'other';
}

export class PinflowRunner {
  private stopped = false;
  private readonly client: RunnerClient;
  private readonly spawner: ProcessSpawner;
  private readonly workspaceInspector: WorkspaceInspector;
  private readonly evidenceStore: RunEvidenceStore;
  private readonly providerPreflight: ProviderPreflight;
  private readonly runnerId: string;

  constructor(
    private readonly options: PinflowRunnerOptions,
    deps: {
      client?: RunnerClient;
      spawner?: ProcessSpawner;
      workspaceInspector?: WorkspaceInspector;
      evidenceStore?: RunEvidenceStore;
      providerPreflight?: ProviderPreflight;
    } = {},
  ) {
    this.client =
      deps.client ?? new RelayHttpClient(options.relayHost, options.relayPort);
    this.spawner = deps.spawner ?? DEFAULT_SPAWNER;
    this.workspaceInspector =
      deps.workspaceInspector ?? DEFAULT_WORKSPACE_INSPECTOR;
    this.evidenceStore = deps.evidenceStore ?? new FileRunEvidenceStore();
    this.providerPreflight =
      deps.providerPreflight ?? DEFAULT_PROVIDER_PREFLIGHT;
    this.runnerId =
      options.runnerId ?? `runner-${process.pid}-${Date.now().toString(36)}`;
  }

  stop(): void {
    this.stopped = true;
  }

  async start(): Promise<void> {
    do {
      await this.tick();

      if (this.options.once) {
        return;
      }

      await sleep(this.options.pollIntervalMs);
    } while (!this.stopped);
  }

  async tick(): Promise<'processed' | 'idle' | 'dry-run'> {
    if (this.options.dryRun) {
      return this.printDryRun();
    }

    await this.sendHeartbeat('idle');

    let task: AnnotationProcessResponse;
    try {
      task = await this.client.processAnnotation({
        dispatchTarget: {
          provider: toDispatchProvider(this.options.provider),
          label: this.options.label,
        },
      });
    } catch (error) {
      if (isNoWorkError(error)) {
        if (this.options.debug) {
          console.error('[pinflow-runner] No released work found.');
        }
        return 'idle';
      }
      throw error;
    }

    if (!task.found || !task.annotationId) {
      return 'idle';
    }

    const recorder = await this.evidenceStore.createRun({
      annotationId: task.annotationId,
      provider: this.options.provider,
      label: this.options.label,
      workspaceRoot: this.options.workspaceRoot,
      command: this.options.command,
      userIntent: task.userIntent,
      sourceLocation: task.sourceLocation,
    });
    const contextPath = path.relative(
      this.options.workspaceRoot,
      recorder.paths.contextPath,
    );
    const prompt = buildRunnerPrompt(task, {
      workspaceRoot: this.options.workspaceRoot,
      contextPath,
    });
    await recorder.writeContext(
      await buildRunContextPayload(task, {
        workspaceRoot: this.options.workspaceRoot,
      }),
    );
    await recorder.writePrompt(prompt);
    await recorder.appendTranscript(
      `[pinflow-runner] Claimed annotation ${task.annotationId}\n`,
    );
    await recorder.appendTranscript(
      `[pinflow-runner] Command: ${formatCommand(this.options.command)}\n`,
    );
    console.error(
      `[pinflow-runner] Run evidence: ${recorder.paths.runDir}`,
    );
    if ((this.options.outputMode ?? 'concise') === 'concise') {
      console.error(
        '[pinflow-runner] Live output is concise. Use --raw for full provider output.',
      );
    }

    await this.client.updateAnnotationStatus(
      task.annotationId,
      AnnotationStatusEnum.PROCESSING,
      {},
    );
    await recorder.updateSummary({ status: 'processing' });

    const preflight = await this.preflightProvider(recorder);
    if (!preflight.ok) {
      await this.failTask(task.annotationId, preflight.errorDetails, recorder);
      await this.sendHeartbeat('idle');
      return 'processed';
    }

    let beforeSnapshot: string;
    try {
      beforeSnapshot = await this.getWorkspaceSnapshot();
    } catch (error) {
      await this.failTask(
        task.annotationId,
        `Runner could not verify workspace diff before starting the agent: ${formatErrorMessage(error)}`,
        recorder,
      );
      await this.sendHeartbeat('idle');
      return 'processed';
    }

    let result: { code: number | null; stdout: string; stderr: string };
    const stopProcessingHeartbeat = this.startHeartbeatLoop(
      'processing',
      task.annotationId,
      recorder,
    );
    try {
      result = await this.runCommand(prompt, recorder);
    } catch (error) {
      stopProcessingHeartbeat();
      await this.failTask(
        task.annotationId,
        formatCommandStartError(error, this.options.command.command),
        recorder,
      );
      await this.sendHeartbeat('idle');
      return 'processed';
    }
    stopProcessingHeartbeat();

    if (result.code === 0) {
      let afterSnapshot: string;
      try {
        afterSnapshot = await this.getWorkspaceSnapshot();
      } catch (error) {
        await this.failTask(
          task.annotationId,
          `Runner could not verify workspace diff after the agent finished: ${formatErrorMessage(error)}`,
          recorder,
        );
        await this.sendHeartbeat('idle');
        return 'processed';
      }

      if (afterSnapshot === beforeSnapshot) {
        await this.failTask(
          task.annotationId,
          'Runner command finished successfully but did not create a new workspace diff.',
          recorder,
        );
        await this.sendHeartbeat('idle');
        return 'processed';
      }

      await this.writeWorkspaceDiff(recorder, beforeSnapshot);
      await this.client.updateAnnotationResponse(
        task.annotationId,
        `Runner finished successfully with ${this.options.label}.`,
      );
      await this.client.updateAnnotationStatus(
        task.annotationId,
        AnnotationStatusEnum.PROCESSED,
        {},
      );
      const finishedAt = new Date().toISOString();
      const costMetadata = await buildRunCostMetadata({
        transcriptPath: recorder.paths.transcriptPath,
        startedAt: recorder.startedAt,
        finishedAt,
        fallbackModel: extractModel(this.options.command),
      });
      await recorder.updateSummary({
        status: 'processed',
        exitCode: result.code,
        finishedAt,
        ...costMetadata,
      });
      await this.sendHeartbeat('idle');
      return 'processed';
    }

    await this.failTask(
      task.annotationId,
      formatRunnerExitError(this.options.provider, this.options.command, result),
      recorder,
      result.code,
    );
    await this.sendHeartbeat('idle');
    return 'processed';
  }

  private async getWorkspaceSnapshot(): Promise<string> {
    return this.workspaceInspector.snapshot(this.options.workspaceRoot);
  }

  private async writeWorkspaceDiff(
    recorder: RunEvidenceRecorder,
    beforeSnapshot: string,
  ): Promise<void> {
    const diff = await this.workspaceInspector.diff(
      this.options.workspaceRoot,
      beforeSnapshot,
    );
    await recorder.writeDiff(diff || '# No git patch output was available.\n');
  }

  private async failTask(
    annotationId: string,
    errorDetails: string,
    recorder: RunEvidenceRecorder,
    exitCode?: number | null,
  ): Promise<void> {
    await recorder.appendTranscript(`[pinflow-runner] Failed: ${errorDetails}\n`);
    const finishedAt = new Date().toISOString();
    const costMetadata = await buildRunCostMetadata({
      transcriptPath: recorder.paths.transcriptPath,
      startedAt: recorder.startedAt,
      finishedAt,
      fallbackModel: extractModel(this.options.command),
    });
    await recorder.updateSummary({
      status: 'failed',
      errorDetails,
      exitCode,
      finishedAt,
      ...costMetadata,
    });
    await this.client.updateAnnotationStatus(
      annotationId,
      AnnotationStatusEnum.FAILED,
      { errorDetails },
    );
  }

  private async preflightProvider(
    recorder: RunEvidenceRecorder,
  ): Promise<{ ok: true } | { ok: false; errorDetails: string }> {
    const result = await this.providerPreflight.check({
      provider: this.options.provider,
      workspaceRoot: this.options.workspaceRoot,
      command: this.options.command,
    });
    if (result.ok && result.details) {
      await recorder.appendTranscript(`[pinflow-runner] ${result.details}\n`);
    }
    return result.ok ? { ok: true } : result;
  }

  private startHeartbeatLoop(
    status: RunnerStatus,
    currentAnnotationId?: string,
    recorder?: RunEvidenceRecorder,
  ): () => void {
    void this.sendHeartbeat(status, currentAnnotationId, recorder);
    const interval = setInterval(() => {
      void this.sendHeartbeat(status, currentAnnotationId, recorder);
    }, 5_000);

    return () => clearInterval(interval);
  }

  private async sendHeartbeat(
    status: RunnerStatus,
    currentAnnotationId?: string,
    recorder?: RunEvidenceRecorder,
  ): Promise<void> {
    try {
      await this.client.sendRunnerHeartbeat({
        runnerId: this.runnerId,
        provider: this.options.provider,
        label: this.options.label,
        status,
        surface: this.options.surface ?? 'terminal',
        currentAnnotationId,
        currentRunId: recorder?.paths.runId,
        currentRunDir: recorder?.paths.runDir,
        pid: process.pid,
      });
    } catch (error) {
      if (this.options.debug) {
        console.error('[pinflow-runner] Heartbeat failed:', error);
      }
    }
  }

  private async printDryRun(): Promise<'dry-run' | 'idle'> {
    const { annotations } = await this.client.listAnnotations({
      statuses: [AnnotationStatusEnum.QUEUED],
      limit: 50,
    });
    const task = annotations.find((annotation) =>
      Boolean(annotation?.dispatch?.assignedAt),
    );

    if (!task) {
      console.log('[pinflow-runner] No released queued task found.');
      return 'idle';
    }

    const prompt = buildRunnerPrompt(
      {
        found: true,
        annotationId: task.metadata.id,
        userIntent: task.context.userMessage,
        element: task.interaction.selectedElement,
        sourceLocation: task.context.manifestSnapshot?.[0]
          ? {
              file: task.context.manifestSnapshot[0].file,
              line: task.context.manifestSnapshot[0].start.line,
              column: task.context.manifestSnapshot[0].start.column,
              componentName: task.context.manifestSnapshot[0].componentName,
              tagName: task.context.manifestSnapshot[0].tagName,
            }
          : undefined,
        runtimeContext: task.context.runtimeContext,
        claim: undefined,
        dispatch: task.dispatch,
        fullAnnotation: task,
      },
      { workspaceRoot: this.options.workspaceRoot },
    );

    console.log(prompt);
    return 'dry-run';
  }

  private runCommand(
    prompt: string,
    recorder: RunEvidenceRecorder,
  ): Promise<{ code: number | null; stdout: string; stderr: string }> {
    const args =
      this.options.command.promptMode === 'arg'
        ? renderArgs(this.options.command.args, prompt)
        : this.options.command.args;

    const child = this.spawner.spawn(this.options.command.command, args, {
      cwd: this.options.workspaceRoot,
      env: {
        ...process.env,
        PINFLOW_RUNNER: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (this.options.command.promptMode === 'stdin') {
      child.stdin.end(prompt);
    } else {
      child.stdin.end();
    }

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let stdoutPendingLine = '';
      let stderrPendingLine = '';
      const transcriptWrites: Array<Promise<void>> = [];
      const outputMode = this.options.outputMode ?? 'concise';
      const seenVisibleLines = new Set<string>();

      const writeVisibleOutput = (
        stream: Pick<Writable, 'write'>,
        pendingLine: string,
        text: string,
      ): string => {
        if (outputMode === 'raw') {
          stream.write(text);
          return '';
        }

        const formatted = formatConciseChunk(pendingLine + text);
        const output = dedupeConciseOutput(
          formatted.output,
          seenVisibleLines,
        );
        if (output) {
          stream.write(output);
        }
        return formatted.pendingLine;
      };

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdout += text;
        stdoutPendingLine = writeVisibleOutput(
          process.stdout,
          stdoutPendingLine,
          text,
        );
        transcriptWrites.push(recorder.appendTranscript(text));
      });
      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderr += text;
        stderrPendingLine = writeVisibleOutput(
          process.stderr,
          stderrPendingLine,
          text,
        );
        transcriptWrites.push(recorder.appendTranscript(text));
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        transcriptWrites.push(
          recorder.appendTranscript(
            `[pinflow-runner] Command exited with code ${code}\n`,
          ),
        );
        void Promise.all(transcriptWrites).then(() =>
          resolve({ code, stdout, stderr }),
        );
      });
    });
  }
}

export function resolveRunnerCommand({
  provider,
  command,
  args,
  model,
}: {
  provider: string;
  command?: string;
  args?: string[];
  model?: string;
}): RunnerCommandConfig {
  if (command) {
    return {
      command,
      args: args ?? ['{prompt}'],
      promptMode: args?.includes('{prompt}') ? 'arg' : 'stdin',
    };
  }

  if (provider === 'codex' || provider === 'auto') {
    const codexArgs = ['exec', '--full-auto', '--skip-git-repo-check'];
    if (model?.trim()) {
      codexArgs.push('-m', model.trim());
    }
    codexArgs.push('-');

    return {
      command: 'codex',
      args: codexArgs,
      promptMode: 'stdin',
    };
  }

  if (provider === 'claude') {
    return {
      command: 'claude',
      args: ['-p'],
      promptMode: 'stdin',
    };
  }

  throw new Error(
    `No runner preset for provider "${provider}". Pass --command and optional --arg values.`,
  );
}
