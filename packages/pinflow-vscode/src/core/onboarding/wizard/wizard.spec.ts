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
    installFrameworkPlugin: vi.fn(async () => ({
      status: 'patched' as const,
      framework: 'react-vite' as const,
      appPath: '/repo',
    })),
    withProgress: vi.fn(async (_title: string, task: (report: (progress: { message?: string; increment?: number }) => void) => Promise<unknown>) =>
      task(vi.fn()),
    ),
    outputAppend: vi.fn(),
    outputShow: vi.fn(),
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
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
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
      perApp: [{ appPath: '/repo', framework: 'react-vite' }],
    });
    expect(internal.installFrameworkPlugin).toHaveBeenCalledTimes(1);
    expect(internal.installFrameworkPlugin).toHaveBeenCalledWith(
      '/repo',
      'react-vite',
      '/repo',
      expect.any(Function),
    );
    expect(internal.runPostInstall).toHaveBeenCalled();
  });

  it('monorepo all-detected: 2-step counter (agent + multi-select), no framework step', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web', framework: 'react-vite' as const },
        { path: '/repo/apps/api', framework: 'vue-webpack' as const },
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
        { appPath: '/repo/apps/web', framework: 'react-vite' },
        { appPath: '/repo/apps/api', framework: 'vue-webpack' },
      ],
    });
    expect(internal.installFrameworkPlugin).toHaveBeenCalledTimes(2);
    expect(internal.installFrameworkPlugin).toHaveBeenNthCalledWith(
      1,
      '/repo/apps/web',
      'react-vite',
      '/repo',
      expect.any(Function),
    );
    expect(internal.installFrameworkPlugin).toHaveBeenNthCalledWith(
      2,
      '/repo/apps/api',
      'vue-webpack',
      '/repo',
      expect.any(Function),
    );
  });

  it('zero apps detected: 3-step counter (agent + manual path + framework)', async () => {
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
    expect(internal.pickAppRoot).toHaveBeenCalledWith(
      '/repo',
      expect.any(Array),
      'Schritt 2/3',
    );
    expect(internal.pickFramework).toHaveBeenCalledWith('Schritt 3/3');
    // FrameworkChoice 'vite' is mapped to FrameworkId 'other-vite' in Phase 6.
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [{ appPath: '/manual/path', framework: 'other-vite' }],
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
        { path: '/repo/apps/web', framework: 'react-vite' as const },
        { path: '/repo/apps/api', framework: 'vue-webpack' as const },
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
        { path: '/repo/apps/web', framework: 'react-vite' as const },
        { path: '/repo/apps/api', framework: 'vue-webpack' as const },
      ]),
      pickAppRoot: vi.fn(async () => []),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('returns early when framework step cancelled (manual-path branch)', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => []),
      pickAppRoot: vi.fn(async () => ['/manual/path']),
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
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
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
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
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
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      detectExistingConfigs: vi.fn(async () => []),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — showInformationMessage is not called for the reconfigure prompt
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
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
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

describe('runWizard Phase 7.5 — framework plugin install', () => {
  it('calls installFrameworkPlugin once per app in perApp with correct args', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo/apps/web', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo/apps/web']),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.installFrameworkPlugin).toHaveBeenCalledTimes(1);
    expect(internal.installFrameworkPlugin).toHaveBeenCalledWith(
      '/repo/apps/web',
      'react-vite',
      '/repo',
      expect.any(Function),
    );
  });

  it('shows error message with "Output anzeigen" when install-failed; post-install still runs', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      installFrameworkPlugin: vi.fn(async () => ({
        status: 'install-failed' as const,
        framework: 'react-vite' as const,
        appPath: '/repo',
        detail: 'ENOENT',
      })),
      showErrorMessage: vi.fn(async () => undefined),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — error message contains expected strings
    expect(internal.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Plugin-Setup fehlgeschlagen'),
      'Output anzeigen',
    );

    // Assert — post-install still runs after failure
    expect(internal.runPostInstall).toHaveBeenCalled();
  });

  it('calls outputShow when user picks "Output anzeigen" in the failure toast', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      installFrameworkPlugin: vi.fn(async () => ({
        status: 'install-failed' as const,
        framework: 'react-vite' as const,
        appPath: '/repo',
        detail: 'ENOENT',
      })),
      showErrorMessage: vi.fn(async () => 'Output anzeigen'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.outputShow).toHaveBeenCalled();
  });

  it('does not show error message when all installs succeed', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      installFrameworkPlugin: vi.fn(async () => ({
        status: 'patched' as const,
        framework: 'react-vite' as const,
        appPath: '/repo',
      })),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — showErrorMessage not called for plugin-setup failure
    const calls = (internal.showErrorMessage as ReturnType<typeof vi.fn>).mock.calls;
    const pluginFailureCall = calls.find((c) => c[0]?.includes?.('Plugin-Setup'));
    expect(pluginFailureCall).toBeUndefined();
  });
});

describe('runWizard concurrency lock', () => {
  it('prevents concurrent invocations for same cwd', async () => {
    // Arrange
    let agentResolve: ((v: 'codex') => void) | null = null;
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
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
    // Flush microtasks + macrotasks so the first wizard reaches pickAgent
    await new Promise((r) => setTimeout(r, 0));
    agentResolve?.('codex');
    await Promise.all([first, second]);

    // Assert — only one wizard ran
    expect(internal.pickAgent).toHaveBeenCalledTimes(1);
  });
});
