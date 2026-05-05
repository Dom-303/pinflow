import path from 'node:path';

import {
  getBestPinFlowWorkspaceStatus,
  getPinFlowWorkspaceStatus,
  getWorkspaceCandidateFolders,
  type ProcessProbe,
} from './workspace.js';

export interface FolderCandidate {
  readonly fsPath: string;
  readonly displayName: string;
  readonly status: 'ready' | 'relay-missing' | 'not-configured';
  readonly isActive: boolean;
}

export interface BuildFolderCandidatesOptions {
  readonly processProbe?: ProcessProbe;
  readonly preferredFolder?: string;
}

export function buildFolderCandidates(
  workspaceFolders: readonly string[],
  options: BuildFolderCandidatesOptions = {},
): readonly FolderCandidate[] {
  if (workspaceFolders.length === 0) return [];

  const expanded = workspaceFolders.flatMap((folder) =>
    getWorkspaceCandidateFolders(folder),
  );
  const active = getBestPinFlowWorkspaceStatus(workspaceFolders, options);
  const activeRoot = active?.workspaceRoot;

  return expanded.map((folder) => {
    const status = getPinFlowWorkspaceStatus(folder, options);
    return {
      fsPath: folder,
      displayName: path.basename(folder),
      status: status.status,
      isActive: folder === activeRoot,
    };
  });
}
