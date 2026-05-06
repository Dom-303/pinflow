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
    setLongInstallTimer: vi.fn((_cb: () => void, _ms: number) => vi.fn()),
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

  it('shows error message with retry/output/close actions when install-failed; post-install still runs', async () => {
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
      'Erneut versuchen',
      'Output anzeigen',
      'Schließen',
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

  it('retry succeeds on second attempt: installFrameworkPlugin called twice, runPostInstall called', async () => {
    // Arrange
    const installMock = vi.fn()
      .mockResolvedValueOnce({ status: 'install-failed' as const, framework: 'react-vite' as const, appPath: '/repo', detail: 'ENOENT' })
      .mockResolvedValueOnce({ status: 'patched' as const, framework: 'react-vite' as const, appPath: '/repo' });

    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      installFrameworkPlugin: installMock,
      showErrorMessage: vi.fn(async () => 'Erneut versuchen'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — install called once in original loop, once in retry
    expect(installMock).toHaveBeenCalledTimes(2);
    // Assert — success path: runPostInstall runs
    expect(internal.runPostInstall).toHaveBeenCalled();
  });

  it('retry-only-failed-apps: only the failed app is retried, not the successful sibling', async () => {
    // Arrange
    // app1 succeeds on first call; app2 fails on first call, succeeds on retry
    const installMock = vi.fn()
      .mockImplementation(async (appPath: string) => {
        if (appPath === '/repo/apps/web') {
          return { status: 'patched' as const, framework: 'react-vite' as const, appPath: '/repo/apps/web' };
        }
        // app2 fails first time, succeeds on retry (second call)
        const callsForApp2 = installMock.mock.calls.filter((c) => c[0] === '/repo/apps/api').length;
        if (callsForApp2 <= 1) {
          return { status: 'install-failed' as const, framework: 'vue-webpack' as const, appPath: '/repo/apps/api', detail: 'ENOENT' };
        }
        return { status: 'patched' as const, framework: 'vue-webpack' as const, appPath: '/repo/apps/api' };
      });

    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web', framework: 'react-vite' as const },
        { path: '/repo/apps/api', framework: 'vue-webpack' as const },
      ]),
      pickAppRoot: vi.fn(async () => ['/repo/apps/web', '/repo/apps/api']),
      installFrameworkPlugin: installMock,
      showErrorMessage: vi.fn(async () => 'Erneut versuchen'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — original loop called install for both apps
    const allCalls = installMock.mock.calls;
    const originalLoopCalls = allCalls.slice(0, 2);
    expect(originalLoopCalls[0][0]).toBe('/repo/apps/web');
    expect(originalLoopCalls[1][0]).toBe('/repo/apps/api');

    // Assert — retry only called install for app2 (the failed one)
    const retryCalls = allCalls.slice(2);
    expect(retryCalls).toHaveLength(1);
    expect(retryCalls[0][0]).toBe('/repo/apps/api');
  });

  it('3-retry cap: after 3rd retry fails, toast has no retry button; install called 4 times total', async () => {
    // Arrange
    const installMock = vi.fn(async () => ({
      status: 'install-failed' as const,
      framework: 'react-vite' as const,
      appPath: '/repo',
      detail: 'ENOENT',
    }));

    // First 3 showErrorMessage calls return 'Erneut versuchen'; 4th is the cap toast
    const showErrorMock = vi.fn()
      .mockResolvedValueOnce('Erneut versuchen')
      .mockResolvedValueOnce('Erneut versuchen')
      .mockResolvedValueOnce('Erneut versuchen')
      .mockResolvedValueOnce(undefined);

    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      installFrameworkPlugin: installMock,
      showErrorMessage: showErrorMock,
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — install was called 4 times (original + 3 retries)
    expect(installMock).toHaveBeenCalledTimes(4);

    // Assert — 4th toast (after 3 retries exhausted) has no retry button
    const fourthToastCall = showErrorMock.mock.calls[3];
    expect(fourthToastCall).toBeDefined();
    expect(fourthToastCall).not.toContain('Erneut versuchen');
    expect(fourthToastCall).toContain('Output anzeigen');
    expect(fourthToastCall).toContain('Schließen');
  });

  it('long-install hint fires: report called with Output-anzeigen hint when timer callback invoked', async () => {
    // Arrange
    let capturedHintCallback: (() => void) | undefined;
    const cancelFn = vi.fn();
    const setLongInstallTimer = vi.fn((cb: () => void, _ms: number) => {
      capturedHintCallback = cb;
      return cancelFn;
    });

    let capturedReport: ((p: { message?: string }) => void) | undefined;
    const withProgress = vi.fn(async (_title: string, task: (report: (p: { message?: string; increment?: number }) => void) => Promise<unknown>) => {
      const report = vi.fn();
      capturedReport = report;
      await task(report);
    });

    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      withProgress,
      setLongInstallTimer,
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Manually fire the hint callback (simulates the 30s timer elapsing)
    capturedHintCallback?.();

    // Assert — report was called with the hint message containing 'Output anzeigen'
    expect(capturedReport).toBeDefined();
    const hintCall = (capturedReport as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0]?.message?.includes('Output anzeigen'),
    );
    expect(hintCall).toBeDefined();
  });

  it('long-install timer is cleared on success: cancel function called after install completes', async () => {
    // Arrange
    const cancelFn = vi.fn();
    const setLongInstallTimer = vi.fn((_cb: () => void, _ms: number) => cancelFn);

    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      setLongInstallTimer,
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — cancel function was called (timer was cleared)
    expect(cancelFn).toHaveBeenCalled();
  });

  it('long-install timer is cleared on retry success: each attempt clears its own timer', async () => {
    // Arrange
    const cancelFns = [vi.fn(), vi.fn()];
    let timerCallCount = 0;
    const setLongInstallTimer = vi.fn((_cb: () => void, _ms: number) => {
      const fn = cancelFns[timerCallCount] ?? vi.fn();
      timerCallCount += 1;
      return fn;
    });

    const installMock = vi.fn()
      .mockResolvedValueOnce({ status: 'install-failed' as const, framework: 'react-vite' as const, appPath: '/repo', detail: 'ENOENT' })
      .mockResolvedValueOnce({ status: 'patched' as const, framework: 'react-vite' as const, appPath: '/repo' });

    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'react-vite' as const }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      installFrameworkPlugin: installMock,
      showErrorMessage: vi.fn(async () => 'Erneut versuchen'),
      setLongInstallTimer,
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — setLongInstallTimer was called twice (once per attempt)
    expect(setLongInstallTimer).toHaveBeenCalledTimes(2);
    // Assert — both cancel functions were called
    expect(cancelFns[0]).toHaveBeenCalled();
    expect(cancelFns[1]).toHaveBeenCalled();
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
