import {
  findRunEvidence,
  type PinFlowRunEvidence,
} from './run-evidence.js';
import {
  getPinFlowWorkspaceStatus,
  getWorkspaceCandidateFolders,
  type PinFlowWorkspaceOptions,
  type PinFlowWorkspaceResult,
} from './workspace.js';

const RUN_EVIDENCE_LIMIT = 80;

export interface PerFolderState {
  readonly folder: string;
  readonly status: PinFlowWorkspaceResult;
  readonly runs: readonly PinFlowRunEvidence[];
}

export function expandToCandidateFolders(
  workspaceFolders: readonly string[],
): readonly string[] {
  const expanded = workspaceFolders.flatMap((folder) =>
    getWorkspaceCandidateFolders(folder),
  );
  return expanded.filter((folder) => {
    const status = getPinFlowWorkspaceStatus(folder);
    return status.status !== 'not-configured';
  });
}

export async function buildPerFolderState(
  folder: string,
  options: PinFlowWorkspaceOptions = {},
): Promise<PerFolderState> {
  const status = getPinFlowWorkspaceStatus(folder, options);
  const runs = status.workspaceRoot
    ? await findRunEvidence(status.workspaceRoot, { limit: RUN_EVIDENCE_LIMIT })
    : [];
  return { folder, status, runs };
}

export function pickActiveFolder(
  states: readonly PerFolderState[],
  preferredFolder: string,
): string | undefined {
  if (states.length === 0) return undefined;

  if (preferredFolder) {
    const match = states.find((s) => s.folder === preferredFolder);
    if (match) return match.folder;
  }

  const ready = states.find((s) => s.status.status === 'ready');
  if (ready) return ready.folder;

  return states[0]?.folder;
}
