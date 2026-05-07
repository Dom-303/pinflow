import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  expandToCandidateFolders,
  expandToAllWorkspaceFolders,
  buildPerFolderState,
  pickActiveFolder,
} from './multi-folder-state.js';

describe('expandToCandidateFolders', () => {
  let workspaceA: string;
  let workspaceB: string;

  beforeEach(async () => {
    workspaceA = await mkdtemp(path.join(tmpdir(), 'pinflow-mfs-a-'));
    workspaceB = await mkdtemp(path.join(tmpdir(), 'pinflow-mfs-b-'));
  });

  afterEach(async () => {
    await rm(workspaceA, { recursive: true, force: true });
    await rm(workspaceB, { recursive: true, force: true });
  });

  it('returns only configured folders, filtering out not-configured', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });

    const result = expandToCandidateFolders([workspaceA, workspaceB]);

    expect(result).toContain(workspaceA);
    expect(result).not.toContain(workspaceB);
  });

  it('expands nested .pinflow/ via getWorkspaceCandidateFolders', async () => {
    const nested = path.join(workspaceA, 'sub-app');
    await mkdir(path.join(nested, '.pinflow'), { recursive: true });

    const result = expandToCandidateFolders([workspaceA]);

    expect(result).toContain(nested);
  });

  it('returns empty array when no folders are configured', () => {
    const result = expandToCandidateFolders([workspaceA, workspaceB]);

    expect(result).toEqual([]);
  });

  it('dedupes by workspaceRoot when sub-folders walk up to the same .pinflow/', async () => {
    // Arrange — workspaceA configured at root, with several sub-folders that
    // would otherwise each render as a distinct PerFolderState even though
    // they all belong to the same configured project.
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await mkdir(path.join(workspaceA, 'docs'), { recursive: true });
    await mkdir(path.join(workspaceA, 'reports'), { recursive: true });
    await mkdir(path.join(workspaceA, 'assets'), { recursive: true });

    // Act
    const result = expandToCandidateFolders([workspaceA]);

    // Assert
    expect(result).toEqual([workspaceA]);
  });

  it('keeps distinct entries when nested sub-folders have their own .pinflow/', async () => {
    // Arrange — workspaceA has .pinflow/ at root AND a nested sub-app with its
    // own .pinflow/ — these are two genuinely distinct PinFlow projects.
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await mkdir(path.join(workspaceA, 'app', '.pinflow'), { recursive: true });

    // Act
    const result = expandToCandidateFolders([workspaceA]);

    // Assert
    expect(result).toContain(workspaceA);
    expect(result).toContain(path.join(workspaceA, 'app'));
    expect(result).toHaveLength(2);
  });
});

describe('buildPerFolderState', () => {
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(path.join(tmpdir(), 'pinflow-pfs-'));
    await mkdir(path.join(folder, '.pinflow'), { recursive: true });
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('returns folder + status + empty runs when no runs exist', async () => {
    const state = await buildPerFolderState(folder, { processProbe: () => false });

    expect(state.folder).toBe(folder);
    expect(state.status.status).toBe('relay-missing');
    expect(state.runs).toEqual([]);
  });
});

describe('pickActiveFolder', () => {
  it('returns undefined for empty folder list', () => {
    expect(pickActiveFolder([], '')).toBeUndefined();
  });

  it('honors the preferredFolder when matching one of the candidates', () => {
    const folders = [
      { folder: '/a', status: { status: 'ready' as const, workspaceFolder: '/a', message: '' }, runs: [] },
      { folder: '/b', status: { status: 'ready' as const, workspaceFolder: '/b', message: '' }, runs: [] },
    ];

    const active = pickActiveFolder(folders, '/b');

    expect(active).toBe('/b');
  });

  it('falls back to first ready folder when preferredFolder does not match', () => {
    const folders = [
      { folder: '/a', status: { status: 'relay-missing' as const, workspaceFolder: '/a', message: '' }, runs: [] },
      { folder: '/b', status: { status: 'ready' as const, workspaceFolder: '/b', message: '' }, runs: [] },
    ];

    const active = pickActiveFolder(folders, '');

    expect(active).toBe('/b');
  });

  it('falls back to first folder when none is ready', () => {
    const folders = [
      { folder: '/a', status: { status: 'relay-missing' as const, workspaceFolder: '/a', message: '' }, runs: [] },
      { folder: '/b', status: { status: 'relay-missing' as const, workspaceFolder: '/b', message: '' }, runs: [] },
    ];

    const active = pickActiveFolder(folders, '');

    expect(active).toBe('/a');
  });
});

