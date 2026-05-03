import type { PinFlowRunEvidence } from '../run-evidence.js';
import { groupRunsByDate } from './group-runs-by-date.js';

function makeRun(finishedAtIso: string, idSuffix = '1'): PinFlowRunEvidence {
  return {
    annotationId: `ann_${idSuffix}`,
    runId: `r_${idSuffix}`,
    summaryPath: `/tmp/${idSuffix}/summary.json`,
    summary: {
      annotationId: `ann_${idSuffix}`,
      runId: `r_${idSuffix}`,
      status: 'processed',
      provider: 'codex',
      finishedAt: finishedAtIso,
    },
    promptPath: null,
    transcriptPath: null,
    diffPath: null,
    hasDiff: false,
    changedFiles: [],
    additions: 0,
    deletions: 0,
  };
}

describe('groupRunsByDate', () => {
  const now = new Date('2026-05-03T15:00:00.000Z');

  it('returns three empty groups for an empty input', () => {
    const grouped = groupRunsByDate([], now);

    expect(grouped.today).toEqual([]);
    expect(grouped.lastSevenDays).toEqual([]);
    expect(grouped.older).toEqual([]);
  });

  it('puts runs from the same local day into "today"', () => {
    const runs = [
      makeRun('2026-05-03T01:00:00.000Z', 'a'),
      makeRun('2026-05-03T23:00:00.000Z', 'b'),
    ];

    const grouped = groupRunsByDate(runs, now);

    expect(grouped.today.map((run) => run.annotationId)).toEqual(['ann_a', 'ann_b']);
    expect(grouped.lastSevenDays).toEqual([]);
    expect(grouped.older).toEqual([]);
  });

  it('puts runs from the previous seven days (excluding today) into lastSevenDays', () => {
    const runs = [
      makeRun('2026-05-02T12:00:00.000Z', 'yesterday'),
      makeRun('2026-04-27T12:00:00.000Z', 'sixDaysAgo'),
    ];

    const grouped = groupRunsByDate(runs, now);

    expect(grouped.today).toEqual([]);
    expect(grouped.lastSevenDays.map((run) => run.annotationId)).toEqual([
      'ann_yesterday',
      'ann_sixDaysAgo',
    ]);
    expect(grouped.older).toEqual([]);
  });

  it('puts runs older than seven days into older capped at 20', () => {
    const runs = Array.from({ length: 25 }, (_, index) =>
      makeRun('2026-04-01T12:00:00.000Z', `old_${index}`),
    );

    const grouped = groupRunsByDate(runs, now);

    expect(grouped.older).toHaveLength(20);
  });

  it('uses startedAt when finishedAt is missing', () => {
    const run: PinFlowRunEvidence = {
      ...makeRun('2026-05-03T08:00:00.000Z', 'started-only'),
      summary: {
        annotationId: 'ann_started-only',
        runId: 'r_started-only',
        status: 'processing',
        provider: 'codex',
        startedAt: '2026-05-03T08:00:00.000Z',
      },
    };

    const grouped = groupRunsByDate([run], now);

    expect(grouped.today).toHaveLength(1);
  });
});
