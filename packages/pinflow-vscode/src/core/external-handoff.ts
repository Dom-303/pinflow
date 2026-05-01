export interface ExternalHandoffClaim {
  readonly annotationId: string;
  readonly promptPath: string;
  readonly runDir: string;
  readonly provider?: string;
  readonly label?: string;
}

export interface ExternalHandoffActions {
  runCommand(
    command: string,
    args: string[],
    options: { cwd: string },
  ): Promise<{ stdout: string; stderr: string }>;
  openFile(filePath: string): unknown;
  showInformationMessage(message: string): unknown;
  hasRepoDiff(workspaceRoot: string): Promise<boolean>;
}

interface ExternalClaimJson {
  readonly found?: boolean;
  readonly annotationId?: string;
  readonly promptPath?: string;
  readonly runDir?: string;
  readonly provider?: string;
  readonly label?: string;
}

export async function claimExternalHandoff(
  workspaceRoot: string,
  actions: ExternalHandoffActions,
): Promise<ExternalHandoffClaim | null> {
  const result = await actions.runCommand(
    'pinflow',
    [
      'external',
      'claim',
      '--provider',
      'codex',
      '--label',
      'VS Code',
      '--json',
    ],
    { cwd: workspaceRoot },
  );
  const claim = parseClaimJson(result.stdout);

  if (!claim) {
    actions.showInformationMessage(
      'No released PinFlow task available for external handoff.',
    );
    return null;
  }

  await actions.openFile(claim.promptPath);
  actions.showInformationMessage(
    `External PinFlow task claimed: ${claim.annotationId}`,
  );
  return claim;
}

export async function completeExternalHandoff(
  workspaceRoot: string,
  claim: ExternalHandoffClaim,
  actions: ExternalHandoffActions,
): Promise<boolean> {
  if (!(await actions.hasRepoDiff(workspaceRoot))) {
    actions.showInformationMessage(
      'PinFlow external complete needs a real local repo diff first.',
    );
    return false;
  }

  await actions.runCommand(
    'pinflow',
    [
      'external',
      'complete',
      claim.annotationId,
      '--run-dir',
      claim.runDir,
      '--message',
      'Completed from VS Code external handoff.',
    ],
    { cwd: workspaceRoot },
  );
  actions.showInformationMessage(
    `External PinFlow task completed: ${claim.annotationId}`,
  );
  return true;
}

export async function failExternalHandoff(
  workspaceRoot: string,
  claim: ExternalHandoffClaim,
  reason: string,
  actions: ExternalHandoffActions,
): Promise<void> {
  await actions.runCommand(
    'pinflow',
    [
      'external',
      'fail',
      claim.annotationId,
      '--run-dir',
      claim.runDir,
      '--error',
      reason,
    ],
    { cwd: workspaceRoot },
  );
  actions.showInformationMessage(
    `External PinFlow task failed: ${claim.annotationId}`,
  );
}

function parseClaimJson(stdout: string): ExternalHandoffClaim | null {
  const parsed = JSON.parse(stdout) as ExternalClaimJson;

  if (parsed.found === false) return null;

  if (!parsed.annotationId || !parsed.promptPath || !parsed.runDir) {
    throw new Error('External claim did not include complete handoff paths.');
  }

  return {
    annotationId: parsed.annotationId,
    promptPath: parsed.promptPath,
    runDir: parsed.runDir,
    provider: parsed.provider,
    label: parsed.label,
  };
}
