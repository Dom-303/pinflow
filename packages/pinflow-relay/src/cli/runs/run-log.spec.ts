import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { findLatestRun, formatLatestRun } from './run-log.js';
import { formatConciseChunk } from '../../runner/output-format.js';

describe('run evidence log helpers', () => {
  it('finds and formats the latest run evidence', async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pinflow-runs-'));

    try {
      const runDir = path.join(
        workspaceRoot,
        '.pinflow',
        'runs',
        '2026-04',
        '2026-04-30',
        '120000-ann_abc12345_1',
      );
      await mkdir(runDir, { recursive: true });
      await writeFile(
        path.join(runDir, 'summary.json'),
        JSON.stringify(
          {
            annotationId: 'ann_abc12345_1',
            runId: '120000-ann_abc12345_1',
            runDir: path.relative(workspaceRoot, runDir),
            status: 'processing',
            provider: 'codex',
            startedAt: '2026-04-30T12:00:00.000Z',
            transcriptPath: path.join(
              path.relative(workspaceRoot, runDir),
              'transcript.log',
            ),
            diffPath: path.join(
              path.relative(workspaceRoot, runDir),
              'diff.patch',
            ),
            command: {
              command: 'codex',
              args: ['exec', '-m', 'gpt-5.5', '-'],
            },
          },
          null,
          2,
        ),
        'utf8',
      );

      const latest = await findLatestRun(workspaceRoot);
      expect(latest).not.toBeNull();
      expect(latest?.summary.annotationId).toBe('ann_abc12345_1');
      expect(latest?.transcriptPath).toBe(path.join(runDir, 'transcript.log'));
      if (latest) {
        expect(formatLatestRun(latest)).toContain('codex (gpt-5.5)');
        expect(formatLatestRun(latest, 'concise')).toBe(
          [
            '[pinflow] Latest: working · codex/gpt-5.5',
            '[pinflow] Full details: pinflow follow --raw',
            '',
          ].join('\n'),
        );
      }
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('formats provider output into a concise terminal view', () => {
    const formatted = formatConciseChunk(
      [
        'OpenAI Codex v0.128.0',
        'model: gpt-5.5',
        'exec bash -lc npm test',
        'succeeded in 1.2s',
        '[pinflow-runner] Claimed annotation ann_abc12345_1',
        '[pinflow-runner] Command: codex exec --full-auto -',
        '[pinflow-runner] codex CLI: codex-cli 0.128.0',
        'diff --git a/App.tsx b/App.tsx',
        '-  width: 80%;',
        '+  width: 64%;',
        'Changed [App.tsx](/repo/src/App.tsx:12) and verified the diff.',
        '[pinflow-runner] Command exited with code 0',
        '',
      ].join('\n'),
    );

    expect(formatted.output).toContain('[pinflow] Task started');
    expect(formatted.output).toContain(
      '[agent] Changed App.tsx and verified the diff.',
    );
    expect(formatted.output).toContain('[pinflow] Done');
    expect(formatted.output).not.toContain('exec bash');
    expect(formatted.output).not.toContain('succeeded in');
    expect(formatted.output).not.toContain('OpenAI Codex');
    expect(formatted.output).not.toContain('codex-cli');
    expect(formatted.output).not.toContain('diff --git');
    expect(formatted.output).not.toContain('width: 80%');
  });
});
