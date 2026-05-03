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

function makeRunOnLocalDay(year: number, month: number, day: number, hour: number, idSuffix = '1'): PinFlowRunEvidence {
  return makeRun(new Date(year, month, day, hour, 0, 0, 0).toISOString(), idSuffix);
}

describe('groupRunsByDate', () => {
  const now = new Date(2026, 4, 3, 15, 0, 0, 0); // May 3, 15:00 local

  it('returns three empty groups for an empty input', () => {
    const grouped = groupRunsByDate([], now);

    expect(grouped.today).toEqual([]);
    expect(grouped.lastSevenDays).toEqual([]);
    expect(grouped.older).toEqual([]);
  });

  it('puts runs from the same local day into "today"', () => {
    const runs = [
      makeRunOnLocalDay(2026, 4, 3, 1, 'a'),
      makeRunOnLocalDay(2026, 4, 3, 23, 'b'),
    ];

    const grouped = groupRunsByDate(runs, now);

    expect(grouped.today.map((run) => run.annotationId)).toEqual(['ann_a', 'ann_b']);
    expect(grouped.lastSevenDays).toEqual([]);
    expect(grouped.older).toEqual([]);
  });

  it('puts runs from the previous seven days (excluding today) into lastSevenDays', () => {
    const runs = [
      makeRunOnLocalDay(2026, 4, 2, 12, 'yesterday'),
      makeRunOnLocalDay(2026, 3, 27, 12, 'sixDaysAgo'),
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
      makeRunOnLocalDay(2026, 3, 1, 12, `old_${index}`),
    );

    const grouped = groupRunsByDate(runs, now);

    expect(grouped.older).toHaveLength(20);
  });

  it('uses startedAt when finishedAt is missing', () => {
    const run: PinFlowRunEvidence = {
      ...makeRun(new Date(2026, 4, 3, 8, 0, 0, 0).toISOString(), 'started-only'),
      summary: {
        annotationId: 'ann_started-only',
        runId: 'r_started-only',
        status: 'processing',
        provider: 'codex',
        startedAt: new Date(2026, 4, 3, 8, 0, 0, 0).toISOString(),
      },
    };

    const grouped = groupRunsByDate([run], now);

    expect(grouped.today).toHaveLength(1);
  });
});
