import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildFolderCandidates } from './folder-picker.js';

describe('buildFolderCandidates', () => {
  let workspaceA: string;
  let workspaceB: string;

  beforeEach(async () => {
    workspaceA = await mkdtemp(path.join(tmpdir(), 'pinflow-fp-a-'));
    workspaceB = await mkdtemp(path.join(tmpdir(), 'pinflow-fp-b-'));
  });

  afterEach(async () => {
    await rm(workspaceA, { recursive: true, force: true });
    await rm(workspaceB, { recursive: true, force: true });
  });

  it('returns one candidate per workspace folder when none are configured', () => {
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: () => false,
    });
    expect(candidates).toHaveLength(2);
    expect(candidates.every((c) => c.status === 'not-configured')).toBe(true);
  });

  it('marks a configured folder as relay-missing when probe says no relay running', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: () => false,
    });
    const a = candidates.find((c) => c.fsPath === workspaceA);
    expect(a?.status).toBe('relay-missing');
  });

  it('marks a configured folder as ready when relay lock is valid and pid is alive', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceA, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4400, pid: 1 }),
    );
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: (pid) => pid === 1,
    });
    const a = candidates.find((c) => c.fsPath === workspaceA);
    expect(a?.status).toBe('ready');
  });

  it('marks isActive on the folder picked by getBestPinFlowWorkspaceStatus', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await mkdir(path.join(workspaceB, '.pinflow'), { recursive: true });
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: () => false,
    });
    const active = candidates.filter((c) => c.isActive);
    expect(active).toHaveLength(1);
    expect(active[0]?.fsPath).toBe(workspaceA);
  });

  it('honors a preferredFolder override when computing isActive', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await mkdir(path.join(workspaceB, '.pinflow'), { recursive: true });
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: () => false,
      preferredFolder: workspaceB,
    });
    const active = candidates.filter((c) => c.isActive);
    expect(active).toHaveLength(1);
    expect(active[0]?.fsPath).toBe(workspaceB);
  });

  it('returns an empty array when no workspace folders are open', () => {
    const candidates = buildFolderCandidates([], {});
    expect(candidates).toEqual([]);
  });
});
