import { findLatestRunEvidence } from './run-evidence.js';

export interface EvidenceOpenActions {
  openFile(filePath: string): unknown;
  showInformationMessage(message: string): unknown;
}

export async function openLatestRunEvidence(
  workspaceRoot: string,
  actions: EvidenceOpenActions,
): Promise<void> {
  const evidence = await findLatestRunEvidence(workspaceRoot);

  if (!evidence) {
    actions.showInformationMessage('No PinFlow run evidence found yet.');
    return;
  }

  for (const filePath of [
    evidence.promptPath,
    evidence.transcriptPath,
    evidence.diffPath,
  ]) {
    if (filePath) {
      await actions.openFile(filePath);
    }
  }
}
