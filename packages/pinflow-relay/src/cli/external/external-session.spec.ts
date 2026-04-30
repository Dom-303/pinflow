import { describe, expect, it, vi } from 'vitest';
import { AnnotationStatusEnum } from '@pinflow/core';
import {
  claimExternalTask,
  completeExternalTask,
  failExternalTask,
} from './external-session.js';

function createRecorder() {
  return {
    paths: {
      runId: '010203-ann_abc12345_1',
      runDir: '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc12345_1',
      promptPath:
        '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc12345_1/prompt.md',
      contextPath:
        '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc12345_1/context.json',
      transcriptPath:
        '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc12345_1/transcript.log',
      diffPath:
        '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc12345_1/diff.patch',
      summaryPath:
        '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc12345_1/summary.json',
    },
    writePrompt: vi.fn().mockResolvedValue(undefined),
    writeContext: vi.fn().mockResolvedValue(undefined),
    appendTranscript: vi.fn().mockResolvedValue(undefined),
    writeDiff: vi.fn().mockResolvedValue(undefined),
    updateSummary: vi.fn().mockResolvedValue(undefined),
  };
}

describe('external visible handoff session', () => {
  it('claims a task, writes prompt evidence, and reports external surface', async () => {
    const recorder = createRecorder();
    const client = {
      processAnnotation: vi.fn().mockResolvedValue({
        found: true,
        annotationId: 'ann_abc12345_1',
        userIntent: 'Make the logo bigger.',
        element: {
          tagName: 'img',
          selector: 'img.logo',
          attributes: {},
        },
        sourceLocation: {
          file: 'src/App.tsx',
          line: 10,
          column: 5,
          tagName: 'img',
        },
      }),
      updateAnnotationStatus: vi.fn().mockResolvedValue({}),
      sendRunnerHeartbeat: vi.fn().mockResolvedValue({}),
    };

    const result = await claimExternalTask(
      {
        workspaceRoot: '/repo',
        provider: 'codex',
        model: 'gpt-5.5',
        label: 'Codex Desktop',
      },
      {
        relayControl: {
          ensureRunning: vi
            .fn()
            .mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
        },
        clientFactory: vi.fn().mockReturnValue(client),
        evidenceStore: {
          createRun: vi.fn().mockResolvedValue(recorder),
        },
      },
    );

    expect(client.processAnnotation).toHaveBeenCalledWith({
      dispatchTarget: {
        provider: 'codex',
        label: 'Codex Desktop',
      },
    });
    expect(recorder.writePrompt).toHaveBeenCalledWith(
      expect.stringContaining('Make the logo bigger.'),
    );
    expect(recorder.writeContext).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceRoot: '/repo',
        task: expect.objectContaining({ annotationId: 'ann_abc12345_1' }),
      }),
    );
    expect(recorder.appendTranscript).toHaveBeenCalledWith(
      expect.stringContaining('Model: gpt-5.5'),
    );
    expect(client.updateAnnotationStatus).toHaveBeenCalledWith(
      'ann_abc12345_1',
      AnnotationStatusEnum.PROCESSING,
      {},
    );
    expect(client.sendRunnerHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'codex',
        label: 'Codex Desktop',
        status: 'processing',
        surface: 'external',
        currentAnnotationId: 'ann_abc12345_1',
        currentRunId: '010203-ann_abc12345_1',
        currentRunDir:
          '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc12345_1',
      }),
    );
    expect(result).toMatchObject({
      found: true,
      annotationId: 'ann_abc12345_1',
      provider: 'codex',
      model: 'gpt-5.5',
      label: 'Codex Desktop',
      runId: '010203-ann_abc12345_1',
      promptPath:
        '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc12345_1/prompt.md',
    });
  });

  it('marks an external task completed', async () => {
    const client = {
      updateAnnotationResponse: vi.fn().mockResolvedValue({}),
      updateAnnotationStatus: vi.fn().mockResolvedValue({}),
    };

    await completeExternalTask(
      {
        workspaceRoot: '/repo',
        annotationId: 'ann_abc12345_1',
        message: 'Done from visible external session.',
      },
      {
        relayControl: {
          ensureRunning: vi
            .fn()
            .mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
        },
        clientFactory: vi.fn().mockReturnValue(client),
      },
    );

    expect(client.updateAnnotationResponse).toHaveBeenCalledWith(
      'ann_abc12345_1',
      'Done from visible external session.',
    );
    expect(client.updateAnnotationStatus).toHaveBeenCalledWith(
      'ann_abc12345_1',
      AnnotationStatusEnum.PROCESSED,
      {},
    );
  });

  it('marks an external task failed with a readable reason', async () => {
    const client = {
      updateAnnotationStatus: vi.fn().mockResolvedValue({}),
    };

    await failExternalTask(
      {
        workspaceRoot: '/repo',
        annotationId: 'ann_abc12345_1',
        errorDetails: 'User cancelled the external session.',
      },
      {
        relayControl: {
          ensureRunning: vi
            .fn()
            .mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
        },
        clientFactory: vi.fn().mockReturnValue(client),
      },
    );

    expect(client.updateAnnotationStatus).toHaveBeenCalledWith(
      'ann_abc12345_1',
      AnnotationStatusEnum.FAILED,
      { errorDetails: 'User cancelled the external session.' },
    );
  });
});
