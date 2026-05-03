# PinFlow VS Code Extension — Package 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Explorer-side `pinflow.status` Tree with a dedicated PinFlow Activity-Bar container that hosts three structured views (Status, Runs, Actions), backed by pure view models, with polling bounded at limit 80 plus an older-bucket cap of 20.

**Architecture:** Pure view-model functions (`status-view-model`, `runs-view-model`, `group-runs-by-date`, `actions-view-model`) drive three thin `TreeDataProvider` subclasses that share no state. `findRunEvidence({ limit })` extends the existing run scanner without breaking `findLatestRunEvidence`. The VS Code-facing wiring stays in `extension.ts` and is the only file with `vscode` imports — view models stay platform-free and unit-testable. Spec source: `docs/superpowers/specs/2026-05-03-vscode-extension-package-2-design.md`.

**Tech Stack:** TypeScript 5 (ESM, `nodenext`), VS Code Extension API ≥ 1.90, Vitest, Nx, pnpm. No new runtime dependencies.

---

## Phase 0 — Pre-flight

### Task 0: Confirm baseline is green

**Files:** none

- [ ] **Step 1: Confirm we are on the correct branch**

Run: `git -C /home/domi/eventbaer/dev/pinflow rev-parse --abbrev-ref HEAD`
Expected: `codex/inline-picker-comment`

- [ ] **Step 2: Confirm working tree is clean**

Run: `git -C /home/domi/eventbaer/dev/pinflow status --porcelain`
Expected: empty output

- [ ] **Step 3: Run the full pinflow-vscode quality gate at baseline**

Run: `pnpm nx test pinflow-vscode && pnpm nx build pinflow-vscode && pnpm nx lint pinflow-vscode`
Expected: all green; record the vitest count as the baseline (last known: `10 files, 33 tests passed`).

---

## Phase 1 — Pure view models (TDD, no VS Code deps)

### Task 1: `group-runs-by-date` — pure date bucketing

**Files:**
- Create: `packages/pinflow-vscode/src/core/views/group-runs-by-date.ts`
- Test: `packages/pinflow-vscode/src/core/views/group-runs-by-date.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pinflow-vscode/src/core/views/group-runs-by-date.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test pinflow-vscode -- group-runs-by-date`
Expected: FAIL with module not found `./group-runs-by-date.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `packages/pinflow-vscode/src/core/views/group-runs-by-date.ts`:

```ts
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
    const time = runTime(run);
    if (time >= startOfToday) today.push(run);
    else if (time >= startOfWindow) lastSevenDays.push(run);
    else older.push(run);
  }

  return { today, lastSevenDays, older: older.slice(0, OLDER_BUCKET_CAP) };
}

