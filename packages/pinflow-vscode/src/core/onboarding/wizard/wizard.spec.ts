import { describe, it, expect, vi, afterEach } from 'vitest';

import { runWizard, __test_resetPendingWizards } from './wizard.js';
import type { WizardInternalDeps, RunWizardDeps } from './wizard.js';

afterEach(() => {
  __test_resetPendingWizards();
});

function makeInternalDeps(
  overrides: Partial<WizardInternalDeps> = {},
): WizardInternalDeps {
  return {
    detectApps: vi.fn(() => []),
    detectInstalledAgents: vi.fn(async () => ({
      codex: false,
      'claude-code': false,
      copilot: false,
    })),
    detectExistingConfigs: vi.fn(async () => []),
    pickAgent: vi.fn(async () => 'codex'),
    pickAppRoot: vi.fn(async () => undefined),
    pickFramework: vi.fn(async () => 'vite'),
    writeWizardConfig: vi.fn(async () => undefined),
    runPostInstall: vi.fn(async () => undefined),
    showInformationMessage: vi.fn(async () => undefined),
    showErrorMessage: vi.fn(async () => undefined),
    createTerminal: vi.fn(() => ({ sendText: vi.fn(), show: vi.fn() })),
    ...overrides,
  };
}

function makeUserDeps(): RunWizardDeps {
  return {
    onSuccess: vi.fn(),
    runInitInTerminal: vi.fn(),
  };
}

describe('runWizard step plan', () => {
  it('single-app fresh: 1-step counter, no app-root prompt, no framework prompt, writes once', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
    });
    const userDeps = makeUserDeps();

    // Act
    await runWizard('/repo', userDeps, internal);

    // Assert — agent step receives empty step label (only 1 step total)
    expect(internal.pickAgent).toHaveBeenCalledWith(expect.anything(), '');
    expect(internal.pickFramework).not.toHaveBeenCalled();
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [{ appPath: '/repo', framework: 'vite' }],
    });
    expect(internal.runPostInstall).toHaveBeenCalled();
  });

  it('monorepo all-detected: 2-step counter (agent + multi-select), framework auto-skips per app', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web', framework: 'vite' },
        { path: '/repo/apps/api', framework: 'webpack' },
      ]),
      pickAppRoot: vi.fn(async () => ['/repo/apps/web', '/repo/apps/api']),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickAgent).toHaveBeenCalledWith(expect.anything(), 'Schritt 1/2');
    expect(internal.pickAppRoot).toHaveBeenCalledWith(
      '/repo',
      expect.any(Array),
      'Schritt 2/2',
    );
    expect(internal.pickFramework).not.toHaveBeenCalled();
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [
        { appPath: '/repo/apps/web', framework: 'vite' },
        { appPath: '/repo/apps/api', framework: 'webpack' },
      ],
    });
  });

  it('monorepo mixed (one ambiguous): 3-step counter, shared framework applied to ambiguous only', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web', framework: 'vite' },
        { path: '/repo/tools/scripts' }, // no framework
      ]),
      pickAppRoot: vi.fn(async () => ['/repo/apps/web', '/repo/tools/scripts']),
      pickFramework: vi.fn(async () => 'webpack'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickAgent).toHaveBeenCalledWith(expect.anything(), 'Schritt 1/3');
    expect(internal.pickAppRoot).toHaveBeenCalledWith(
      '/repo',
      expect.any(Array),
      'Schritt 2/3',
    );
    expect(internal.pickFramework).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/repo/tools/scripts' }),
      'Schritt 3/3',
    );
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [
        { appPath: '/repo/apps/web', framework: 'vite' },
        { appPath: '/repo/tools/scripts', framework: 'webpack' },
      ],
    });
  });

  it('zero apps: 2-step counter (agent + framework), InputBox-supplied path used', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => []),
      pickAppRoot: vi.fn(async () => ['/manual/path']),
      pickFramework: vi.fn(async () => 'vite'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickAgent).toHaveBeenCalledWith(expect.anything(), 'Schritt 1/3');
    expect(internal.pickFramework).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/manual/path' }),
      'Schritt 3/3',
    );
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [{ appPath: '/manual/path', framework: 'vite' }],
    });
  });
});

