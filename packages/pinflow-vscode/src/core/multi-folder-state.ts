import path from 'node:path';

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

// Matches the cap used by the single-folder dashboard (`runs-webview-provider`)
// so multi-folder mode shows the same "recent runs" window per repo.
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
  // Dedupe by workspaceRoot so sub-folders that all walkUp to the same
  // .pinflow/ collapse into one entry. Without this, a configured aluna/
  // with N sub-folders renders N accordions all pointing to aluna.
  const roots = new Set<string>();
  const result: string[] = [];
  for (const folder of expanded) {
    const status = getPinFlowWorkspaceStatus(folder);
    if (status.status === 'not-configured') continue;
    const root = status.workspaceRoot;
    if (root && !roots.has(root)) {
      roots.add(root);
      result.push(root);
    }
  }
  return result;
}

export function expandToAllWorkspaceFolders(
  workspaceFolders: readonly string[],
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const root of workspaceFolders) {
    const configured = expandToCandidateFolders([root]);
    if (configured.length > 0) {
      for (const folder of configured) {
        if (!seen.has(folder)) {
          seen.add(folder);
          result.push(folder);
        }
      }
    } else {
      const resolved = path.resolve(root);
      if (!seen.has(resolved)) {
        seen.add(resolved);
        result.push(resolved);
      }
    }
  }

  return result;
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

  return states[0].folder;
}
