import type { ExternalHandoffClaim } from '../external-handoff.js';
import type { PerFolderState } from '../multi-folder-state.js';
import type { PinFlowWorkspaceResult } from '../workspace.js';
import { buildActionsViewItems, buildActionFolderGroups } from './actions-view-model.js';

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

function readyState(folder: string): PerFolderState {
  return {
    folder,
    status: {
      status: 'ready',
      workspaceFolder: folder,
      workspaceRoot: folder,
      appRoot: folder,
      relay: { host: '127.0.0.1', port: 4317, pid: 12345 },
      message: 'PinFlow ready',
    },
    runs: [],
  };
}

function notConfiguredState(folder: string): PerFolderState {
  return {
    folder,
    status: {
      status: 'not-configured',
      workspaceFolder: folder,
      message: 'PinFlow app not configured',
    },
    runs: [],
  };
}

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

describe('buildActionFolderGroups', () => {
  it('returns one group per folder with the existing actions', () => {
    const groups = buildActionFolderGroups(
      [{ folder: '/a', status: readyStatus(), runs: [] }],
      null,
      '/a',
    );

    expect(groups).toHaveLength(1);
    const ids = groups[0].children.map((c) => c.id);
    expect(ids).toContain('startWorkflow');
    expect(ids).toContain('followRuns');
    expect(ids).toContain('openLatestRun');
  });

  it('action commands include the folderPath argument', () => {
    const groups = buildActionFolderGroups(
      [{ folder: '/a', status: readyStatus(), runs: [] }],
      null,
      '/a',
    );

    const startWorkflow = groups[0].children.find((c) => c.id === 'startWorkflow');

    expect(startWorkflow?.commandArguments).toEqual(['/a']);
  });

  it('includes the global externalClaim row only on the active folder group when claim is set', () => {
    const claim: ExternalHandoffClaim = {
      annotationId: 'ann_x',
      promptPath: '/tmp/p',
      runDir: '/tmp',
      provider: 'codex',
    };

    const groups = buildActionFolderGroups(
      [
        { folder: '/a', status: readyStatus(), runs: [] },
        { folder: '/b', status: readyStatus(), runs: [] },
      ],
      claim,
      '/a',
    );

    const aClaimRow = groups.find((g) => g.id === '/a')!.children.find((c) => c.id === 'externalClaim');
    const bClaimRow = groups.find((g) => g.id === '/b')!.children.find((c) => c.id === 'externalClaim');
    expect(aClaimRow).toBeDefined();
    expect(bClaimRow).toBeUndefined();
  });
});

describe('buildActionFolderGroups with not-configured folder', () => {
  it('renders a single Setup action for not-configured state', () => {
    // Arrange
    const state = notConfiguredState('/repo');

    // Act
    const groups = buildActionFolderGroups([state], null, undefined);

    // Assert
    expect(groups).toHaveLength(1);
    expect(groups[0].children).toHaveLength(1);
    expect(groups[0].children[0]).toMatchObject({
      id: 'setup',
      label: 'Setup PinFlow',
      themeIcon: 'rocket',
      command: 'pinflow.runInit',
      commandArguments: ['/repo'],
    });
  });

  it('renders normal action set for configured + setup-only for unconfigured (mixed)', () => {
    // Arrange
    const states = [readyState('/repo/a'), notConfiguredState('/repo/b')];

    // Act
    const groups = buildActionFolderGroups(states, null, '/repo/a');

    // Assert
    expect(groups[0].children.length).toBeGreaterThanOrEqual(3);
    expect(groups[1].children).toHaveLength(1);
    expect(groups[1].children[0].id).toBe('setup');
  });

  it('not-configured group ignores externalClaim', () => {
    // Arrange
    const state = notConfiguredState('/repo');
    const claim: ExternalHandoffClaim = {
      annotationId: 'ann_ext',
      promptPath: '/tmp/p',
      runDir: '/tmp',
    };

    // Act
    const groups = buildActionFolderGroups([state], claim, '/repo');

    // Assert
    expect(groups[0].children).toHaveLength(1);
    expect(groups[0].children[0].id).toBe('setup');
  });
});
