import type { ExternalHandoffClaim } from '../external-handoff.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';
import type { PinFlowWorkspaceResult } from '../workspace.js';
import { buildStatusFolderGroups, buildStatusViewItems } from './status-view-model.js';

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

function relayMissingStatus(): PinFlowWorkspaceResult {
  return {
    status: 'relay-missing',
    workspaceFolder: '/repo',
    workspaceRoot: '/repo/app',
    appRoot: '/repo/app',
    message: 'PinFlow relay is not running',
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
  it('shows four rows when no external claim is held', () => {
    const items = buildStatusViewItems(readyStatus(), null);

    expect(items.map((item) => item.id)).toEqual(['relay', 'runner', 'workspace', 'preview']);
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
      'preview',
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

  it('keeps the workspace tooltip simple when only one folder is open', () => {
    const items = buildStatusViewItems(readyStatus(), null, null, {
      workspaceFolderCount: 1,
      workspaceFolderIndex: 0,
    });
    const workspace = items.find((item) => item.id === 'workspace');

    expect(workspace?.tooltip).toContain('/repo/app');
  });

  it('appends a multi-folder hint to the workspace tooltip when several are open', () => {
    const items = buildStatusViewItems(readyStatus(), null, null, {
      workspaceFolderCount: 3,
      workspaceFolderIndex: 0,
    });
    const workspace = items.find((item) => item.id === 'workspace');

    expect(workspace?.tooltip).toContain('/repo/app');
    expect(workspace?.tooltip).toContain('1 of 3 workspace folders');
  });

  it('omits the multi-folder hint when the active folder index is undefined', () => {
    const items = buildStatusViewItems(readyStatus(), null, null, {
      workspaceFolderCount: 3,
      workspaceFolderIndex: undefined,
    });
    const workspace = items.find((item) => item.id === 'workspace');

    expect(workspace?.tooltip).toContain('/repo/app');
  });

  it('describes the preview row with host:port and a clickable command when running', () => {
    const status: PinFlowWorkspaceResult = {
      ...readyStatus(),
      devServer: {
        host: 'localhost',
        port: 5173,
        url: 'http://localhost:5173/',
        pid: 9999,
      },
    };

    const items = buildStatusViewItems(status, null);
    const preview = items.find((item) => item.id === 'preview');

    expect(preview?.description).toBe('localhost:5173');
    expect(preview?.themeIcon).toBe('circle-filled');
    expect(preview?.themeIconColor).toBe('charts.green');
    expect(preview?.tooltip).toBe('http://localhost:5173/');
    expect(preview?.command).toEqual({
      command: 'pinflow.openPreview',
      arguments: ['http://localhost:5173/'],
    });
  });

  it('renders an inert preview row when no dev server is detected', () => {
    const items = buildStatusViewItems(readyStatus(), null);
    const preview = items.find((item) => item.id === 'preview');

    expect(preview?.description).toBe('not running');
    expect(preview?.themeIcon).toBe('circle-outline');
    expect(preview?.themeIconColor).toBeUndefined();
    expect(preview?.command).toBeUndefined();
    expect(preview?.tooltip).toBe(
      'No dev server detected. Start with PinFlow: Start Workflow.',
    );
  });

  it('makes the Workspace row clickable to trigger pinflow.switchFolder', () => {
    const items = buildStatusViewItems(readyStatus(), null);
    const workspace = items.find((item) => item.id === 'workspace');

    expect(workspace?.command).toEqual({
      command: 'pinflow.switchFolder',
      arguments: [],
    });
    expect(workspace?.tooltip).toContain('Click to switch folder');
  });

  it('makes the Runner row clickable to open settings', () => {
    const items = buildStatusViewItems(readyStatus(), null);
    const runner = items.find((item) => item.id === 'runner');

    expect(runner?.command).toEqual({
      command: 'workbench.action.openSettings',
      arguments: ['pinflow.externalHandoff.defaultProvider'],
    });
    expect(runner?.tooltip).toContain('Click to change');
  });

  it('makes the Relay row clickable only when status is relay-missing', () => {
    const relayMissingItems = buildStatusViewItems(relayMissingStatus(), null);
    const relayMissing = relayMissingItems.find((item) => item.id === 'relay');

    expect(relayMissing?.command).toEqual({
      command: 'pinflow.startWorkflow',
      arguments: [],
    });
    expect(relayMissing?.tooltip).toContain('Click to start the workflow');

    const readyItems = buildStatusViewItems(readyStatus(), null);
    const relayReady = readyItems.find((item) => item.id === 'relay');

    expect(relayReady?.command).toBeUndefined();
  });
});

describe('buildStatusFolderGroups', () => {
  it('returns empty array for no folders', () => {
    expect(buildStatusFolderGroups([], { activeFolder: undefined })).toEqual([]);
  });

  it('returns one group per folder with the existing 4 status rows', () => {
    const groups = buildStatusFolderGroups(
      [{ folder: '/a', status: readyStatus(), runs: [] }],
      { activeFolder: '/a' },
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].children.map((c) => c.id)).toEqual([
      'relay', 'runner', 'workspace', 'preview',
    ]);
  });

  it('marks isActive=true only for the active folder', () => {
    const groups = buildStatusFolderGroups(
      [
        { folder: '/a', status: readyStatus(), runs: [] },
        { folder: '/b', status: readyStatus(), runs: [] },
      ],
      { activeFolder: '/b' },
    );

    expect(groups.find((g) => g.id === '/a')?.isActive).toBe(false);
    expect(groups.find((g) => g.id === '/b')?.isActive).toBe(true);
  });

  it('reflects runCount in the group header', () => {
    const groups = buildStatusFolderGroups(
      [{ folder: '/a', status: readyStatus(), runs: [{} as never, {} as never, {} as never] }],
      { activeFolder: '/a' },
    );

    expect(groups[0].runCount).toBe(3);
  });
});
