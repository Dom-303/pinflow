import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { findLatestRunEvidence } from './run-evidence.js';

async function createTempWorkspace() {
  return mkdtemp(path.join(tmpdir(), 'pinflow-vscode-evidence-'));
}

async function writeText(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

async function writeJson(filePath: string, value: unknown) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

describe('findLatestRunEvidence', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('returns latest run files and changed files from diff evidence', async () => {
    const olderRunDir = path.join(
      workspaceRoot,
      '.pinflow',
      'runs',
      '2026-04',
      '2026-04-30',
      '090000-ann_old_1',
    );
    await writeJson(path.join(olderRunDir, 'summary.json'), {
      annotationId: 'ann_old_1',
      runId: '090000-ann_old_1',
      status: 'processed',
      provider: 'codex',
      startedAt: '2026-04-30T09:00:00.000Z',
      finishedAt: '2026-04-30T09:01:00.000Z',
    });

    const runDir = path.join(
      workspaceRoot,
      '.pinflow',
      'runs',
      '2026-05',
      '2026-05-01',
      '120000-ann_abc12345_1',
    );
    await writeJson(path.join(runDir, 'summary.json'), {
      annotationId: 'ann_abc12345_1',
      runId: '120000-ann_abc12345_1',
      status: 'processed',
      provider: 'codex',
      startedAt: '2026-05-01T12:00:00.000Z',
      finishedAt: '2026-05-01T12:01:00.000Z',
      promptPath:
        '.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/prompt.md',
      transcriptPath:
        '.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/transcript.log',
      diffPath:
        '.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/diff.patch',
    });
    await writeText(path.join(runDir, 'prompt.md'), '# Prompt\n');
    await writeText(path.join(runDir, 'transcript.log'), 'done\n');
    await writeText(
      path.join(runDir, 'diff.patch'),
      [
        'diff --git a/src/app.ts b/src/app.ts',
        '--- a/src/app.ts',
        '+++ b/src/app.ts',
        '@@ -1 +1,2 @@',
        '-old',
        '+new',
        '+next',
        'diff --git a/README.md b/README.md',
        '--- a/README.md',
        '+++ b/README.md',
        '@@ -1 +1 @@',
        '+docs',
        '',
      ].join('\n'),
    );

    const evidence = await findLatestRunEvidence(workspaceRoot);

    expect(evidence?.annotationId).toBe('ann_abc12345_1');
    expect(evidence?.promptPath).toBe(path.join(runDir, 'prompt.md'));
    expect(evidence?.transcriptPath).toBe(path.join(runDir, 'transcript.log'));
    expect(evidence?.diffPath).toBe(path.join(runDir, 'diff.patch'));
    expect(evidence?.hasDiff).toBe(true);
    expect(evidence?.changedFiles.map((file) => file.path)).toEqual([
      'src/app.ts',
      'README.md',
    ]);
    expect(evidence?.additions).toBe(3);
    expect(evidence?.deletions).toBe(1);
  });
});
