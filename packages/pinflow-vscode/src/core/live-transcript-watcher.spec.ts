import { mkdtemp, rm, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', async () => import('../__test-utils__/vscode-stub.js'));

import { workspace as workspaceStub } from '../__test-utils__/vscode-stub.js';
import { LiveTranscriptWatcher } from './live-transcript-watcher.js';
import type { TranscriptEvent } from './live-transcript-watcher.js';
import type { PinFlowRunEvidence } from './run-evidence.js';

async function tmpRun(): Promise<{ dir: string; transcript: string; diff: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'pinflow-watcher-'));
  return {
    dir,
    transcript: path.join(dir, 'transcript.log'),
    diff: path.join(dir, 'diff.patch'),
  };
}

function makeEvidence(transcript: string, diff: string): PinFlowRunEvidence {
  return {
    annotationId: 'ann_1',
    runId: 'r_1',
    summary: { status: 'processed' },
    summaryPath: '/repo/.pinflow/runs/r_1/summary.json',
    promptPath: null,
    transcriptPath: transcript,
    diffPath: diff,
    hasDiff: false,
    changedFiles: [],
    additions: 0,
    deletions: 0,
  };
}

describe('LiveTranscriptWatcher', () => {
  it('emits transcript:initial on construction with full file content', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, 'first line\nsecond line\n');
    await writeFile(diff, '');
    const events: TranscriptEvent[] = [];

    // Act
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;

    // Assert
    expect(events.find((e) => e.type === 'transcript:initial')).toMatchObject({
      type: 'transcript:initial',
      runId: 'r_1',
      text: 'first line\nsecond line\n',
      isLive: false,
    });

    // Cleanup
    watcher.dispose();
    await rm(dir, { recursive: true, force: true });
  });
});

describe('LiveTranscriptWatcher append behaviour', () => {
  it('emits transcript:append with delta when file grows', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, 'a\n');
    await writeFile(diff, '');
    const events: TranscriptEvent[] = [];
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;
    events.length = 0;

    // Act
    await appendFile(transcript, 'b\n');
    workspaceStub.__triggerChange?.(transcript);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'transcript:append',
        runId: 'r_1',
        delta: 'b\n',
      }),
    );

    // Cleanup
    watcher.dispose();
    await rm(dir, { recursive: true, force: true });
  });

  it('emits a fresh transcript:initial (not append) when file shrinks', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, 'long content here\n');
    await writeFile(diff, '');
    const events: TranscriptEvent[] = [];
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;
    events.length = 0;

    // Act
    await writeFile(transcript, 'tiny\n');
    workspaceStub.__triggerChange?.(transcript);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    const initial = events.find((e) => e.type === 'transcript:initial');
    expect(initial).toMatchObject({ type: 'transcript:initial', text: 'tiny\n' });
    expect(events.find((e) => e.type === 'transcript:append')).toBeUndefined();

    // Cleanup
    watcher.dispose();
    await rm(dir, { recursive: true, force: true });
  });
});

describe('LiveTranscriptWatcher diff updates', () => {
  it('re-parses diff and emits diff:update on diff.patch change', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, '');
    await writeFile(
      diff,
      'diff --git a/src/foo.ts b/src/foo.ts\n--- a/src/foo.ts\n+++ b/src/foo.ts\n+added\n',
    );
    const events: TranscriptEvent[] = [];
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;
    events.length = 0;

    // Act
    workspaceStub.__triggerChange?.(diff);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    const diffEvent = events.find((e) => e.type === 'diff:update');
    expect(diffEvent).toMatchObject({
      type: 'diff:update',
      runId: 'r_1',
      changedFiles: [expect.objectContaining({ path: 'src/foo.ts' })],
    });

    // Cleanup
    watcher.dispose();
    await rm(dir, { recursive: true, force: true });
  });
});

describe('LiveTranscriptWatcher disposal', () => {
  it('ignores subsequent change events after dispose', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, 'a');
    await writeFile(diff, '');
    const events: TranscriptEvent[] = [];
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;

    // Act
    watcher.dispose();
    events.length = 0;
    await appendFile(transcript, 'b');
    workspaceStub.__triggerChange?.(transcript);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(events).toEqual([]);

    // Cleanup
    await rm(dir, { recursive: true, force: true });
  });
});
