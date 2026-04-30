import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { AnnotationStatusEnum, type Annotation } from '@pinflow/core';

import {
  diffFingerprints,
  filterNewDiffChunks,
  PinflowRunner,
  resolveRunnerCommand,
  type RunnerClient,
} from './runner.js';

function createNoopEvidenceStore() {
  return {
    createRun: vi.fn().mockResolvedValue({
      paths: {
        runId: 'test-run',
        runDir: '/repo/.pinflow/runs/2026-04/2026-04-30/test-run',
        promptPath: '/repo/.pinflow/runs/2026-04/2026-04-30/test-run/prompt.md',
        contextPath:
          '/repo/.pinflow/runs/2026-04/2026-04-30/test-run/context.json',
        transcriptPath:
          '/repo/.pinflow/runs/2026-04/2026-04-30/test-run/transcript.log',
        diffPath: '/repo/.pinflow/runs/2026-04/2026-04-30/test-run/diff.patch',
        summaryPath:
          '/repo/.pinflow/runs/2026-04/2026-04-30/test-run/summary.json',
      },
      writePrompt: vi.fn().mockResolvedValue(undefined),
      writeContext: vi.fn().mockResolvedValue(undefined),
      appendTranscript: vi.fn().mockResolvedValue(undefined),
      writeDiff: vi.fn().mockResolvedValue(undefined),
      updateSummary: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

function createOkPreflight() {
  return {
    check: vi.fn().mockResolvedValue({ ok: true }),
  };
}

function createChild(
  exitCode: number,
  output: { stdout?: string; stderr?: string } = {},
): EventEmitter & {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
} {
  const child = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
  };
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  queueMicrotask(() => {
    if (output.stdout) {
      child.stdout.emit('data', Buffer.from(output.stdout));
    }
    if (output.stderr) {
      child.stderr.emit('data', Buffer.from(output.stderr));
    }
    child.emit('exit', exitCode);
  });
  return child;
}

function createAnnotation(): Annotation {
  return {
    metadata: {
      id: 'ann_abc12345_123',
      timestamp: '2026-04-29T10:00:00.000Z',
      mode: 'element-click',
      status: AnnotationStatusEnum.QUEUED,
      schemaVersion: 1,
    },
    interaction: {
      type: 'element-annotation',
      selectedElement: {
        tagName: 'h1',
        selector: 'main h1',
        dataDs: 'abc12345',
        attributes: {},
        innerText: 'Welcome',
      },
    },
    context: {
      pageUrl: 'http://localhost:4301',
      pageTitle: 'Fixture',
      viewport: { width: 1200, height: 800 },
      userAgent: 'test',
      userMessage: 'Make it smaller.',
      manifestSnapshot: [
        {
          id: 'abc12345',
          file: 'src/App.tsx',
          start: { line: 42, column: 7 },
          end: { line: 42, column: 20 },
          tagName: 'h1',
          fileHash: 'hash',
        },
      ],
    },
    dispatch: {
      assignedAt: '2026-04-29T10:00:01.000Z',
      target: { provider: 'other', label: 'PinFlow Runner' },
    },
  };
}

describe('resolveRunnerCommand', () => {
  it('uses the local Codex configuration by default', () => {
    expect(resolveRunnerCommand({ provider: 'codex' })).toEqual({
      command: 'codex',
      args: ['exec', '--full-auto', '--skip-git-repo-check', '-'],
      promptMode: 'stdin',
    });
  });

  it('passes a Codex model only when explicitly configured', () => {
    expect(resolveRunnerCommand({ provider: 'codex', model: 'gpt-5.5' }))
      .toEqual({
        command: 'codex',
        args: [
          'exec',
          '--full-auto',
          '--skip-git-repo-check',
          '-m',
          'gpt-5.5',
          '-',
        ],
        promptMode: 'stdin',
      });
  });

  it('supports custom argument prompt placeholders', () => {
    expect(
      resolveRunnerCommand({
        provider: 'custom',
        command: 'my-agent',
        args: ['run', '{prompt}'],
      }),
    ).toEqual({
      command: 'my-agent',
      args: ['run', '{prompt}'],
      promptMode: 'arg',
    });
  });
});

describe('PinflowRunner', () => {
  it('keeps run evidence focused on diffs changed during the run', () => {
    const oldDiff = [
      'diff --git a/src/index.css b/src/index.css',
      '--- a/src/index.css',
      '+++ b/src/index.css',
      '@@ -1 +1 @@',
      '-old color',
      '+new color',
      '',
    ].join('\n');
    const newDiff = [
      'diff --git a/src/App.tsx b/src/App.tsx',
      '--- a/src/App.tsx',
      '+++ b/src/App.tsx',
      '@@ -1 +1 @@',
      '-old title',
      '+new title',
      '',
    ].join('\n');

    const before = diffFingerprints({ unstaged: oldDiff, staged: '' });

    const runDiff = filterNewDiffChunks(
      `${oldDiff}${newDiff}`,
      'unstaged',
      before,
    );

    expect(runDiff).toContain(
      'diff --git a/src/App.tsx b/src/App.tsx',
    );
    expect(runDiff).not.toContain(
      'diff --git a/src/index.css b/src/index.css',
    );
  });

  it('claims one task, runs the local command, and marks it processed', async () => {
    const annotation = createAnnotation();
    const statuses: string[] = [];
    const responses: string[] = [];
    const stdinChunks: string[] = [];

    const client: RunnerClient = {
      sendRunnerHeartbeat: vi.fn(),
      processAnnotation: vi.fn().mockResolvedValue({
        found: true,
        annotationId: annotation.metadata.id,
        userIntent: annotation.context.userMessage,
        element: annotation.interaction.selectedElement,
        sourceLocation: {
          file: 'src/App.tsx',
          line: 42,
          column: 7,
          tagName: 'h1',
        },
        runtimeContext: undefined,
        fullAnnotation: annotation,
      }),
      updateAnnotationStatus: vi.fn().mockImplementation((_, status) => {
        statuses.push(status);
        return Promise.resolve({});
      }),
      updateAnnotationResponse: vi.fn().mockImplementation((_, message) => {
        responses.push(message);
        return Promise.resolve({});
      }),
      listAnnotations: vi.fn(),
    };

    const runner = new PinflowRunner(
      {
        workspaceRoot: '/repo',
        relayHost: '127.0.0.1',
        relayPort: 1234,
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        command: resolveRunnerCommand({ provider: 'codex' }),
        pollIntervalMs: 1000,
        once: true,
        dryRun: false,
      },
      {
        client,
        workspaceInspector: {
          snapshot: vi
            .fn()
            .mockResolvedValueOnce('')
            .mockResolvedValueOnce(' M src/App.tsx\n'),
          diff: vi.fn().mockResolvedValue('diff --git a/src/App.tsx b/src/App.tsx\n'),
        },
        evidenceStore: createNoopEvidenceStore(),
        providerPreflight: createOkPreflight(),
        spawner: {
          spawn: vi.fn().mockImplementation(() => {
            const child = createChild(0);
            child.stdin.on('data', (chunk) =>
              stdinChunks.push(chunk.toString()),
            );
            return child;
          }),
        },
      },
    );

    await runner.tick();

    expect(client.processAnnotation).toHaveBeenCalledWith({
      dispatchTarget: {
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
      },
    });
    expect(client.sendRunnerHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        status: 'processing',
        currentAnnotationId: annotation.metadata.id,
      }),
    );
    expect(statuses).toEqual([
      AnnotationStatusEnum.PROCESSING,
      AnnotationStatusEnum.PROCESSED,
    ]);
    expect(responses[0]).toContain('Runner finished successfully');
    expect(stdinChunks.join('')).toContain('Make it smaller.');
    expect(stdinChunks.join('')).toContain(
      '.pinflow/runs/2026-04/2026-04-30/test-run/context.json',
    );
  });

  it('marks a successful command as failed when it leaves no new workspace diff', async () => {
    const annotation = createAnnotation();
    const statuses: Array<{ status: string; errorDetails?: string }> = [];

    const client: RunnerClient = {
      sendRunnerHeartbeat: vi.fn(),
      processAnnotation: vi.fn().mockResolvedValue({
        found: true,
        annotationId: annotation.metadata.id,
        userIntent: annotation.context.userMessage,
        element: annotation.interaction.selectedElement,
        sourceLocation: {
          file: 'src/App.tsx',
          line: 42,
          column: 7,
          tagName: 'h1',
        },
        runtimeContext: undefined,
        fullAnnotation: annotation,
      }),
      updateAnnotationStatus: vi
        .fn()
        .mockImplementation((_, status, options = {}) => {
          statuses.push({ status, errorDetails: options.errorDetails });
          return Promise.resolve({});
        }),
      updateAnnotationResponse: vi.fn(),
      listAnnotations: vi.fn(),
    };

    const runner = new PinflowRunner(
      {
        workspaceRoot: '/repo',
        relayHost: '127.0.0.1',
        relayPort: 1234,
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        command: resolveRunnerCommand({ provider: 'codex' }),
        pollIntervalMs: 1000,
        once: true,
        dryRun: false,
      },
      {
        client,
        workspaceInspector: {
          snapshot: vi.fn().mockResolvedValue('clean\n'),
          diff: vi.fn().mockResolvedValue(''),
        },
        evidenceStore: createNoopEvidenceStore(),
        providerPreflight: createOkPreflight(),
        spawner: {
          spawn: vi.fn().mockImplementation(() => createChild(0)),
        },
      },
    );

    await runner.tick();

    expect(client.updateAnnotationResponse).not.toHaveBeenCalled();
    expect(statuses).toEqual([
      { status: AnnotationStatusEnum.PROCESSING, errorDetails: undefined },
      {
        status: AnnotationStatusEnum.FAILED,
        errorDetails:
          'Runner command finished successfully but did not create a new workspace diff.',
      },
    ]);
  });

  it('fails without starting the command when the initial workspace snapshot cannot be read', async () => {
    const annotation = createAnnotation();
    const statuses: Array<{ status: string; errorDetails?: string }> = [];
    const spawn = vi.fn();

    const client: RunnerClient = {
      sendRunnerHeartbeat: vi.fn(),
      processAnnotation: vi.fn().mockResolvedValue({
        found: true,
        annotationId: annotation.metadata.id,
        userIntent: annotation.context.userMessage,
        element: annotation.interaction.selectedElement,
        sourceLocation: {
          file: 'src/App.tsx',
          line: 42,
          column: 7,
          tagName: 'h1',
        },
        runtimeContext: undefined,
        fullAnnotation: annotation,
      }),
      updateAnnotationStatus: vi
        .fn()
        .mockImplementation((_, status, options = {}) => {
          statuses.push({ status, errorDetails: options.errorDetails });
          return Promise.resolve({});
        }),
      updateAnnotationResponse: vi.fn(),
      listAnnotations: vi.fn(),
    };

    const runner = new PinflowRunner(
      {
        workspaceRoot: '/repo',
        relayHost: '127.0.0.1',
        relayPort: 1234,
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        command: resolveRunnerCommand({ provider: 'codex' }),
        pollIntervalMs: 1000,
        once: true,
        dryRun: false,
      },
      {
        client,
        workspaceInspector: {
          snapshot: vi.fn().mockRejectedValue(new Error('git unavailable')),
          diff: vi.fn().mockResolvedValue(''),
        },
        evidenceStore: createNoopEvidenceStore(),
        providerPreflight: createOkPreflight(),
        spawner: {
          spawn,
        },
      },
    );

    await runner.tick();

    expect(spawn).not.toHaveBeenCalled();
    expect(client.updateAnnotationResponse).not.toHaveBeenCalled();
    expect(statuses).toEqual([
      { status: AnnotationStatusEnum.PROCESSING, errorDetails: undefined },
      {
        status: AnnotationStatusEnum.FAILED,
        errorDetails:
          'Runner could not verify workspace diff before starting the agent: git unavailable',
      },
    ]);
  });

  it('fails when the final workspace snapshot cannot be read after a successful command', async () => {
    const annotation = createAnnotation();
    const statuses: Array<{ status: string; errorDetails?: string }> = [];

    const client: RunnerClient = {
      sendRunnerHeartbeat: vi.fn(),
      processAnnotation: vi.fn().mockResolvedValue({
        found: true,
        annotationId: annotation.metadata.id,
        userIntent: annotation.context.userMessage,
        element: annotation.interaction.selectedElement,
        sourceLocation: {
          file: 'src/App.tsx',
          line: 42,
          column: 7,
          tagName: 'h1',
        },
        runtimeContext: undefined,
        fullAnnotation: annotation,
      }),
      updateAnnotationStatus: vi
        .fn()
        .mockImplementation((_, status, options = {}) => {
          statuses.push({ status, errorDetails: options.errorDetails });
          return Promise.resolve({});
        }),
      updateAnnotationResponse: vi.fn(),
      listAnnotations: vi.fn(),
    };

    const runner = new PinflowRunner(
      {
        workspaceRoot: '/repo',
        relayHost: '127.0.0.1',
        relayPort: 1234,
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        command: resolveRunnerCommand({ provider: 'codex' }),
        pollIntervalMs: 1000,
        once: true,
        dryRun: false,
      },
      {
        client,
        workspaceInspector: {
          snapshot: vi
            .fn()
            .mockResolvedValueOnce('')
            .mockRejectedValueOnce(new Error('git unavailable')),
          diff: vi.fn().mockResolvedValue(''),
        },
        evidenceStore: createNoopEvidenceStore(),
        providerPreflight: createOkPreflight(),
        spawner: {
          spawn: vi.fn().mockImplementation(() => createChild(0)),
        },
      },
    );

    await runner.tick();

    expect(client.updateAnnotationResponse).not.toHaveBeenCalled();
    expect(statuses).toEqual([
      { status: AnnotationStatusEnum.PROCESSING, errorDetails: undefined },
      {
        status: AnnotationStatusEnum.FAILED,
        errorDetails:
          'Runner could not verify workspace diff after the agent finished: git unavailable',
      },
    ]);
  });

  it('fails before starting the command when provider preflight fails', async () => {
    const annotation = createAnnotation();
    const statuses: Array<{ status: string; errorDetails?: string }> = [];
    const spawn = vi.fn();

    const client: RunnerClient = {
      sendRunnerHeartbeat: vi.fn(),
      processAnnotation: vi.fn().mockResolvedValue({
        found: true,
        annotationId: annotation.metadata.id,
        userIntent: annotation.context.userMessage,
        element: annotation.interaction.selectedElement,
        sourceLocation: undefined,
        runtimeContext: undefined,
        fullAnnotation: annotation,
      }),
      updateAnnotationStatus: vi
        .fn()
        .mockImplementation((_, status, options = {}) => {
          statuses.push({ status, errorDetails: options.errorDetails });
          return Promise.resolve({});
        }),
      updateAnnotationResponse: vi.fn(),
      listAnnotations: vi.fn(),
    };

    const runner = new PinflowRunner(
      {
        workspaceRoot: '/repo',
        relayHost: '127.0.0.1',
        relayPort: 1234,
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        command: resolveRunnerCommand({ provider: 'codex' }),
        pollIntervalMs: 1000,
        once: true,
        dryRun: false,
      },
      {
        client,
        workspaceInspector: {
          snapshot: vi.fn().mockResolvedValue(''),
          diff: vi.fn().mockResolvedValue(''),
        },
        evidenceStore: createNoopEvidenceStore(),
        providerPreflight: {
          check: vi.fn().mockResolvedValue({
            ok: false,
            errorDetails:
              'Runner command "codex" was not found. Install the selected provider CLI or configure a custom runner command.',
          }),
        },
        spawner: { spawn },
      },
    );

    await runner.tick();

    expect(spawn).not.toHaveBeenCalled();
    expect(statuses).toEqual([
      { status: AnnotationStatusEnum.PROCESSING, errorDetails: undefined },
      {
        status: AnnotationStatusEnum.FAILED,
        errorDetails:
          'Runner command "codex" was not found. Install the selected provider CLI or configure a custom runner command.',
      },
    ]);
  });

  it('explains Codex model compatibility failures without changing the selected model', async () => {
    const annotation = createAnnotation();
    const statuses: Array<{ status: string; errorDetails?: string }> = [];

    const client: RunnerClient = {
      sendRunnerHeartbeat: vi.fn(),
      processAnnotation: vi.fn().mockResolvedValue({
        found: true,
        annotationId: annotation.metadata.id,
        userIntent: annotation.context.userMessage,
        element: annotation.interaction.selectedElement,
        sourceLocation: undefined,
        runtimeContext: undefined,
        fullAnnotation: annotation,
      }),
      updateAnnotationStatus: vi
        .fn()
        .mockImplementation((_, status, options = {}) => {
          statuses.push({ status, errorDetails: options.errorDetails });
          return Promise.resolve({});
        }),
      updateAnnotationResponse: vi.fn(),
      listAnnotations: vi.fn(),
    };

    const runner = new PinflowRunner(
      {
        workspaceRoot: '/repo',
        relayHost: '127.0.0.1',
        relayPort: 1234,
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        command: resolveRunnerCommand({ provider: 'codex', model: 'gpt-5.5' }),
        pollIntervalMs: 1000,
        once: true,
        dryRun: false,
      },
      {
        client,
        workspaceInspector: {
          snapshot: vi.fn().mockResolvedValue(''),
          diff: vi.fn().mockResolvedValue(''),
        },
        evidenceStore: createNoopEvidenceStore(),
        providerPreflight: createOkPreflight(),
        spawner: {
          spawn: vi.fn().mockImplementation(() =>
            createChild(1, {
              stderr:
                "The 'gpt-5.5' model requires a newer version of Codex.\n",
            }),
          ),
        },
      },
    );

    await runner.tick();

    expect(statuses).toEqual([
      { status: AnnotationStatusEnum.PROCESSING, errorDetails: undefined },
      {
        status: AnnotationStatusEnum.FAILED,
        errorDetails:
          'Codex CLI is too old for model "gpt-5.5". Update the Codex CLI/app used by this runner, or choose a model supported by that local Codex installation.',
      },
    ]);
  });

  it('claims custom runner work through the generic other dispatch channel', async () => {
    const annotation = createAnnotation();

    const client: RunnerClient = {
      sendRunnerHeartbeat: vi.fn(),
      processAnnotation: vi.fn().mockResolvedValue({
        found: true,
        annotationId: annotation.metadata.id,
        userIntent: annotation.context.userMessage,
        element: annotation.interaction.selectedElement,
        sourceLocation: undefined,
        runtimeContext: undefined,
        fullAnnotation: annotation,
      }),
      updateAnnotationStatus: vi.fn(),
      updateAnnotationResponse: vi.fn(),
      listAnnotations: vi.fn(),
    };

    const runner = new PinflowRunner(
      {
        workspaceRoot: '/repo',
        relayHost: '127.0.0.1',
        relayPort: 1234,
        provider: 'custom-agent',
        label: 'PinFlow Runner (custom-agent)',
        command: resolveRunnerCommand({
          provider: 'custom',
          command: 'my-agent',
        }),
        pollIntervalMs: 1000,
        once: true,
        dryRun: false,
      },
      {
        client,
        workspaceInspector: {
          snapshot: vi
            .fn()
            .mockResolvedValueOnce('')
            .mockResolvedValueOnce(' M src/App.tsx\n'),
          diff: vi.fn().mockResolvedValue('diff --git a/src/App.tsx b/src/App.tsx\n'),
        },
        evidenceStore: createNoopEvidenceStore(),
        providerPreflight: createOkPreflight(),
        spawner: {
          spawn: vi.fn().mockImplementation(() => createChild(0)),
        },
      },
    );

    await runner.tick();

    expect(client.processAnnotation).toHaveBeenCalledWith({
      dispatchTarget: {
        provider: 'other',
        label: 'PinFlow Runner (custom-agent)',
      },
    });
  });

  it('reports itself as idle when no work is claimed', async () => {
    const client: RunnerClient = {
      sendRunnerHeartbeat: vi.fn(),
      processAnnotation: vi.fn().mockResolvedValue({ found: false }),
      updateAnnotationStatus: vi.fn(),
      updateAnnotationResponse: vi.fn(),
      listAnnotations: vi.fn(),
    };

    const runner = new PinflowRunner(
      {
        workspaceRoot: '/repo',
        relayHost: '127.0.0.1',
        relayPort: 1234,
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        command: resolveRunnerCommand({ provider: 'codex' }),
        pollIntervalMs: 1000,
        once: true,
        dryRun: false,
      },
      { client },
    );

    await runner.tick();

    expect(client.sendRunnerHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        status: 'idle',
      }),
    );
  });
});
