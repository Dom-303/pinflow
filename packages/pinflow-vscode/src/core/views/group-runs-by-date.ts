import type { PinFlowRunEvidence } from '../run-evidence.js';

export interface GroupedRuns {
  readonly today: readonly PinFlowRunEvidence[];
  readonly lastSevenDays: readonly PinFlowRunEvidence[];
  readonly older: readonly PinFlowRunEvidence[];
}

const OLDER_BUCKET_CAP = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function groupRunsByDate(
  runs: readonly PinFlowRunEvidence[],
  now: Date,
): GroupedRuns {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWindow = startOfToday - 7 * MS_PER_DAY;

  const today: PinFlowRunEvidence[] = [];
  const lastSevenDays: PinFlowRunEvidence[] = [];
  const older: PinFlowRunEvidence[] = [];

  for (const run of runs) {
    const time = getRunTime(run);
    if (time >= startOfToday) today.push(run);
    else if (time >= startOfWindow) lastSevenDays.push(run);
    else older.push(run);
  }

  return { today, lastSevenDays, older: older.slice(0, OLDER_BUCKET_CAP) };
}

function getRunTime(run: PinFlowRunEvidence): number {
  const iso = run.summary.finishedAt ?? run.summary.startedAt;
  return iso ? new Date(iso).getTime() : 0;
}
