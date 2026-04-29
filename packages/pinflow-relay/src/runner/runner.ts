import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Writable } from 'node:stream';
import {
  AnnotationStatusEnum,
  PinFlowErrorCode,
  type Annotation,
  type AnnotationStatus,
} from '@pinflow/core';
import { RelayHttpClient, RelayError } from '../client/relay-http-client.js';
import type {
  AnnotationProcessResponse,
  RunnerHeartbeatRequestBody,
  RunnerStatus,
} from '../schema.js';
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
  runnerId?: string;
}

export interface ProcessSpawner {
  spawn(
    command: string,
    args: string[],
    options: {
      cwd: string;
      env: NodeJS.ProcessEnv;
      stdio: ['pipe', 'inherit', 'inherit'];
    },
  ): ChildProcessByStdio<Writable, null, null>;
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

export class PinflowRunner {
  private stopped = false;
  private readonly client: RunnerClient;
  private readonly spawner: ProcessSpawner;
  private readonly runnerId: string;

  constructor(
    private readonly options: PinflowRunnerOptions,
    deps: {
      client?: RunnerClient;
      spawner?: ProcessSpawner;
    } = {},
  ) {
    this.client =
      deps.client ?? new RelayHttpClient(options.relayHost, options.relayPort);
    this.spawner = deps.spawner ?? DEFAULT_SPAWNER;
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
          provider: 'other',
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

    const prompt = buildRunnerPrompt(task, {
      workspaceRoot: this.options.workspaceRoot,
    });

    await this.client.updateAnnotationStatus(
      task.annotationId,
      AnnotationStatusEnum.PROCESSING,
      {},
    );

    let result: { code: number | null };
    const stopProcessingHeartbeat = this.startHeartbeatLoop(
      'processing',
      task.annotationId,
    );
    try {
      result = await this.runCommand(prompt);
    } catch (error) {
      stopProcessingHeartbeat();
      await this.client.updateAnnotationStatus(
        task.annotationId,
        AnnotationStatusEnum.FAILED,
        {
          errorDetails: `Runner command could not start: ${error instanceof Error ? error.message : String(error)}`,
        },
      );
      await this.sendHeartbeat('idle');
      return 'processed';
    }
    stopProcessingHeartbeat();

    if (result.code === 0) {
      await this.client.updateAnnotationResponse(
        task.annotationId,
        `Runner finished successfully with ${this.options.label}.`,
      );
      await this.client.updateAnnotationStatus(
        task.annotationId,
        AnnotationStatusEnum.PROCESSED,
        {},
      );
      await this.sendHeartbeat('idle');
      return 'processed';
    }

    await this.client.updateAnnotationStatus(
      task.annotationId,
      AnnotationStatusEnum.FAILED,
      {
        errorDetails: `Runner command exited with code ${result.code}.`,
      },
    );
    await this.sendHeartbeat('idle');
    return 'processed';
  }

  private startHeartbeatLoop(
    status: RunnerStatus,
    currentAnnotationId?: string,
  ): () => void {
    void this.sendHeartbeat(status, currentAnnotationId);
    const interval = setInterval(() => {
      void this.sendHeartbeat(status, currentAnnotationId);
    }, 5_000);

    return () => clearInterval(interval);
  }

  private async sendHeartbeat(
    status: RunnerStatus,
    currentAnnotationId?: string,
  ): Promise<void> {
    try {
      await this.client.sendRunnerHeartbeat({
        runnerId: this.runnerId,
        provider: this.options.provider,
        label: this.options.label,
        status,
        currentAnnotationId,
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

  private runCommand(prompt: string): Promise<{ code: number | null }> {
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
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    if (this.options.command.promptMode === 'stdin') {
      child.stdin.end(prompt);
    } else {
      child.stdin.end();
    }

    return new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', (code) => resolve({ code }));
    });
  }
}

export function resolveRunnerCommand({
  provider,
  command,
  args,
}: {
  provider: string;
  command?: string;
  args?: string[];
}): RunnerCommandConfig {
  if (command) {
    return {
      command,
      args: args ?? ['{prompt}'],
      promptMode: args?.includes('{prompt}') ? 'arg' : 'stdin',
    };
  }

  if (provider === 'codex' || provider === 'auto') {
    return {
      command: 'codex',
      args: ['exec', '--full-auto', '--skip-git-repo-check', '-'],
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
