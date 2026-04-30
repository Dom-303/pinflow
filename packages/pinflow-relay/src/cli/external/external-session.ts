import { execFile } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  AnnotationStatusEnum,
  type AnnotationDispatchTarget,
} from '@pinflow/core';
import { RelayHttpClient } from '../../client/relay-http-client.js';
import { RelayControl } from '../../lifecycle/relay-control.js';
import {
  FileRunEvidenceStore,
  type RunEvidenceStore,
} from '../../runner/evidence-store.js';
import { buildRunContextPayload } from '../../runner/context-payload.js';
import { buildRunnerPrompt } from '../../runner/prompt.js';
import type { AnnotationProcessResponse } from '../../schema.js';

const execFileAsync = promisify(execFile);

export interface ExternalClaimOptions {
  workspaceRoot: string;
  provider: string;
  model?: string;
  label?: string;
  relay?: {
    host?: string;
    port?: number;
    bodyLimit?: number;
  };
  debug?: boolean;
}

export interface ExternalCompleteOptions {
  workspaceRoot: string;
  annotationId: string;
  message?: string;
  runDir?: string;
  relay?: {
    host?: string;
    port?: number;
    bodyLimit?: number;
  };
  debug?: boolean;
}

export interface ExternalFailOptions {
  workspaceRoot: string;
  annotationId: string;
  errorDetails: string;
  runDir?: string;
  relay?: {
    host?: string;
    port?: number;
    bodyLimit?: number;
  };
  debug?: boolean;
}

export interface ExternalClaimResult {
  found: boolean;
  annotationId?: string;
  promptPath?: string;
  transcriptPath?: string;
  diffPath?: string;
  summaryPath?: string;
  runId?: string;
  runDir?: string;
  provider?: string;
  model?: string;
  label?: string;
  prompt?: string;
}

interface RelayControlLike {
  ensureRunning(options: {
    host?: string;
    port?: number;
    bodyLimit?: number;
  }): Promise<{ host: string; port: number }>;
}

interface ExternalSessionDependencies {
  relayControl?: RelayControlLike;
  clientFactory?: (host: string, port: number) => RelayHttpClient;
  evidenceStore?: RunEvidenceStore;
}

function toDispatchProvider(
  provider: string,
): AnnotationDispatchTarget['provider'] {
  if (provider === 'codex' || provider === 'claude' || provider === 'manual') {
    return provider;
  }
  return 'other';
}

function getLabel(provider: string, label?: string): string {
  return label?.trim() || `PinFlow External (${provider})`;
}

function externalCommandArgs(model?: string): string[] {
  return model?.trim() ? ['--model', model.trim()] : [];
}

async function getClient(
  options: {
    workspaceRoot: string;
    relay?: { host?: string; port?: number; bodyLimit?: number };
    debug?: boolean;
  },
  deps: ExternalSessionDependencies,
): Promise<{
  client: RelayHttpClient;
  relay: { host: string; port: number };
}> {
  const relayControl =
    deps.relayControl ??
    new RelayControl(options.workspaceRoot, { debug: options.debug });
  const relay = await relayControl.ensureRunning({
    host: options.relay?.host,
    port: options.relay?.port,
    bodyLimit: options.relay?.bodyLimit,
  });
  const client =
    deps.clientFactory?.(relay.host, relay.port) ??
    new RelayHttpClient(relay.host, relay.port);
  return { client, relay };
}

function assertClaimedTask(
  task: AnnotationProcessResponse,
): asserts task is AnnotationProcessResponse & {
  annotationId: string;
} {
  if (!task.found || !task.annotationId) {
    throw new Error(
      'No released PinFlow task is available for external handoff.',
    );
  }
}

async function readWorkspaceDiff(workspaceRoot: string): Promise<string> {
  const unstagedDiff = await execFileAsync(
    'git',
    ['diff', '--no-ext-diff', '--binary', '--', '.'],
    {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
    },
  );
  const stagedDiff = await execFileAsync(
    'git',
    ['diff', '--cached', '--no-ext-diff', '--binary', '--', '.'],
    {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
    },
  );

  return [
    unstagedDiff.stdout,
    stagedDiff.stdout ? `\n# Staged changes\n${stagedDiff.stdout}` : '',
  ]
    .filter(Boolean)
    .join('');
}

async function patchSummary(
  runDir: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const summaryPath = path.join(runDir, 'summary.json');
  const current = JSON.parse(await readFile(summaryPath, 'utf8')) as Record<
    string,
    unknown
  >;
  await writeFile(
    summaryPath,
    `${JSON.stringify({ ...current, ...patch }, null, 2)}\n`,
    'utf8',
  );
}

