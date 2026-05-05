import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  expandToCandidateFolders,
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
