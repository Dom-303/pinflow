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

  it('marks runner as failed with error icon', () => {
    const run = runningRun();
    const failedRun: PinFlowRunEvidence = {
      ...run,
      summary: { ...run.summary, status: 'failed' },
    };

    const items = buildStatusViewItems(readyStatus(), null, failedRun);
    const runner = items.find((item) => item.id === 'runner');

    expect(runner?.description).toBe('via codex');
    expect(runner?.themeIcon).toBe('error');
    expect(runner?.themeIconColor).toBe('charts.red');
  });

  it('marks runner as processed with check icon', () => {
    const run = runningRun();
    const processedRun: PinFlowRunEvidence = {
      ...run,
      summary: { ...run.summary, status: 'processed' },
    };

    const items = buildStatusViewItems(readyStatus(), null, processedRun);
    const runner = items.find((item) => item.id === 'runner');

    expect(runner?.description).toBe('via codex');
    expect(runner?.themeIcon).toBe('check');
    expect(runner?.themeIconColor).toBe('charts.green');
  });

  it('marks relay as not configured when status is not-configured', () => {
    const status: PinFlowWorkspaceResult = {
      status: 'not-configured',
      workspaceFolder: '/repo',
      message: 'PinFlow app not configured',
    };

    const items = buildStatusViewItems(status, null);
    const relay = items.find((item) => item.id === 'relay');

    expect(relay?.description).toBe('not configured');
    expect(relay?.themeIcon).toBe('circle-outline');
  });
});
