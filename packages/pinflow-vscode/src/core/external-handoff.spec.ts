import {
  claimExternalHandoff,
  completeExternalHandoff,
  failExternalHandoff,
  type ExternalHandoffClaim,
} from './external-handoff.js';

describe('external handoff commands', () => {
  it('claims a visible external task, parses JSON, and opens the prompt', async () => {
    const opened: string[] = [];
    const messages: string[] = [];
    const calls: Array<{ command: string; args: string[]; cwd: string }> = [];

    const claim = await claimExternalHandoff('/repo', {
      runCommand: async (command, args, options) => {
        calls.push({ command, args, cwd: options.cwd });
        return {
          stdout: JSON.stringify({
            found: true,
            annotationId: 'ann_abc12345_1',
            promptPath:
              '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/prompt.md',
            runDir:
              '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1',
            provider: 'codex',
            label: 'VS Code',
          }),
          stderr: '',
        };
      },
      openFile: (filePath) => opened.push(filePath),
      showInformationMessage: (message) => messages.push(message),
      hasRepoDiff: async () => false,
    });

    expect(calls).toEqual([
      {
        command: 'pinflow',
        cwd: '/repo',
        args: [
          'external',
          'claim',
          '--provider',
          'codex',
          '--label',
          'VS Code',
          '--json',
        ],
      },
    ]);
    expect(claim).toEqual({
      annotationId: 'ann_abc12345_1',
      promptPath:
        '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/prompt.md',
      runDir:
        '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1',
      provider: 'codex',
      label: 'VS Code',
    });
    expect(opened).toEqual([
      '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/prompt.md',
    ]);
    expect(messages).toEqual([
      'External PinFlow task claimed: ann_abc12345_1',
    ]);
  });

  it('does not complete an external task before the repo has a real diff', async () => {
    const claim = createClaim();
    const messages: string[] = [];
    const calls: string[] = [];

    await completeExternalHandoff('/repo', claim, {
      runCommand: async (command) => {
        calls.push(command);
        return { stdout: '', stderr: '' };
      },
      openFile: () => undefined,
      showInformationMessage: (message) => messages.push(message),
      hasRepoDiff: async () => false,
    });

    expect(calls).toEqual([]);
    expect(messages).toEqual([
      'PinFlow external complete needs a real local repo diff first.',
    ]);
  });

  it('completes and fails external tasks through the visible CLI handoff', async () => {
    const claim = createClaim();
    const calls: Array<{ command: string; args: string[]; cwd: string }> = [];

    const actions = {
      runCommand: async (
        command: string,
        args: string[],
        options: { cwd: string },
      ) => {
        calls.push({ command, args, cwd: options.cwd });
        return { stdout: '', stderr: '' };
      },
      openFile: () => undefined,
      showInformationMessage: () => undefined,
      hasRepoDiff: async () => true,
    };

    await completeExternalHandoff('/repo', claim, actions);
    await failExternalHandoff('/repo', claim, 'User cancelled.', actions);

    expect(calls).toEqual([
      {
        command: 'pinflow',
        cwd: '/repo',
        args: [
          'external',
          'complete',
          'ann_abc12345_1',
          '--run-dir',
          '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1',
          '--message',
          'Completed from VS Code external handoff.',
        ],
      },
      {
        command: 'pinflow',
        cwd: '/repo',
        args: [
          'external',
          'fail',
          'ann_abc12345_1',
          '--run-dir',
          '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1',
          '--error',
          'User cancelled.',
        ],
      },
    ]);
  });
});

function createClaim(): ExternalHandoffClaim {
  return {
    annotationId: 'ann_abc12345_1',
    promptPath:
      '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/prompt.md',
    runDir:
      '/repo/.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1',
    provider: 'codex',
    label: 'VS Code',
  };
}