describe('expandToAllWorkspaceFolders', () => {
  let tempUnconfiguredA: string;
  let tempUnconfiguredB: string;
  let tempConfiguredA: string;
  let tempConfiguredB: string;
  let tempRootWithNestedPinflow: string;

  beforeEach(async () => {
    tempUnconfiguredA = await mkdtemp(path.join(tmpdir(), 'pinflow-etawf-ua-'));
    tempUnconfiguredB = await mkdtemp(path.join(tmpdir(), 'pinflow-etawf-ub-'));
    tempConfiguredA = await mkdtemp(path.join(tmpdir(), 'pinflow-etawf-ca-'));
    tempConfiguredB = await mkdtemp(path.join(tmpdir(), 'pinflow-etawf-cb-'));
    tempRootWithNestedPinflow = await mkdtemp(path.join(tmpdir(), 'pinflow-etawf-rn-'));

    await mkdir(path.join(tempConfiguredA, '.pinflow'), { recursive: true });
    await mkdir(path.join(tempConfiguredB, '.pinflow'), { recursive: true });
    await mkdir(path.join(tempRootWithNestedPinflow, 'app', '.pinflow'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempUnconfiguredA, { recursive: true, force: true });
    await rm(tempUnconfiguredB, { recursive: true, force: true });
    await rm(tempConfiguredA, { recursive: true, force: true });
    await rm(tempConfiguredB, { recursive: true, force: true });
    await rm(tempRootWithNestedPinflow, { recursive: true, force: true });
  });

  it('returns all workspace folders when none are configured', () => {
    // Arrange
    const folders = [tempUnconfiguredA, tempUnconfiguredB];

    // Act
    const result = expandToAllWorkspaceFolders(folders);

    // Assert
    expect(result).toEqual(folders);
  });

  it('returns nested configured candidates plus unconfigured roots', () => {
    // Arrange
    const root1 = tempRootWithNestedPinflow;
    const root2 = tempUnconfiguredB;

    // Act
    const result = expandToAllWorkspaceFolders([root1, root2]);

    // Assert
    expect(result).toEqual([path.join(root1, 'app'), root2]);
  });

  it('excludes monorepo parent when only a child is configured', () => {
    // Regression: extension.ts wires overlay-settings bridges through this helper.
    // A naive iteration over vscode.workspace.workspaceFolders would create a
    // bridge at the parent and write a stray .pinflow/ there.
    // Arrange
    const monorepoRoot = tempRootWithNestedPinflow;

    // Act
    const result = expandToAllWorkspaceFolders([monorepoRoot]);

    // Assert
    expect(result).toEqual([path.join(monorepoRoot, 'app')]);
    expect(result).not.toContain(monorepoRoot);
  });

  it('matches expandToCandidateFolders when all configured', () => {
    // Arrange
    const folders = [tempConfiguredA, tempConfiguredB];

    // Act
    const all = expandToAllWorkspaceFolders(folders);
    const configured = expandToCandidateFolders(folders);

    // Assert
    expect(all).toEqual(configured);
  });

  it('dedupes when same path arrives via multiple inputs', () => {
    // Arrange
    const folders = [tempConfiguredA, tempConfiguredA];

    // Act
    const result = expandToAllWorkspaceFolders(folders);

    // Assert
    expect(result).toEqual([tempConfiguredA]);
  });

  it('preserves input order', () => {
    // Arrange
    const folders = [tempUnconfiguredB, tempConfiguredA, tempUnconfiguredA];

    // Act
    const result = expandToAllWorkspaceFolders(folders);

    // Assert
    expect(result[0]).toBe(tempUnconfiguredB);
    expect(result[1]).toBe(tempConfiguredA);
    expect(result[2]).toBe(tempUnconfiguredA);
  });
});
