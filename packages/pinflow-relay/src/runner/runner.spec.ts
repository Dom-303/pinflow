import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { AnnotationStatusEnum, type Annotation } from '@pinflow/core';

import {
  PinflowRunner,
  resolveRunnerCommand,
  type RunnerClient,
} from './runner.js';

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
  it('uses Codex CLI as the default subscription-friendly preset', () => {
    expect(resolveRunnerCommand({ provider: 'codex' })).toEqual({
      command: 'codex',
      args: ['exec', '--full-auto', '--skip-git-repo-check', '-'],
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
        spawner: {
          spawn: vi.fn().mockImplementation(() => {
            const child = new EventEmitter() as EventEmitter & {
              stdin: PassThrough;
            };
            child.stdin = new PassThrough();
            child.stdin.on('data', (chunk) =>
              stdinChunks.push(chunk.toString()),
            );
            queueMicrotask(() => child.emit('exit', 0));
            return child;
          }),
        },
      },
    );

    await runner.tick();

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