describe('runWizard cancellation', () => {
  it('returns early when agent step cancelled', async () => {
    // Arrange
    const internal = makeInternalDeps({
      pickAgent: vi.fn(async () => undefined),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickAppRoot).not.toHaveBeenCalled();
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('returns early when app-root step cancelled', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ]),
      pickAppRoot: vi.fn(async () => undefined),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickFramework).not.toHaveBeenCalled();
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('returns early when app-root multi-select empty', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ]),
      pickAppRoot: vi.fn(async () => []),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('returns early when framework step cancelled', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      pickFramework: vi.fn(async () => undefined),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });
});

describe('runWizard reconfigure flow', () => {
  it('shows reconfigure prompt when picked app already has config; "Überschreiben" continues', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      detectExistingConfigs: vi.fn(async () => ['/repo']),
      showInformationMessage: vi.fn(async () => 'Überschreiben'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('Bestehende Konfiguration überschreiben?'),
      'Überschreiben',
      'Abbrechen',
    );
    expect(internal.writeWizardConfig).toHaveBeenCalled();
  });

  it('cancels when user picks "Abbrechen" on reconfigure prompt', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      detectExistingConfigs: vi.fn(async () => ['/repo']),
      showInformationMessage: vi.fn(async () => 'Abbrechen'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('skips reconfigure prompt when no picked app has existing config', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      detectExistingConfigs: vi.fn(async () => []),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — showInformationMessage is not called for the reconfigure prompt
    // (it might still be called by other code paths, so we check the specific
    // call with "Überschreiben" wasn't made)
    const calls = (internal.showInformationMessage as ReturnType<typeof vi.fn>).mock.calls;
    const reconfigureCall = calls.find((c) => c[0]?.includes?.('Überschreiben'));
    expect(reconfigureCall).toBeUndefined();
    expect(internal.writeWizardConfig).toHaveBeenCalled();
  });
});

describe('runWizard error handling', () => {
  it('shows German error toast when writeWizardConfig throws; "Terminal öffnen" opens terminal', async () => {
    // Arrange
    const userDeps = makeUserDeps();
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      writeWizardConfig: vi.fn(async () => {
        throw new Error('disk full');
      }),
      showErrorMessage: vi.fn(async () => 'Terminal öffnen'),
    });

    // Act
    await runWizard('/repo', userDeps, internal);

    // Assert
    expect(internal.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('PinFlow-Setup fehlgeschlagen'),
      'Terminal öffnen',
    );
    expect(userDeps.runInitInTerminal).toHaveBeenCalledWith('/repo');
    expect(internal.runPostInstall).not.toHaveBeenCalled();
  });
});

describe('runWizard concurrency lock', () => {
  it('prevents concurrent invocations for same cwd', async () => {
    // Arrange
    let agentResolve: ((v: 'codex') => void) | null = null;
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      pickAgent: vi.fn(
        () =>
          new Promise<'codex'>((resolve) => {
            agentResolve = resolve;
          }),
      ),
    });

    // Act — start two wizards for the same cwd concurrently
    const first = runWizard('/repo', makeUserDeps(), internal);
    const second = runWizard('/repo', makeUserDeps(), internal);
    // Flush microtask queue (detectInstalledAgents + detectApps both async) so
    // pickAgent is called and agentResolve is populated before we resolve it.
    await new Promise((r) => setTimeout(r, 0));
    agentResolve?.('codex');
    await Promise.all([first, second]);

    // Assert — only one wizard ran
    expect(internal.pickAgent).toHaveBeenCalledTimes(1);
  });
});
