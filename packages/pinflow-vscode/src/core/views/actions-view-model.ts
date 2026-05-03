import type { ExternalHandoffClaim } from '../external-handoff.js';

export interface ActionsViewItem {
  readonly id: string;
  readonly label: string;
  readonly themeIcon: string;
  readonly command: string;
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
