import path from 'node:path';

import type { ExternalHandoffClaim } from '../external-handoff.js';
import type { PerFolderState } from '../multi-folder-state.js';

export type ActionsViewItemId =
  | 'startWorkflow'
  | 'followRuns'
  | 'openLatestRun'
  | 'externalClaim'
  | 'externalComplete'
  | 'externalFail'
  | 'setup';

export interface ActionsViewItem {
  readonly id: ActionsViewItemId;
  readonly label: string;
  readonly themeIcon: string;
  readonly command: string;
  readonly commandArguments?: readonly unknown[];
}

export interface ActionFolderGroup {
  readonly id: string;
  readonly displayName: string;
  readonly isActive: boolean;
  readonly children: readonly ActionsViewItem[];
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

const FOLDER_COMMAND_IDS = new Set<ActionsViewItemId>(['startWorkflow', 'followRuns', 'openLatestRun']);

const SETUP_ACTION_BASE: Omit<ActionsViewItem, 'commandArguments'> = {
  id: 'setup' as ActionsViewItemId,
  label: 'Setup PinFlow',
  themeIcon: 'rocket',
  command: 'pinflow.runInit',
};

export function buildActionFolderGroups(
  folders: readonly PerFolderState[],
  externalClaim: ExternalHandoffClaim | null,
  activeFolder: string | undefined,
): readonly ActionFolderGroup[] {
  return folders.map((state) => {
    const isConfigured = state.status.status !== 'not-configured';

    if (!isConfigured) {
      return {
        id: state.folder,
        displayName: path.basename(state.folder),
        isActive: state.folder === activeFolder,
        children: [{ ...SETUP_ACTION_BASE, commandArguments: [state.folder] }],
      };
    }

    const isActive = state.folder === activeFolder;
    const claimForFolder = isActive ? externalClaim : null;
    const items = buildActionsViewItems(claimForFolder).filter(
      // Hide the "Claim External Task" button on inactive folders when a claim is already held
      (item) => isActive || item.id !== 'externalClaim' || !externalClaim,
    );
    const children = items.map<ActionsViewItem>((item) =>
      FOLDER_COMMAND_IDS.has(item.id)
        ? { ...item, commandArguments: [state.folder] }
        : item,
    );
    return {
      id: state.folder,
      displayName: path.basename(state.folder),
      isActive,
      children,
    };
  });
}