function runTime(run: PinFlowRunEvidence): number {
  const iso = run.summary.finishedAt ?? run.summary.startedAt;
  return iso ? new Date(iso).getTime() : 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test pinflow-vscode -- group-runs-by-date`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/group-runs-by-date.ts \
        packages/pinflow-vscode/src/core/views/group-runs-by-date.spec.ts
git commit -m "feat(vscode): add group-runs-by-date view helper"
```

---

### Task 2: `status-view-model` — flat status row builder

**Files:**
- Create: `packages/pinflow-vscode/src/core/views/status-view-model.ts`
- Test: `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`:

```ts
import type { ExternalHandoffClaim } from '../external-handoff.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';
import type { PinFlowWorkspaceResult } from '../workspace.js';
import { buildStatusViewItems } from './status-view-model.js';

function readyStatus(): PinFlowWorkspaceResult {
  return {
    status: 'ready',
    workspaceFolder: '/repo',
    workspaceRoot: '/repo/app',
    appRoot: '/repo/app',
    relay: { host: '127.0.0.1', port: 4317, pid: 12345 },
    message: 'PinFlow ready',
  };
}

function runningRun(): PinFlowRunEvidence {
  return {
    annotationId: 'ann_x',
    runId: 'r_x',
    summaryPath: '/repo/app/.pinflow/runs/r/summary.json',
    summary: {
      annotationId: 'ann_x',
      runId: 'r_x',
      status: 'processing',
      provider: 'codex',
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

describe('buildStatusViewItems', () => {
  it('shows three rows when no external claim is held', () => {
    const items = buildStatusViewItems(readyStatus(), null);

    expect(items.map((item) => item.id)).toEqual(['relay', 'runner', 'workspace']);
  });

  it('formats relay row with host:port when ready', () => {
    const items = buildStatusViewItems(readyStatus(), null);
    const relay = items.find((item) => item.id === 'relay');

    expect(relay?.label).toBe('Relay');
    expect(relay?.description).toBe('127.0.0.1:4317');
    expect(relay?.themeIcon).toBe('circle-filled');
  });

  it('marks relay row as missing when relay-missing', () => {
    const status: PinFlowWorkspaceResult = {
      status: 'relay-missing',
      workspaceFolder: '/repo',
      workspaceRoot: '/repo/app',
      appRoot: '/repo/app',
      message: 'PinFlow relay is not running',
    };

    const items = buildStatusViewItems(status, null);
    const relay = items.find((item) => item.id === 'relay');

    expect(relay?.description).toBe('missing');
  });

  it('shows runner working state from latest run', () => {
    const items = buildStatusViewItems(readyStatus(), null, runningRun());
    const runner = items.find((item) => item.id === 'runner');

    expect(runner?.description).toBe('via codex');
    expect(runner?.themeIcon).toBe('loading~spin');
  });

  it('appends external-claim row when a claim is active', () => {
    const claim: ExternalHandoffClaim = {
      annotationId: 'ann_ext',
      promptPath: '/tmp/p',
      runDir: '/tmp',
      provider: 'codex',
    };

    const items = buildStatusViewItems(readyStatus(), claim);

    expect(items.map((item) => item.id)).toEqual([
      'relay',
      'runner',
      'workspace',
      'externalClaim',
    ]);
  });

  it('labels workspace row as Demo Fixture when monorepo demo path is active', () => {
    const status: PinFlowWorkspaceResult = {
      status: 'ready',
      workspaceFolder: '/home/dev/pinflow',
      workspaceRoot:
        '/home/dev/pinflow/packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts',
      appRoot:
        '/home/dev/pinflow/packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts',
      relay: { host: '127.0.0.1', port: 4317, pid: 12345 },
      message: 'PinFlow ready',
    };

    const items = buildStatusViewItems(status, null);
    const workspace = items.find((item) => item.id === 'workspace');

    expect(workspace?.description).toBe('Demo Fixture');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test pinflow-vscode -- status-view-model`
Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/pinflow-vscode/src/core/views/status-view-model.ts`:

```ts
import path from 'node:path';

import type { ExternalHandoffClaim } from '../external-handoff.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';
import type { PinFlowWorkspaceResult } from '../workspace.js';

export type StatusItemId = 'relay' | 'runner' | 'workspace' | 'externalClaim';

export interface StatusViewItem {
  readonly id: StatusItemId;
  readonly label: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly themeIcon: string;
  readonly themeIconColor?: string;
}

const DEMO_FIXTURE_SUFFIX = path.join(
  'packages',
  'pinflow-test-fixtures',
  'fixtures',
  'vite',
  'v5',
  'react-18-ts',
);

export function buildStatusViewItems(
  status: PinFlowWorkspaceResult,
  externalClaim: ExternalHandoffClaim | null,
  latestRun?: PinFlowRunEvidence | null,
): readonly StatusViewItem[] {
  const items: StatusViewItem[] = [
    buildRelayItem(status),
    buildRunnerItem(latestRun ?? null),
    buildWorkspaceItem(status),
  ];
  if (externalClaim) items.push(buildExternalClaimItem(externalClaim));
  return items;
}

function buildRelayItem(status: PinFlowWorkspaceResult): StatusViewItem {
  if (status.status === 'ready' && status.relay) {
    return {
      id: 'relay',
      label: 'Relay',
      description: `${status.relay.host}:${status.relay.port}`,
      tooltip: status.workspaceFolder,
      themeIcon: 'circle-filled',
      themeIconColor: 'charts.green',
    };
  }
  if (status.status === 'relay-missing') {
    return {
      id: 'relay',
      label: 'Relay',
      description: 'missing',
      tooltip: status.message,
      themeIcon: 'circle-filled',
      themeIconColor: 'charts.yellow',
    };
  }
  return {
    id: 'relay',
    label: 'Relay',
    description: 'not configured',
    tooltip: status.message,
    themeIcon: 'circle-outline',
  };
}

function buildRunnerItem(latestRun: PinFlowRunEvidence | null): StatusViewItem {
  const summary = latestRun?.summary;
  if (!summary) {
    return { id: 'runner', label: 'Runner', description: 'idle', themeIcon: 'circle-outline' };
  }
  const provider = summary.provider ?? 'unknown';
  if (summary.status === 'processing') {
    return { id: 'runner', label: 'Runner', description: `via ${provider}`, themeIcon: 'loading~spin' };
  }
  if (summary.status === 'failed') {
    return {
      id: 'runner',
      label: 'Runner',
      description: `via ${provider}`,
      themeIcon: 'error',
      themeIconColor: 'charts.red',
    };
  }
  if (summary.status === 'processed') {
    return {
      id: 'runner',
      label: 'Runner',
      description: `via ${provider}`,
      themeIcon: 'check',
      themeIconColor: 'charts.green',
    };
  }
  return {
    id: 'runner',
    label: 'Runner',
    description: `via ${provider}`,
    themeIcon: 'circle-outline',
  };
}

function buildWorkspaceItem(status: PinFlowWorkspaceResult): StatusViewItem {
  const appRoot = status.appRoot ?? status.workspaceFolder;
  const isDemoFixture = appRoot.endsWith(DEMO_FIXTURE_SUFFIX);
  return {
    id: 'workspace',
    label: 'Workspace',
    description: isDemoFixture ? 'Demo Fixture' : path.basename(appRoot),
    tooltip: appRoot,
    themeIcon: 'folder',
  };
}

function buildExternalClaimItem(claim: ExternalHandoffClaim): StatusViewItem {
  return {
    id: 'externalClaim',
    label: 'External Claim',
    description: claim.annotationId,
    tooltip: claim.label ?? claim.annotationId,
    themeIcon: 'bookmark',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test pinflow-vscode -- status-view-model`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/status-view-model.ts \
        packages/pinflow-vscode/src/core/views/status-view-model.spec.ts
git commit -m "feat(vscode): add status view model"
```

---

### Task 3: `actions-view-model` — context-dependent action list

**Files:**
- Create: `packages/pinflow-vscode/src/core/views/actions-view-model.ts`
- Test: `packages/pinflow-vscode/src/core/views/actions-view-model.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pinflow-vscode/src/core/views/actions-view-model.spec.ts`:

```ts
import type { ExternalHandoffClaim } from '../external-handoff.js';
import { buildActionsViewItems } from './actions-view-model.js';

describe('buildActionsViewItems', () => {
  it('returns the four default actions when no external claim is active', () => {
    const items = buildActionsViewItems(null);

    expect(items.map((item) => item.id)).toEqual([
      'startWorkflow',
      'followRuns',
      'openLatestRun',
      'externalClaim',
    ]);
  });

  it('prepends complete and fail actions when an external claim is active', () => {
    const claim: ExternalHandoffClaim = {
      annotationId: 'ann_ext',
      promptPath: '/tmp/p',
      runDir: '/tmp',
    };

    const items = buildActionsViewItems(claim);

    expect(items.map((item) => item.id)).toEqual([
      'externalComplete',
      'externalFail',
      'startWorkflow',
      'followRuns',
      'openLatestRun',
      'externalClaim',
    ]);
  });

  it('binds each item to a registered command', () => {
    const items = buildActionsViewItems(null);

    expect(items.map((item) => item.command)).toEqual([
      'pinflow.startWorkflow',
      'pinflow.followRuns',
      'pinflow.openLatestRun',
      'pinflow.externalClaim',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test pinflow-vscode -- actions-view-model`
Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/pinflow-vscode/src/core/views/actions-view-model.ts`:

```ts
import type { ExternalHandoffClaim } from '../external-handoff.js';

export interface ActionsViewItem {
  readonly id: string;
  readonly label: string;
  readonly themeIcon: string;
  readonly command: string;
}

const DEFAULT_ACTIONS: readonly ActionsViewItem[] = [
  { id: 'startWorkflow', label: 'Start Workflow', themeIcon: 'play', command: 'pinflow.startWorkflow' },
  { id: 'followRuns', label: 'Follow Runs', themeIcon: 'eye', command: 'pinflow.followRuns' },
  { id: 'openLatestRun', label: 'Open Latest Run', themeIcon: 'folder-opened', command: 'pinflow.openLatestRun' },
  { id: 'externalClaim', label: 'Claim External Task', themeIcon: 'bookmark', command: 'pinflow.externalClaim' },
];

const EXTERNAL_CLAIM_ACTIONS: readonly ActionsViewItem[] = [
  { id: 'externalComplete', label: 'Complete External Task', themeIcon: 'check', command: 'pinflow.externalComplete' },
  { id: 'externalFail', label: 'Fail External Task', themeIcon: 'close', command: 'pinflow.externalFail' },
];

export function buildActionsViewItems(
  externalClaim: ExternalHandoffClaim | null,
): readonly ActionsViewItem[] {
  if (!externalClaim) return DEFAULT_ACTIONS;
  return [...EXTERNAL_CLAIM_ACTIONS, ...DEFAULT_ACTIONS];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test pinflow-vscode -- actions-view-model`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/actions-view-model.ts \
        packages/pinflow-vscode/src/core/views/actions-view-model.spec.ts
git commit -m "feat(vscode): add actions view model"
```

---

### Task 4: `runs-view-model` — group + run + evidence tree builder

**Files:**
- Create: `packages/pinflow-vscode/src/core/views/runs-view-model.ts`
- Test: `packages/pinflow-vscode/src/core/views/runs-view-model.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pinflow-vscode/src/core/views/runs-view-model.spec.ts`:

```ts
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
  const now = new Date('2026-05-03T15:00:00.000Z');

  it('returns the three group nodes with todays group expanded by default', () => {
    const groups = buildRunsViewTree([], now);

    expect(groups.map((group) => group.id)).toEqual(['today', 'lastSevenDays', 'older']);
    expect(groups[0].defaultExpanded).toBe(true);
    expect(groups[1].defaultExpanded).toBe(false);
    expect(groups[2].defaultExpanded).toBe(false);
  });

  it('formats run label as HH:MM dot annotationId using local time', () => {
    const run = makeRun('2026-05-03T14:32:00.000Z', { annotationId: 'ann_abc123' });

    const groups = buildRunsViewTree([run], now);
    const todayRuns = groups[0].children;

    const local = new Date('2026-05-03T14:32:00.000Z');
    const expected = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')} · ann_abc123`;
    expect(todayRuns[0].label).toBe(expected);
  });

  it('describes a run with provider and diff summary when a diff is present', () => {
    const run = makeRun('2026-05-03T14:32:00.000Z', {
      hasDiff: true,
      additions: 5,
      deletions: 1,
      changedFiles: [{ path: 'a.ts' }, { path: 'b.ts' }],
    });

    const groups = buildRunsViewTree([run], now);

    expect(groups[0].children[0].description).toBe('via codex · +5 -1, 2 files');
  });

  it('omits diff.patch sub-item when run has no diff', () => {
    const run = makeRun('2026-05-03T14:32:00.000Z', {
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
    const run = makeRun('2026-05-03T14:32:00.000Z', {
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
  });

  it('emits a timelineMarker as the last evidence sub-item when transcript exists', () => {
    const run = makeRun('2026-05-03T14:32:00.000Z', {
      transcriptPath: '/tmp/r/transcript.log',
    });

    const groups = buildRunsViewTree([run], now);
    const lastChild = groups[0].children[0].children.at(-1);

    expect(lastChild?.kind).toBe('timelineMarker');
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
    const run = makeRun('2026-05-03T14:32:00.000Z', { transcriptPath });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test pinflow-vscode -- runs-view-model`
Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/pinflow-vscode/src/core/views/runs-view-model.ts`:

```ts
import { buildFollowTimelineItems } from '../follow-timeline.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';
import { groupRunsByDate } from './group-runs-by-date.js';

export type RunsViewNode =
  | RunsViewGroupNode
  | RunsViewRunNode
  | RunsViewEvidenceFileNode
  | RunsViewChangedFilesNode
  | RunsViewChangedFileNode
  | RunsViewTimelineMarkerNode
  | RunsViewTimelineLineNode;

export type RunsViewGroupId = 'today' | 'lastSevenDays' | 'older';

export interface RunsViewGroupNode {
  readonly kind: 'group';
  readonly id: RunsViewGroupId;
  readonly label: string;
  readonly children: readonly RunsViewRunNode[];
  readonly defaultExpanded: boolean;
}

export interface RunsViewRunNode {
  readonly kind: 'run';
  readonly run: PinFlowRunEvidence;
  readonly label: string;
  readonly description?: string;
  readonly themeIcon: string;
  readonly themeIconColor?: string;
  readonly children: readonly (
    | RunsViewEvidenceFileNode
    | RunsViewChangedFilesNode
    | RunsViewTimelineMarkerNode
  )[];
}

export type EvidenceFileLabel = 'prompt.md' | 'transcript.log' | 'diff.patch';

export interface RunsViewEvidenceFileNode {
  readonly kind: 'evidenceFile';
  readonly label: EvidenceFileLabel;
  readonly absolutePath: string;
}

export interface RunsViewChangedFilesNode {
  readonly kind: 'changedFiles';
  readonly count: number;
  readonly children: readonly RunsViewChangedFileNode[];
}

export interface RunsViewChangedFileNode {
  readonly kind: 'changedFile';
  readonly relativePath: string;
}

export interface RunsViewTimelineMarkerNode {
  readonly kind: 'timelineMarker';
  readonly evidence: PinFlowRunEvidence;
}

export interface RunsViewTimelineLineNode {
  readonly kind: 'timelineLine';
  readonly label: string;
}

export function buildRunsViewTree(
  runs: readonly PinFlowRunEvidence[],
  now: Date,
): readonly RunsViewGroupNode[] {
  const grouped = groupRunsByDate(runs, now);
  return [
    {
      kind: 'group',
      id: 'today',
      label: 'Today',
      children: grouped.today.map(buildRunNode),
      defaultExpanded: true,
    },
    {
      kind: 'group',
      id: 'lastSevenDays',
      label: 'Last 7 days',
      children: grouped.lastSevenDays.map(buildRunNode),
      defaultExpanded: false,
    },
    {
      kind: 'group',
      id: 'older',
      label: 'Older',
      children: grouped.older.map(buildRunNode),
      defaultExpanded: false,
    },
  ];
}

export async function expandTimelineMarker(
  marker: RunsViewTimelineMarkerNode,
): Promise<readonly RunsViewTimelineLineNode[]> {
  const items = await buildFollowTimelineItems(marker.evidence);
  return items.slice(1).map((item) => ({ kind: 'timelineLine', label: item.label }));
}

function buildRunNode(run: PinFlowRunEvidence): RunsViewRunNode {
  const time = new Date(run.summary.finishedAt ?? run.summary.startedAt ?? 0);
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const annotation = run.annotationId ?? 'unknown';
  const provider = run.summary.provider ?? 'unknown';

  const description = run.hasDiff
    ? `via ${provider} · +${run.additions} -${run.deletions}, ${formatFileCount(run.changedFiles.length)}`
    : `via ${provider}`;

  const icon = iconForStatus(run.summary.status);

  return {
    kind: 'run',
    run,
    label: `${hh}:${mm} · ${annotation}`,
    description,
    themeIcon: icon.icon,
    themeIconColor: icon.color,
    children: buildRunChildren(run),
  };
}

function buildRunChildren(
  run: PinFlowRunEvidence,
): readonly (
  | RunsViewEvidenceFileNode
  | RunsViewChangedFilesNode
  | RunsViewTimelineMarkerNode
)[] {
  const children: (
    | RunsViewEvidenceFileNode
    | RunsViewChangedFilesNode
    | RunsViewTimelineMarkerNode
  )[] = [];

  if (run.promptPath)
    children.push({ kind: 'evidenceFile', label: 'prompt.md', absolutePath: run.promptPath });
  if (run.transcriptPath)
    children.push({ kind: 'evidenceFile', label: 'transcript.log', absolutePath: run.transcriptPath });
  if (run.diffPath)
    children.push({ kind: 'evidenceFile', label: 'diff.patch', absolutePath: run.diffPath });
  if (run.changedFiles.length > 0) {
    children.push({
      kind: 'changedFiles',
      count: run.changedFiles.length,
      children: run.changedFiles.map((file) => ({ kind: 'changedFile', relativePath: file.path })),
    });
  }
  if (run.transcriptPath) children.push({ kind: 'timelineMarker', evidence: run });
  return children;
}

function iconForStatus(status?: string): { icon: string; color?: string } {
  if (status === 'processing') return { icon: 'loading~spin' };
  if (status === 'failed') return { icon: 'error', color: 'charts.red' };
  if (status === 'processed') return { icon: 'check', color: 'charts.green' };
  return { icon: 'circle-outline' };
}

function formatFileCount(count: number): string {
  return count === 1 ? '1 file' : `${count} files`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test pinflow-vscode -- runs-view-model`
Expected: PASS, 7 tests (6 in `buildRunsViewTree`, 1 in `expandTimelineMarker`).

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/runs-view-model.ts \
        packages/pinflow-vscode/src/core/views/runs-view-model.spec.ts
git commit -m "feat(vscode): add runs view model with timeline expansion"
```

---

## Phase 2 — Run-evidence: bounded scan

### Task 5: Add `findRunEvidence({ limit })`, keep `findLatestRunEvidence` working

**Files:**
- Modify: `packages/pinflow-vscode/src/core/run-evidence.ts`
- Modify: `packages/pinflow-vscode/src/core/run-evidence.spec.ts`

- [ ] **Step 1: Add a failing test for the new function**

Append to `packages/pinflow-vscode/src/core/run-evidence.spec.ts` a new top-level `describe('findRunEvidence', ...)` block. Update the import at the top to include both functions:

```ts
import { findLatestRunEvidence, findRunEvidence } from './run-evidence.js';
```

Then add the new describe block (the existing `describe('findLatestRunEvidence', ...)` stays untouched):

```ts
describe('findRunEvidence', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('returns runs sorted newest first', async () => {
    const olderRunDir = path.join(
      workspaceRoot,
      '.pinflow', 'runs', '2026-04', '2026-04-30', '090000-ann_old_1',
    );
    await writeJson(path.join(olderRunDir, 'summary.json'), {
      annotationId: 'ann_old_1',
      runId: '090000-ann_old_1',
      status: 'processed',
      provider: 'codex',
      finishedAt: '2026-04-30T09:01:00.000Z',
    });

    const newerRunDir = path.join(
      workspaceRoot,
      '.pinflow', 'runs', '2026-05', '2026-05-01', '120000-ann_new_1',
    );
    await writeJson(path.join(newerRunDir, 'summary.json'), {
      annotationId: 'ann_new_1',
      runId: '120000-ann_new_1',
      status: 'processed',
      provider: 'codex',
      finishedAt: '2026-05-01T12:01:00.000Z',
    });

    const runs = await findRunEvidence(workspaceRoot);

    expect(runs.map((run) => run.annotationId)).toEqual(['ann_new_1', 'ann_old_1']);
  });

  it('caps results at the supplied limit', async () => {
    for (let index = 0; index < 5; index += 1) {
      const runDir = path.join(
        workspaceRoot,
        '.pinflow', 'runs', '2026-05', '2026-05-01', `1200${index}0-ann_${index}`,
      );
      await writeJson(path.join(runDir, 'summary.json'), {
        annotationId: `ann_${index}`,
        runId: `1200${index}0-ann_${index}`,
        status: 'processed',
        provider: 'codex',
        finishedAt: `2026-05-01T12:0${index}:00.000Z`,
      });
    }

    const runs = await findRunEvidence(workspaceRoot, { limit: 3 });

    expect(runs).toHaveLength(3);
    expect(runs[0].annotationId).toBe('ann_4');
  });

  it('returns an empty array when no .pinflow/runs directory exists', async () => {
    const runs = await findRunEvidence(workspaceRoot);

    expect(runs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test pinflow-vscode -- run-evidence`
Expected: FAIL — `findRunEvidence is not a function`.

- [ ] **Step 3: Implement the new function and refactor `findLatestRunEvidence` to delegate**

Edit `packages/pinflow-vscode/src/core/run-evidence.ts`:

(a) Add a new exported interface alongside the existing ones:

```ts
export interface FindRunEvidenceOptions {
  readonly limit?: number;
}
```

(b) Add a new exported function `findRunEvidence` that does what the existing `findLatestRunEvidence` does, but returns an array, optionally capped, and reuses a private `buildEvidence` helper. Replace the body of `findLatestRunEvidence` with a thin wrapper, and extract the per-summary expansion into a private helper. The final shape of the file's exported functions:

```ts
export async function findRunEvidence(
  workspaceRoot: string,
  options: FindRunEvidenceOptions = {},
): Promise<PinFlowRunEvidence[]> {
  const summaryPaths = await findSummaryFiles(
    path.join(workspaceRoot, '.pinflow', 'runs'),
  );
  const summaries: Array<{ summary: PinFlowRunSummary; summaryPath: string }> = [];

  for (const summaryPath of summaryPaths) {
    try {
      summaries.push({
        summary: JSON.parse(await readFile(summaryPath, 'utf8')) as PinFlowRunSummary,
        summaryPath,
      });
    } catch {
      // Ignore partially written run evidence.
    }
  }

  summaries.sort((left, right) => summaryTime(right.summary) - summaryTime(left.summary));

  const capped = options.limit ? summaries.slice(0, options.limit) : summaries;
  const evidence: PinFlowRunEvidence[] = [];
  for (const entry of capped) evidence.push(await buildEvidence(workspaceRoot, entry));
  return evidence;
}

export async function findLatestRunEvidence(
  workspaceRoot: string,
): Promise<PinFlowRunEvidence | null> {
  const [latest = null] = await findRunEvidence(workspaceRoot, { limit: 1 });
  return latest;
}
```

(c) Add a private helper that contains the per-summary path-resolution + diff-parsing block from the current `findLatestRunEvidence` body:

```ts
async function buildEvidence(
  workspaceRoot: string,
  entry: { summary: PinFlowRunSummary; summaryPath: string },
): Promise<PinFlowRunEvidence> {
  const runDir = path.dirname(entry.summaryPath);
  const promptPath = await resolveExistingRunPath(workspaceRoot, runDir, entry.summary.promptPath, 'prompt.md');
  const transcriptPath = await resolveExistingRunPath(workspaceRoot, runDir, entry.summary.transcriptPath, 'transcript.log');
  const diffPath = await resolveExistingRunPath(workspaceRoot, runDir, entry.summary.diffPath, 'diff.patch');
  const diff = diffPath ? await readFile(diffPath, 'utf8').catch(() => '') : '';
  const parsedDiff = parseDiff(diff);

  return {
    annotationId: entry.summary.annotationId,
    runId: entry.summary.runId,
    summary: entry.summary,
    summaryPath: entry.summaryPath,
    promptPath,
    transcriptPath,
    diffPath,
    ...parsedDiff,
  };
}
```

Leave `findSummaryFiles`, `resolveExistingRunPath`, `fileExists`, `resolveWorkspacePath`, `summaryTime`, and `parseDiff` exactly as they are.

- [ ] **Step 4: Run all run-evidence tests to verify both old and new pass**

Run: `pnpm nx test pinflow-vscode -- run-evidence`
Expected: PASS — original `findLatestRunEvidence` test still green, three new `findRunEvidence` tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/run-evidence.ts \
        packages/pinflow-vscode/src/core/run-evidence.spec.ts
git commit -m "feat(vscode): add bounded findRunEvidence with limit option"
```

---

## Phase 3 — Manifest, asset, and command surface

### Task 6: Hand-draw the monochrome sidebar SVG

**Files:**
- Create: `packages/pinflow-vscode/media/sidebar-icon.svg`

- [ ] **Step 1: Create the SVG asset**

Create `packages/pinflow-vscode/media/sidebar-icon.svg` exactly:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M5 3.5h6.5a8.5 8.5 0 1 1 0 17H5a.75.75 0 0 1-.75-.75V4.25A.75.75 0 0 1 5 3.5Zm.75 1.5v14h5.75a7 7 0 0 0 0-14H5.75Z"/>
  <path fill="currentColor" d="M11.6 9.4a.7.7 0 0 1 1 0l5 5a.7.7 0 0 1-.5 1.2h-2.3l1.5 2.6a.7.7 0 0 1-1.2.7l-1.5-2.6-1.7 1.7a.7.7 0 0 1-1.2-.5v-7.6a.7.7 0 0 1 .9-.5Z"/>
  <path fill="currentColor" d="M9.4 6.5h.6a.5.5 0 0 1 0 1h-.6a.5.5 0 0 1 0-1Zm-2 1.4.4-.4a.5.5 0 0 1 .7.7l-.4.4a.5.5 0 0 1-.7-.7Zm-1 2.1h.6a.5.5 0 0 1 0 1h-.6a.5.5 0 0 1 0-1Z"/>
</svg>
```

- [ ] **Step 2: Visual smoke check**

Open the file in VS Code's preview pane and confirm a recognizable D + arrow + click-rays motif. No automated test — Activity-Bar rendering is verified during the manual smoke gate.

- [ ] **Step 3: Commit**

```bash
git add packages/pinflow-vscode/media/sidebar-icon.svg
git commit -m "feat(vscode): add monochrome sidebar icon"
```

---

### Task 7: Update `package.json` contributions and activation events

**Files:**
- Modify: `packages/pinflow-vscode/package.json`

- [ ] **Step 1: Replace the `activationEvents` and `contributes` blocks**

In `packages/pinflow-vscode/package.json`, replace the `activationEvents` array and the entire `contributes` block with the values below. Keep all other fields (`name`, `displayName`, `version`, `publisher`, `main`, `icon`, `engines`, `categories`, `keywords`, `scripts`, `repository`, `bugs`, `homepage`, `galleryBanner`, `preview`, `license`, `type`) untouched.

`activationEvents` →

```jsonc
[
  "onStartupFinished",
  "onView:pinflow.status",
  "onView:pinflow.runs",
  "onView:pinflow.actions",
  "onCommand:pinflow.openPanel",
  "onCommand:pinflow.openContainer",
  "onCommand:pinflow.followRuns",
  "onCommand:pinflow.openLatestRun",
  "onCommand:pinflow.startWorkflow",
  "onCommand:pinflow.refreshPanel",
  "onCommand:pinflow.externalClaim",
  "onCommand:pinflow.externalComplete",
  "onCommand:pinflow.externalFail",
  "onCommand:pinflow.openRunDirectory",
  "onCommand:pinflow.openRunDiff"
]
```

`contributes` →

```jsonc
{
  "viewsContainers": {
    "activitybar": [
      { "id": "pinflow", "title": "PinFlow", "icon": "media/sidebar-icon.svg" }
    ]
  },
  "views": {
    "pinflow": [
      { "id": "pinflow.status",  "name": "Status"  },
      { "id": "pinflow.runs",    "name": "Runs"    },
      { "id": "pinflow.actions", "name": "Actions" }
    ]
  },
  "commands": [
    { "command": "pinflow.openPanel",        "title": "PinFlow: Open Panel",            "category": "PinFlow" },
    { "command": "pinflow.openContainer",    "title": "PinFlow: Show Sidebar",          "category": "PinFlow" },
    { "command": "pinflow.followRuns",       "title": "PinFlow: Follow Runs",           "category": "PinFlow" },
    { "command": "pinflow.openLatestRun",    "title": "PinFlow: Open Latest Run",       "category": "PinFlow" },
    { "command": "pinflow.startWorkflow",    "title": "PinFlow: Start Workflow",        "category": "PinFlow" },
    { "command": "pinflow.refreshPanel",     "title": "PinFlow: Refresh Panel",         "category": "PinFlow", "icon": "$(refresh)" },
    { "command": "pinflow.externalClaim",    "title": "PinFlow: Claim External Task",   "category": "PinFlow" },
    { "command": "pinflow.externalComplete", "title": "PinFlow: Complete External Task","category": "PinFlow" },
    { "command": "pinflow.externalFail",     "title": "PinFlow: Fail External Task",    "category": "PinFlow" },
    { "command": "pinflow.openRunDirectory", "title": "PinFlow: Open Run Directory",    "category": "PinFlow", "icon": "$(go-to-file)" },
    { "command": "pinflow.openRunDiff",      "title": "PinFlow: Open Run Diff",         "category": "PinFlow", "icon": "$(diff)" }
  ],
  "menus": {
    "view/title": [
      { "command": "pinflow.refreshPanel", "when": "view == pinflow.runs",    "group": "navigation" },
      { "command": "pinflow.refreshPanel", "when": "view == pinflow.actions", "group": "navigation" }
    ],
    "view/item/context": [
      { "command": "pinflow.openRunDiff",      "when": "viewItem == pinflow.run", "group": "inline" },
      { "command": "pinflow.openRunDirectory", "when": "viewItem == pinflow.run", "group": "inline" }
    ]
  }
}
```

- [ ] **Step 2: Run the manifest spec to confirm it now fails**

Run: `pnpm nx test pinflow-vscode -- extension-manifest`
Expected: FAIL — old assertions about explorer view + 8-command list are now invalid. This confirms the spec is the gate that pins the manifest shape.

- [ ] **Step 3: Update `extension-manifest.spec.ts` to match the new shape**

Replace `packages/pinflow-vscode/src/extension-manifest.spec.ts` with:

```ts
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('VS Code extension manifest', () => {
  const manifest = JSON.parse(
    readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
  ) as {
    activationEvents?: string[];
    bugs?: { url?: string };
    description?: string;
    displayName?: string;
    galleryBanner?: { color?: string; theme?: string };
    homepage?: string;
    icon?: string;
    keywords?: string[];
    license?: string;
    main?: string;
    preview?: boolean;
    private?: boolean;
    publisher?: string;
    repository?: { type?: string; url?: string; directory?: string };
    scripts?: Record<string, string>;
    contributes?: {
      commands?: Array<{ command: string; title: string; category?: string; icon?: string }>;
      viewsContainers?: { activitybar?: Array<{ id: string; title: string; icon: string }> };
      views?: Record<string, Array<{ id: string; name: string }>>;
      menus?: Record<string, Array<{ command: string; when: string; group: string }>>;
    };
  };
  const packageRoot = path.resolve(__dirname, '..');

  it('points VS Code at the compiled extension entrypoint', () => {
    expect(manifest.main).toBe('./dist/extension.js');
  });

  it('has marketplace-ready package metadata without publishing by default', () => {
    expect(manifest.displayName).toBe('PinFlow');
    expect(manifest.description).toContain('local PinFlow workflow');
    expect(manifest.publisher).toBe('dom-303');
    expect(manifest.license).toBe('MIT');
    expect(manifest.private).toBeUndefined();
    expect(manifest.preview).toBe(true);
    expect(manifest.icon).toBe('media/icon.png');
    expect(existsSync(path.join(packageRoot, manifest.icon))).toBe(true);
    expect(existsSync(path.join(packageRoot, 'LICENSE'))).toBe(true);
    expect(existsSync(path.join(packageRoot, '.vscodeignore'))).toBe(true);
    expect(manifest.galleryBanner).toEqual({ color: '#111111', theme: 'dark' });
    expect(manifest.keywords).toEqual(
      expect.arrayContaining(['pinflow', 'ui-to-code', 'coding-agent', 'vscode-extension']),
    );
    expect(manifest.homepage).toBe('https://github.com/Dom-303/pinflow#readme');
    expect(manifest.bugs?.url).toBe('https://github.com/Dom-303/pinflow/issues');
  });

  it('defines local packaging scripts but no publish script', () => {
    expect(manifest.scripts?.['package:vsix']).toBe(
      'corepack pnpm dlx @vscode/vsce package --no-dependencies --out ../../tmp/pinflow-vscode.vsix',
    );
    expect(manifest.scripts?.publish).toBeUndefined();
  });

  it('contributes the package-2 PinFlow commands', () => {
    expect(manifest.contributes?.commands?.map((c) => c.command)).toEqual([
      'pinflow.openPanel',
      'pinflow.openContainer',
      'pinflow.followRuns',
      'pinflow.openLatestRun',
      'pinflow.startWorkflow',
      'pinflow.refreshPanel',
      'pinflow.externalClaim',
      'pinflow.externalComplete',
      'pinflow.externalFail',
      'pinflow.openRunDirectory',
      'pinflow.openRunDiff',
    ]);
  });

  it('contributes the PinFlow Activity-Bar container with three views', () => {
    expect(manifest.contributes?.viewsContainers?.activitybar).toEqual([
      { id: 'pinflow', title: 'PinFlow', icon: 'media/sidebar-icon.svg' },
    ]);
    expect(existsSync(path.join(packageRoot, 'media', 'sidebar-icon.svg'))).toBe(true);
    expect(manifest.contributes?.views?.['pinflow']).toEqual([
      { id: 'pinflow.status', name: 'Status' },
      { id: 'pinflow.runs', name: 'Runs' },
      { id: 'pinflow.actions', name: 'Actions' },
    ]);
    expect(manifest.contributes?.views?.['explorer']).toBeUndefined();
    expect(manifest.activationEvents).toEqual(
      expect.arrayContaining([
        'onView:pinflow.status',
        'onView:pinflow.runs',
        'onView:pinflow.actions',
        'onCommand:pinflow.openContainer',
        'onCommand:pinflow.openRunDiff',
        'onCommand:pinflow.openRunDirectory',
      ]),
    );
  });

  it('wires refresh and inline run actions into the menus contribution', () => {
    expect(manifest.contributes?.menus?.['view/title']).toEqual([
      { command: 'pinflow.refreshPanel', when: 'view == pinflow.runs',    group: 'navigation' },
      { command: 'pinflow.refreshPanel', when: 'view == pinflow.actions', group: 'navigation' },
    ]);
    expect(manifest.contributes?.menus?.['view/item/context']).toEqual([
      { command: 'pinflow.openRunDiff',      when: 'viewItem == pinflow.run', group: 'inline' },
      { command: 'pinflow.openRunDirectory', when: 'viewItem == pinflow.run', group: 'inline' },
    ]);
  });
});
```

- [ ] **Step 4: Run the manifest spec to verify it passes**

Run: `pnpm nx test pinflow-vscode -- extension-manifest`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/package.json \
        packages/pinflow-vscode/src/extension-manifest.spec.ts
git commit -m "feat(vscode): contribute pinflow activity-bar container and menus"
```

---

## Phase 4 — Wire it up

This phase rewires `extension.ts` against the new view models. The plan delivers it as a series of focused edits against the current file rather than as one big overwrite, so the existing imports/helpers (`startStandardWorkflow`, `formatPinFlowCliCommand`, `openLatestRunEvidence`, `claim*External*` helpers, `createExternalActions`, `hasRepoDiff`, `openEvidenceFile`, `getCurrentWorkspace`, `getCurrentWorkspaceRoot`, `getWorkspaceFolders`, `formatStatusText`) stay byte-identical.

### Task 8a: Delete the obsolete panel model

**Files:**
- Delete: `packages/pinflow-vscode/src/core/panel-model.ts`
- Delete: `packages/pinflow-vscode/src/core/panel-model.spec.ts`

- [ ] **Step 1: Delete both files**

```bash
rm packages/pinflow-vscode/src/core/panel-model.ts \
   packages/pinflow-vscode/src/core/panel-model.spec.ts
```

- [ ] **Step 2: Confirm no other source still references panel-model**

Run: `grep -rn "panel-model" packages/pinflow-vscode/src`
Expected: only matches inside `extension.ts` (which we're about to fix). If any other file matches, stop and re-examine the design — that file was not meant to depend on `panel-model`.

- [ ] **Step 3: Do not commit yet** — `extension.ts` will fail to typecheck until Task 8b. Move directly to Task 8b without committing.

---

### Task 8b: Rewire `extension.ts` to use the new view models and three providers

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

- [ ] **Step 1: Replace the imports block at the top of `extension.ts`**

Find the block that imports from `./core/panel-model.js` and replace the four core-imports lines (`startStandardWorkflow`, `formatPinFlowCliCommand`, `openLatestRunEvidence`, `claim*External*` types/values, `buildPinFlowPanelItems`) so the panel-model import is removed and the view-model imports are added. Concretely, replace the existing import block ending at `from './core/workspace.js';` with:

```ts
import { startStandardWorkflow } from './core/commands.js';
import { formatPinFlowCliCommand } from './core/cli-command.js';
import { openLatestRunEvidence } from './core/evidence-commands.js';
import {
  claimExternalHandoff,
  completeExternalHandoff,
  failExternalHandoff,
  type ExternalHandoffActions,
  type ExternalHandoffClaim,
} from './core/external-handoff.js';
import { findRunEvidence } from './core/run-evidence.js';
import {
  buildActionsViewItems,
  type ActionsViewItem,
} from './core/views/actions-view-model.js';
import {
  buildRunsViewTree,
  expandTimelineMarker,
  type RunsViewChangedFileNode,
  type RunsViewChangedFilesNode,
  type RunsViewEvidenceFileNode,
  type RunsViewGroupNode,
  type RunsViewRunNode,
  type RunsViewTimelineLineNode,
  type RunsViewTimelineMarkerNode,
} from './core/views/runs-view-model.js';
import {
  buildStatusViewItems,
  type StatusViewItem,
} from './core/views/status-view-model.js';
import { getBestPinFlowWorkspaceStatus } from './core/workspace.js';
```

- [ ] **Step 2: Add the polling-cap constant immediately after the imports**

After `const execFileAsync = promisify(execFile);`, add:

```ts
const RUN_EVIDENCE_LIMIT = 80;

type RunsViewElement =
  | RunsViewGroupNode
  | RunsViewRunNode
  | RunsViewEvidenceFileNode
  | RunsViewChangedFilesNode
  | RunsViewChangedFileNode
  | RunsViewTimelineMarkerNode
  | RunsViewTimelineLineNode;
```

- [ ] **Step 3: Replace the body of `activate()` from `const treeProvider = ...` through the existing `setInterval(refreshStatus, 3000)` block**

The opening `vscode.window.createStatusBarItem` setup (statusItem creation, `statusItem.command = 'pinflow.openPanel'`, push to subscriptions) stays. After that, replace through to the end of `activate` with:

```ts
  const statusProvider = new StatusTreeDataProvider();
  const runsProvider = new RunsTreeDataProvider();
  const actionsProvider = new ActionsTreeDataProvider();
  let externalClaim: ExternalHandoffClaim | null = null;

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('pinflow.status', statusProvider),
    vscode.window.registerTreeDataProvider('pinflow.runs', runsProvider),
    vscode.window.registerTreeDataProvider('pinflow.actions', actionsProvider),
  );

  const refreshStatus = () => {
    void refreshAll();
  };

  async function refreshAll(): Promise<void> {
    const workspaceFolders = getWorkspaceFolders();

    if (!workspaceFolders.length) {
      statusItem.text = 'PinFlow: no workspace';
      statusItem.tooltip = 'Open a workspace folder to use PinFlow.';
      statusItem.show();
      statusProvider.setItems([]);
      runsProvider.setRoots([]);
      actionsProvider.setItems(buildActionsViewItems(externalClaim));
      return;
    }

    const workspaceStatus = getBestPinFlowWorkspaceStatus(workspaceFolders);
    if (!workspaceStatus) return;

    statusItem.text = formatStatusText(workspaceStatus.status);
    statusItem.tooltip = workspaceStatus.message;
    statusItem.show();

    const runEvidence = workspaceStatus.workspaceRoot
      ? await findRunEvidence(workspaceStatus.workspaceRoot, { limit: RUN_EVIDENCE_LIMIT })
      : [];

    statusProvider.setItems(
      buildStatusViewItems(workspaceStatus, externalClaim, runEvidence[0] ?? null),
    );
    runsProvider.setRoots(buildRunsViewTree(runEvidence, new Date()));
    actionsProvider.setItems(buildActionsViewItems(externalClaim));
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('pinflow.openContainer', () => {
      refreshStatus();
      void vscode.commands.executeCommand('workbench.view.extension.pinflow');
    }),
    vscode.commands.registerCommand('pinflow.openPanel', () => {
      void vscode.commands.executeCommand('pinflow.openContainer');
    }),
    vscode.commands.registerCommand('pinflow.refreshPanel', () => {
      refreshStatus();
    }),
    vscode.commands.registerCommand('pinflow.followRuns', () => {
      const workspace = getCurrentWorkspace();
      const terminal = vscode.window.createTerminal({
        name: 'PinFlow Follow',
        cwd: workspace?.commandRoot,
      });
      terminal.sendText(
        workspace
          ? formatPinFlowCliCommand(workspace.commandRoot, ['follow'], workspace.appRoot)
          : 'pinflow follow',
      );
      terminal.show();
    }),
    vscode.commands.registerCommand('pinflow.openLatestRun', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();
      if (!workspaceRoot) {
        await vscode.window.showInformationMessage('Open a configured PinFlow workspace first.');
        return;
      }
      await openLatestRunEvidence(workspaceRoot, {
        openFile: openEvidenceFile,
        showInformationMessage: (message) => vscode.window.showInformationMessage(message),
      });
    }),
    vscode.commands.registerCommand('pinflow.openEvidenceFile', async (filePath) => {
      if (typeof filePath !== 'string') return;
      await openEvidenceFile(filePath);
    }),
    vscode.commands.registerCommand('pinflow.startWorkflow', () => {
      const workspace = getCurrentWorkspace();
      if (!workspace) {
        void vscode.window.showInformationMessage('Open a configured PinFlow workspace first.');
        return;
      }
      startStandardWorkflow(
        workspace.commandRoot,
        (name, cwd) => vscode.window.createTerminal({ name, cwd }),
        workspace.appRoot,
      );
    }),
    vscode.commands.registerCommand('pinflow.externalClaim', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();
      if (!workspaceRoot) {
        await vscode.window.showInformationMessage('Open a configured PinFlow workspace first.');
        return;
      }
      externalClaim = await claimExternalHandoff(workspaceRoot, createExternalActions());
      refreshStatus();
    }),
    vscode.commands.registerCommand('pinflow.externalComplete', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();
      if (!workspaceRoot || !externalClaim) {
        await vscode.window.showInformationMessage('Claim an external PinFlow task first.');
        return;
      }
      const completed = await completeExternalHandoff(
        workspaceRoot,
        externalClaim,
        createExternalActions(),
      );
      if (completed) externalClaim = null;
      refreshStatus();
    }),
    vscode.commands.registerCommand('pinflow.externalFail', async () => {
      const workspaceRoot = getCurrentWorkspaceRoot();
      if (!workspaceRoot || !externalClaim) {
        await vscode.window.showInformationMessage('Claim an external PinFlow task first.');
        return;
      }
      const reason = await vscode.window.showInputBox({
        prompt: 'Why should this external PinFlow task fail?',
        placeHolder: 'User cancelled the external session.',
        value: 'User cancelled the external session.',
      });
      if (!reason?.trim()) return;
      await failExternalHandoff(workspaceRoot, externalClaim, reason.trim(), createExternalActions());
      externalClaim = null;
      refreshStatus();
    }),
    vscode.commands.registerCommand(
      'pinflow.openRunDiff',
      async (node: RunsViewRunNode | undefined) => {
        const diffPath = node?.run?.diffPath;
        if (!diffPath) {
          await vscode.window.showInformationMessage('This run has no diff.patch.');
          return;
        }
        await openEvidenceFile(diffPath);
      },
    ),
    vscode.commands.registerCommand(
      'pinflow.openRunDirectory',
      async (node: RunsViewRunNode | undefined) => {
        const summaryPath = node?.run?.summaryPath;
        if (!summaryPath) return;
        const dir = vscode.Uri.file(summaryPath.replace(/\/summary\.json$/, ''));
        await vscode.commands.executeCommand('revealFileInOS', dir);
      },
    ),
    vscode.workspace.onDidChangeWorkspaceFolders(refreshStatus),
  );

  const refreshTimer = setInterval(refreshStatus, 3000);
  context.subscriptions.push({ dispose: () => clearInterval(refreshTimer) });

  refreshStatus();
}
```

- [ ] **Step 4: Replace the `PinFlowTreeDataProvider` class at the bottom of the file with three new provider classes**

Delete the existing `class PinFlowTreeDataProvider implements vscode.TreeDataProvider<PinFlowPanelItem>` and everything below it (the file ends with that class). Append the three new providers in its place:

```ts
class StatusTreeDataProvider
  implements vscode.TreeDataProvider<StatusViewItem>
{
  private readonly emitter = new vscode.EventEmitter<StatusViewItem | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private items: readonly StatusViewItem[] = [];

  setItems(items: readonly StatusViewItem[]): void {
    this.items = items;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: StatusViewItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.description = element.description;
    item.tooltip = element.tooltip;
    item.iconPath = element.themeIconColor
      ? new vscode.ThemeIcon(element.themeIcon, new vscode.ThemeColor(element.themeIconColor))
      : new vscode.ThemeIcon(element.themeIcon);
    return item;
  }

  getChildren(element?: StatusViewItem): readonly StatusViewItem[] {
    return element ? [] : this.items;
  }
}

class ActionsTreeDataProvider
  implements vscode.TreeDataProvider<ActionsViewItem>
{
  private readonly emitter = new vscode.EventEmitter<ActionsViewItem | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private items: readonly ActionsViewItem[] = [];

  setItems(items: readonly ActionsViewItem[]): void {
    this.items = items;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: ActionsViewItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.iconPath = new vscode.ThemeIcon(element.themeIcon);
    item.command = { command: element.command, title: element.label };
    return item;
  }

  getChildren(element?: ActionsViewItem): readonly ActionsViewItem[] {
    return element ? [] : this.items;
  }
}

class RunsTreeDataProvider
  implements vscode.TreeDataProvider<RunsViewElement>
{
  private readonly emitter = new vscode.EventEmitter<RunsViewElement | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private roots: readonly RunsViewGroupNode[] = [];

  setRoots(roots: readonly RunsViewGroupNode[]): void {
    this.roots = roots;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: RunsViewElement): vscode.TreeItem {
    if (element.kind === 'group') {
      const item = new vscode.TreeItem(
        `${element.label} (${element.children.length})`,
        element.defaultExpanded
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `group:${element.id}`;
      return item;
    }

    if (element.kind === 'run') {
      const item = new vscode.TreeItem(
        element.label,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `run:${element.run.runId ?? element.run.summaryPath}`;
      item.description = element.description;
      item.contextValue = 'pinflow.run';
      item.iconPath = element.themeIconColor
        ? new vscode.ThemeIcon(element.themeIcon, new vscode.ThemeColor(element.themeIconColor))
        : new vscode.ThemeIcon(element.themeIcon);
      return item;
    }

    if (element.kind === 'evidenceFile') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.id = `evidence:${element.absolutePath}`;
      item.iconPath = new vscode.ThemeIcon('file');
      item.command = {
        command: 'pinflow.openEvidenceFile',
        title: `Open ${element.label}`,
        arguments: [element.absolutePath],
      };
      return item;
    }

    if (element.kind === 'changedFiles') {
      const item = new vscode.TreeItem(
        `Changed files (${element.count})`,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `changedFiles:${element.count}`;
      item.iconPath = new vscode.ThemeIcon('files');
      return item;
    }

    if (element.kind === 'changedFile') {
      const item = new vscode.TreeItem(element.relativePath, vscode.TreeItemCollapsibleState.None);
      item.id = `changedFile:${element.relativePath}`;
      item.iconPath = new vscode.ThemeIcon('file');
      return item;
    }

    if (element.kind === 'timelineMarker') {
      const item = new vscode.TreeItem('Timeline', vscode.TreeItemCollapsibleState.Collapsed);
      item.id = `timeline:${element.evidence.summaryPath}`;
      item.iconPath = new vscode.ThemeIcon('timeline-view-icon');
      return item;
    }

    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('debug-stackframe-dot');
    return item;
  }

  async getChildren(element?: RunsViewElement): Promise<readonly RunsViewElement[]> {
    if (!element) return this.roots;
    if (element.kind === 'group') return element.children;
    if (element.kind === 'run') return element.children;
    if (element.kind === 'changedFiles') return element.children;
    if (element.kind === 'timelineMarker') return expandTimelineMarker(element);
    return [];
  }
}
```

- [ ] **Step 5: Run the full extension test suite**

Run: `pnpm nx test pinflow-vscode`
Expected: PASS — `panel-model.spec.ts` is gone; new view-model + manifest specs are green; existing follow-timeline / cli-command / commands / evidence-commands / external-handoff / workspace / run-evidence / package-smoke specs still green.

- [ ] **Step 6: Run build, lint, and `git diff --check`**

Run: `pnpm nx build pinflow-vscode && pnpm nx lint pinflow-vscode && git -C /home/domi/eventbaer/dev/pinflow diff --check`
Expected: build emits `dist/`, lint clean, `git diff --check` empty.

- [ ] **Step 7: Commit (single commit covers Task 8a + Task 8b)**

```bash
git add packages/pinflow-vscode/src/extension.ts
git rm  packages/pinflow-vscode/src/core/panel-model.ts \
        packages/pinflow-vscode/src/core/panel-model.spec.ts
git commit -m "feat(vscode): wire pinflow activity-bar with status/runs/actions providers"
```

---

## Phase 5 — End-to-end verification

### Task 9: Build VSIX and run the manual smoke test

**Files:** none

- [ ] **Step 1: Rebuild the VSIX**

Run: `pnpm --filter pinflow-vscode package:vsix`
Expected: `tmp/pinflow-vscode.vsix` is overwritten with the new build, no warnings about missing files.

- [ ] **Step 2: Install the new VSIX**

In a separate VS Code window (the host VS Code, not Claude's terminal):
1. Command Palette → "Extensions: Install from VSIX..." → select `tmp/pinflow-vscode.vsix`
2. Reload window when prompted

Expected: extension "PinFlow" reports the new version after reload.

- [ ] **Step 3: Verify Activity-Bar container appears**

In VS Code, look at the left Activity Bar.
Expected: a new monochrome icon appears (the hand-drawn D + cursor). Click it.

- [ ] **Step 4: Verify all three views populate**

With the PinFlow container open:
Expected:
- **Status** view shows Relay / Runner / Workspace rows. Workspace description reads `Demo Fixture` when working from the pinflow monorepo root.
- **Runs** view shows three groups (`Today`, `Last 7 days`, `Older`). At least the most recent monorepo demo run appears under `Today` after running `PinFlow: Start Workflow`.
- **Actions** view shows four default action items.

- [ ] **Step 5: Trigger a run and verify the new run appears within 3 s**

In VS Code Command Palette: `PinFlow: Start Workflow`. Wait for the run to complete in the `PinFlow Follow` terminal.
Expected: within 3 s of completion, a new entry appears at the top of `Today` in the Runs view with label `HH:MM · ann_…`.

- [ ] **Step 6: Verify run children expansion**

Expand the new run.
Expected:
- `prompt.md`, `transcript.log`, `diff.patch` (if present) appear
- `Changed files (N)` appears and is expandable into the individual files
- `Timeline` appears and, when expanded, shows the lifecycle lines (Task started → agent lines → Done)

Click `prompt.md`. Expected: the prompt opens in the editor.

- [ ] **Step 7: Verify inline run actions**

Hover over the run row.
Expected: `diff` and `go-to-file` icons appear at the right edge. Click `diff` → diff.patch opens. Click `go-to-file` → run directory opens in OS file explorer (or VS Code shows a "Reveal in Explorer" prompt).

- [ ] **Step 8: Verify Status-bar still focuses the new container**

Click the `PinFlow: ready` (or current state) status-bar item.
Expected: focus jumps to the PinFlow Activity-Bar container.

- [ ] **Step 9: Final clean state check**

Run: `git -C /home/domi/eventbaer/dev/pinflow status --porcelain`
Expected: empty (all changes from Phase 1–4 are committed).

- [ ] **Step 10: No push, no release**

Do **not** run `git push` or any publish command at this point. The branch stays local until the user explicitly approves the merge/release. Report success and the list of commits added (`git log --oneline fddac0f..HEAD`) to the user, then stop.

---

## Quality Gate (run any time, mandatory before reporting completion)

```bash
pnpm nx test pinflow-vscode
pnpm nx build pinflow-vscode
pnpm nx lint pinflow-vscode
git -C /home/domi/eventbaer/dev/pinflow diff --check
```

All four must be green. If any step fails, fix the underlying issue (do not skip hooks, do not amend earlier commits — create a new commit for the fix).