async function appendTranscript(
  runDir: string,
  message: string,
): Promise<void> {
  await appendFile(path.join(runDir, 'transcript.log'), message, 'utf8');
}

export async function claimExternalTask(
  options: ExternalClaimOptions,
  deps: ExternalSessionDependencies = {},
): Promise<ExternalClaimResult> {
  const provider = options.provider;
  const label = getLabel(provider, options.label);
  const { client } = await getClient(options, deps);
  const task = await client.processAnnotation({
    dispatchTarget: {
      provider: toDispatchProvider(provider),
      label,
    },
  });

  assertClaimedTask(task);

  const evidenceStore = deps.evidenceStore ?? new FileRunEvidenceStore();
  const recorder = await evidenceStore.createRun({
    annotationId: task.annotationId,
    provider,
    label,
    workspaceRoot: options.workspaceRoot,
    command: {
      command: 'external',
      args: externalCommandArgs(options.model),
      promptMode: 'stdin',
    },
    userIntent: task.userIntent,
    sourceLocation: task.sourceLocation,
  });
  const prompt = buildRunnerPrompt(task, {
    workspaceRoot: options.workspaceRoot,
    contextPath: path.relative(options.workspaceRoot, recorder.paths.contextPath),
  });

  await recorder.writeContext(
    await buildRunContextPayload(task, {
      workspaceRoot: options.workspaceRoot,
    }),
  );
  await recorder.writePrompt(prompt);
  await recorder.appendTranscript(
    `[pinflow-external] Handoff created for annotation ${task.annotationId}\n` +
      `[pinflow-external] Provider: ${provider}\n` +
      (options.model ? `[pinflow-external] Model: ${options.model}\n` : ''),
  );
  await recorder.updateSummary({ status: 'processing' });
  await client.updateAnnotationStatus(
    task.annotationId,
    AnnotationStatusEnum.PROCESSING,
    {},
  );
  await client.sendRunnerHeartbeat({
    runnerId: `external-${process.pid}`,
    provider,
    label,
    status: 'processing',
    surface: 'external',
    currentAnnotationId: task.annotationId,
    currentRunId: recorder.paths.runId,
    currentRunDir: recorder.paths.runDir,
    pid: process.pid,
  });

  return {
    found: true,
    annotationId: task.annotationId,
    promptPath: recorder.paths.promptPath,
    transcriptPath: recorder.paths.transcriptPath,
    diffPath: recorder.paths.diffPath,
    summaryPath: recorder.paths.summaryPath,
    runId: recorder.paths.runId,
    runDir: recorder.paths.runDir,
    provider,
    model: options.model,
    label,
    prompt,
  };
}

export async function completeExternalTask(
  options: ExternalCompleteOptions,
  deps: ExternalSessionDependencies = {},
): Promise<void> {
  const { client } = await getClient(options, deps);
  const message =
    options.message?.trim() || 'External PinFlow runner finished successfully.';

  if (options.runDir) {
    const diff = await readWorkspaceDiff(options.workspaceRoot);
    await writeFile(
      path.join(options.runDir, 'diff.patch'),
      diff || '# No git patch output was available.\n',
      'utf8',
    );
    await appendTranscript(
      options.runDir,
      `[pinflow-external] Completed annotation ${options.annotationId}\n`,
    );
    await patchSummary(options.runDir, {
      status: 'processed',
      finishedAt: new Date().toISOString(),
    });
  }

  await client.updateAnnotationResponse(options.annotationId, message);
  await client.updateAnnotationStatus(
    options.annotationId,
    AnnotationStatusEnum.PROCESSED,
    {},
  );
}

export async function failExternalTask(
  options: ExternalFailOptions,
  deps: ExternalSessionDependencies = {},
): Promise<void> {
  const { client } = await getClient(options, deps);

  if (options.runDir) {
    await appendTranscript(
      options.runDir,
      `[pinflow-external] Failed annotation ${options.annotationId}: ${options.errorDetails}\n`,
    );
    await patchSummary(options.runDir, {
      status: 'failed',
      errorDetails: options.errorDetails,
      finishedAt: new Date().toISOString(),
    });
  }

  await client.updateAnnotationStatus(
    options.annotationId,
    AnnotationStatusEnum.FAILED,
    { errorDetails: options.errorDetails },
  );
}
