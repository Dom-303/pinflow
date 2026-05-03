import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { PinFlowRunEvidence } from '../run-evidence.js';
import {
  buildRunsViewTree,
  expandTimelineMarker,
  type RunsViewTimelineMarkerNode,
} from './runs-view-model.js';

function makeRun(
  finishedAtIso: string,
  overrides: Partial<PinFlowRunEvidence> = {},
): PinFlowRunEvidence {
  return {
    annotationId: overrides.annotationId ?? 'ann_abc',
    runId: overrides.runId ?? 'r_abc',
    summaryPath: overrides.summaryPath ?? '/tmp/r/summary.json',
    summary: {
      annotationId: overrides.annotationId ?? 'ann_abc',
      runId: overrides.runId ?? 'r_abc',
      status: 'processed',
      provider: 'codex',
      finishedAt: finishedAtIso,
      ...overrides.summary,
    },
    promptPath: overrides.promptPath ?? null,
    transcriptPath: overrides.transcriptPath ?? null,
    diffPath: overrides.diffPath ?? null,
    hasDiff: overrides.hasDiff ?? false,
    changedFiles: overrides.changedFiles ?? [],
    additions: overrides.additions ?? 0,
    deletions: overrides.deletions ?? 0,
  };
}

describe('buildRunsViewTree', () => {
  const now = new Date(2026, 4, 3, 15, 0, 0, 0);

  it('returns the three group nodes with todays group expanded by default', () => {
    const groups = buildRunsViewTree([], now);

    expect(groups.map((group) => group.id)).toEqual(['today', 'lastSevenDays', 'older']);
    expect(groups[0].defaultExpanded).toBe(true);
    expect(groups[1].defaultExpanded).toBe(false);
    expect(groups[2].defaultExpanded).toBe(false);
  });

  it('formats run label as HH:MM dot annotationId using local time', () => {
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), { annotationId: 'ann_abc123' });

    const groups = buildRunsViewTree([run], now);
    const todayRuns = groups[0].children;

    const expected = `${String(finished.getHours()).padStart(2, '0')}:${String(finished.getMinutes()).padStart(2, '0')} · ann_abc123`;
    expect(todayRuns).toHaveLength(1);
    expect(todayRuns[0].label).toBe(expected);
  });

  it('describes a run with provider and diff summary when a diff is present', () => {
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), {
      hasDiff: true,
      additions: 5,
      deletions: 1,
      changedFiles: [{ path: 'a.ts' }, { path: 'b.ts' }],
    });

    const groups = buildRunsViewTree([run], now);

    expect(groups[0].children[0].description).toBe('via codex · +5 -1, 2 files');
  });

  it('omits diff.patch sub-item when run has no diff', () => {
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), {
      promptPath: '/tmp/r/prompt.md',
      transcriptPath: '/tmp/r/transcript.log',
      diffPath: null,
    });

    const groups = buildRunsViewTree([run], now);
    const evidenceLabels = groups[0].children[0].children.map((child) =>
      'label' in child ? child.label : child.kind,
    );

    expect(evidenceLabels).not.toContain('diff.patch');
  });

  it('emits a changedFiles node listing each file path', () => {
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), {
      hasDiff: true,
      changedFiles: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }],
    });

    const groups = buildRunsViewTree([run], now);
    const changedFiles = groups[0].children[0].children.find(
      (child) => child.kind === 'changedFiles',
    );

    expect(changedFiles?.kind).toBe('changedFiles');
    if (changedFiles?.kind !== 'changedFiles') return;
    expect(changedFiles.count).toBe(2);
    expect(changedFiles.children.map((file) => file.relativePath)).toEqual([
      'src/a.ts',
      'src/b.ts',
    ]);
    expect(changedFiles.runSummaryPath).toBe('/tmp/r/summary.json');
    expect(changedFiles.children[0].runSummaryPath).toBe('/tmp/r/summary.json');
  });

  it('emits a timelineMarker as the last evidence sub-item when transcript exists', () => {
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), {
      transcriptPath: '/tmp/r/transcript.log',
    });

    const groups = buildRunsViewTree([run], now);
    const lastChild = groups[0].children[0].children.at(-1);

    expect(lastChild?.kind).toBe('timelineMarker');
  });

  it('assigns loading-spin icon for a processing run', () => {
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), {
      summary: { status: 'processing' },
    });

    const groups = buildRunsViewTree([run], now);

    expect(groups[0].children[0].themeIcon).toBe('loading~spin');
    expect(groups[0].children[0].themeIconColor).toBeUndefined();
  });

  it('assigns error icon and red color for a failed run', () => {
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), {
      summary: { status: 'failed' },
    });

    const groups = buildRunsViewTree([run], now);

    expect(groups[0].children[0].themeIcon).toBe('error');
    expect(groups[0].children[0].themeIconColor).toBe('charts.red');
  });

  it('assigns circle-outline icon for an unknown status', () => {
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), {
      summary: { status: 'queued' },
    });

    const groups = buildRunsViewTree([run], now);

    expect(groups[0].children[0].themeIcon).toBe('circle-outline');
    expect(groups[0].children[0].themeIconColor).toBeUndefined();
  });
});

describe('expandTimelineMarker', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pinflow-runs-view-'));
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('returns lifecycle lines without the leading Timeline header', async () => {
    const transcriptPath = path.join(workspaceRoot, 'transcript.log');
    await mkdir(path.dirname(transcriptPath), { recursive: true });
    await writeFile(
      transcriptPath,
      [
        '[pinflow-runner] Run created: 120000-ann_abc',
        'Fixed the panel refresh state',
        'Verification: vitest passed',
        '[pinflow-runner] Command exited with code 0',
        '',
      ].join('\n'),
      'utf8',
    );
    const finished = new Date(2026, 4, 3, 14, 32, 0, 0);
    const run = makeRun(finished.toISOString(), { transcriptPath });
    const marker: RunsViewTimelineMarkerNode = { kind: 'timelineMarker', evidence: run };

    const lines = await expandTimelineMarker(marker);

    expect(lines.map((line) => line.label)).toEqual([
      'Task started',
      'Agent: Fixed the panel refresh state',
      'Verification: vitest passed',
      'Done',
    ]);
  });
});
