import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FileRunEvidenceStore,
  findLatestRunEvidence,
} from './evidence-store.js';

describe('FileRunEvidenceStore', () => {
  it('writes run evidence under month and date folders', async () => {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), 'pinflow-evidence-'),
    );

    try {
      const store = new FileRunEvidenceStore({
        now: () => new Date(2026, 3, 30, 1, 2, 3),
      });

      const recorder = await store.createRun({
        annotationId: 'ann/abc 123',
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        workspaceRoot,
        command: {
          command: 'codex',
          args: ['exec', '-'],
          promptMode: 'stdin',
        },
        userIntent: 'Make it bigger.',
        sourceLocation: { file: 'src/App.tsx', line: 12, column: 3 },
      });

      await recorder.writePrompt('prompt body');
      await recorder.writeContext({ full: 'context' });
      await recorder.appendTranscript('agent output');
      await recorder.writeDiff('diff --git a/src/App.tsx b/src/App.tsx\n');
      await recorder.updateSummary({
        status: 'processed',
        exitCode: 0,
        finishedAt: '2026-04-30T01:02:10.000Z',
      });

      expect(recorder.paths.runDir).toBe(
        path.join(
          workspaceRoot,
          '.pinflow',
          'runs',
          '2026-04',
          '2026-04-30',
          '010203-ann-abc-123',
        ),
      );
      await expect(readFile(recorder.paths.promptPath, 'utf8')).resolves.toBe(
        'prompt body',
      );
      await expect(readFile(recorder.paths.contextPath, 'utf8')).resolves.toBe(
        '{\n  "full": "context"\n}\n',
      );
      await expect(
        readFile(recorder.paths.transcriptPath, 'utf8'),
      ).resolves.toContain('agent output');
      await expect(
        readFile(recorder.paths.diffPath, 'utf8'),
      ).resolves.toContain('diff --git');

      const summary = JSON.parse(
        await readFile(recorder.paths.summaryPath, 'utf8'),
      ) as {
        status: string;
        promptPath: string;
        contextPath: string;
        runDir: string;
      };
      expect(summary.status).toBe('processed');
      expect(summary.runDir).toBe(
        path.join(
          '.pinflow',
          'runs',
          '2026-04',
          '2026-04-30',
          '010203-ann-abc-123',
        ),
      );
      expect(summary.promptPath).toBe(
        path.join(
          '.pinflow',
          'runs',
          '2026-04',
          '2026-04-30',
          '010203-ann-abc-123',
          'prompt.md',
        ),
      );
      expect(summary.contextPath).toBe(
        path.join(
          '.pinflow',
          'runs',
          '2026-04',
          '2026-04-30',
          '010203-ann-abc-123',
          'context.json',
        ),
      );
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('reads the latest evidence summary for an annotation', async () => {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), 'pinflow-evidence-'),
    );

    try {
      const store = new FileRunEvidenceStore({
        now: () => new Date(2026, 3, 30, 12, 0, 0),
      });

      const recorder = await store.createRun({
        annotationId: 'ann_12345678_1',
        provider: 'codex',
        label: 'PinFlow Runner (codex)',
        workspaceRoot,
        command: {
          command: 'codex',
          args: ['exec', '--model=gpt-5.5', '-'],
          promptMode: 'stdin',
        },
      });

      await recorder.writeDiff(
        [
          'diff --git a/src/App.tsx b/src/App.tsx',
          '--- a/src/App.tsx',
          '+++ b/src/App.tsx',
          '@@ -1 +1 @@',
          '-old',
          '+new',
          '',
        ].join('\n'),
      );
      await recorder.updateSummary({
        status: 'processed',
        exitCode: 0,
        finishedAt: '2026-04-30T12:00:10.000Z',
      });

      await expect(
        findLatestRunEvidence(workspaceRoot, 'ann_12345678_1'),
      ).resolves.toMatchObject({
        annotationId: 'ann_12345678_1',
        provider: 'codex',
        model: 'gpt-5.5',
        hasDiff: true,
        changedFiles: [{ path: 'src/App.tsx' }],
        additions: 1,
        deletions: 1,
      });
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
