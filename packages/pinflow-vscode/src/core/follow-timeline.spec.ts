import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildFollowTimelineItems } from './follow-timeline.js';
import type { PinFlowRunEvidence } from './run-evidence.js';

async function createTempWorkspace() {
  return mkdtemp(path.join(tmpdir(), 'pinflow-vscode-timeline-'));
}

async function writeText(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

function createEvidence(transcriptPath: string): PinFlowRunEvidence {
  return {
    annotationId: 'ann_abc12345_1',
    runId: '120000-ann_abc12345_1',
    summaryPath: path.join(path.dirname(transcriptPath), 'summary.json'),
    summary: {
      annotationId: 'ann_abc12345_1',
      runId: '120000-ann_abc12345_1',
      status: 'processed',
      provider: 'codex',
    },
    promptPath: path.join(path.dirname(transcriptPath), 'prompt.md'),
    transcriptPath,
    diffPath: path.join(path.dirname(transcriptPath), 'diff.patch'),
    hasDiff: true,
    changedFiles: [],
    additions: 0,
    deletions: 0,
  };
}

describe('buildFollowTimelineItems', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('keeps only concise lifecycle lines from the latest transcript', async () => {
    const transcriptPath = path.join(workspaceRoot, 'transcript.log');
    await writeText(
      transcriptPath,
      [
        '[pinflow-runner] Run created: 120000-ann_abc12345_1',
        'OpenAI Codex v1.2.3',
        'workdir: /repo',
        'Fixed the panel refresh state',
        'Verification: vitest passed',
        'diff --git a/src/app.ts b/src/app.ts',
        '[pinflow-runner] Command exited with code 0',
        '[pinflow-runner] Command exited with code 0',
        '',
      ].join('\n'),
    );

    const items = await buildFollowTimelineItems(createEvidence(transcriptPath));

    expect(items.map((item) => item.label)).toEqual([
      'Timeline',
      'Task started',
      'Agent: Fixed the panel refresh state',
      'Verification: vitest passed',
      'Done',
    ]);
  });

  it('can expose raw transcript details when requested', async () => {
    const transcriptPath = path.join(workspaceRoot, 'transcript.log');
    await writeText(
      transcriptPath,
      ['first raw line', 'second raw line', 'third raw line', ''].join('\n'),
    );

    const items = await buildFollowTimelineItems(createEvidence(transcriptPath), {
      mode: 'raw',
      maxLines: 2,
    });

    expect(items.map((item) => item.label)).toEqual([
      'Raw transcript',
      'second raw line',
      'third raw line',
    ]);
  });
});
