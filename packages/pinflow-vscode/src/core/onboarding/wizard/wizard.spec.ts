import { describe, expect, it, vi, beforeEach } from 'vitest';

import { runWizard, __test_resetPendingWizards } from './wizard.js';
import type { RunWizardDeps, WizardInternalDeps } from './wizard.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INSTALLED_AGENTS_NONE = { codex: false, 'claude-code': false, copilot: false };

function makeInternalDeps(overrides?: Partial<WizardInternalDeps>): WizardInternalDeps {
  return {
    detectApps: vi.fn().mockReturnValue([{ path: '/workspace/app', framework: 'vite' }]),
    detectInstalledAgents: vi.fn().mockResolvedValue(INSTALLED_AGENTS_NONE),
    pickAgent: vi.fn().mockResolvedValue('codex'),
    pickAppRoot: vi.fn().mockResolvedValue('/workspace/app'),
    pickFramework: vi.fn().mockResolvedValue('vite'),
    writeWizardConfig: vi.fn().mockResolvedValue(undefined),
    runPostInstall: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    createTerminal: vi.fn().mockReturnValue({ sendText: vi.fn(), show: vi.fn() }),
    ...overrides,
  };
}

function makePublicDeps(overrides?: Partial<RunWizardDeps>): RunWizardDeps {
  return {
    onSuccess: vi.fn().mockResolvedValue(undefined),
    runInitInTerminal: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  __test_resetPendingWizards();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runWizard', () => {
  it('happy path: calls writeWizardConfig, onSuccess, and runPostInstall', async () => {
    // Arrange
    const internal = makeInternalDeps();
    const deps = makePublicDeps();
    const cwd = '/workspace';

    // Act
    await runWizard(cwd, deps, internal);

    // Assert
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd,
      agent: 'codex',
      framework: 'vite',
      appRoot: '/workspace/app',
    });
    expect(deps.onSuccess).toHaveBeenCalledOnce();
    expect(internal.runPostInstall).toHaveBeenCalledWith('codex', cwd, expect.any(Object));
  });

  it('exits silently when user cancels at the agent step', async () => {
    // Arrange
    const internal = makeInternalDeps({
      pickAgent: vi.fn().mockResolvedValue(undefined),
    });
    const deps = makePublicDeps();

    // Act
    await runWizard('/workspace', deps, internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
    expect(deps.onSuccess).not.toHaveBeenCalled();
    expect(internal.runPostInstall).not.toHaveBeenCalled();
  });

  it('exits silently when user cancels at the framework step', async () => {
    // Arrange
    const internal = makeInternalDeps({
      pickFramework: vi.fn().mockResolvedValue(undefined),
    });
    const deps = makePublicDeps();

    // Act
    await runWizard('/workspace', deps, internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
    expect(deps.onSuccess).not.toHaveBeenCalled();
    expect(internal.runPostInstall).not.toHaveBeenCalled();
  });

  it('runs post-install for codex agent', async () => {
    // Arrange
    const internal = makeInternalDeps({
      pickAgent: vi.fn().mockResolvedValue('codex'),
    });
    const deps = makePublicDeps();
    const cwd = '/workspace';

    // Act
    await runWizard(cwd, deps, internal);

    // Assert
    expect(internal.runPostInstall).toHaveBeenCalledWith('codex', cwd, expect.any(Object));
  });

  it("skips post-install toast for 'other' agent (runPostInstall called but shows plain success)", async () => {
    // Arrange — agent='other' is passed through; post-install module's behavior
    // (plain success, no install-prompt) is exercised via the injected spy.
    const runPostInstallSpy = vi.fn().mockResolvedValue(undefined);
    const internal = makeInternalDeps({
      pickAgent: vi.fn().mockResolvedValue('other'),
      runPostInstall: runPostInstallSpy,
    });
    const deps = makePublicDeps();
    const cwd = '/workspace';

    // Act
    await runWizard(cwd, deps, internal);

    // Assert — runPostInstall is always called on success; 'other' receives no
    // install commands so post-install.ts shows a plain toast (verified in
    // post-install.spec.ts). Here we confirm the orchestrator passes the
    // correct agent value and never bypasses the call.
    expect(runPostInstallSpy).toHaveBeenCalledWith('other', cwd, expect.any(Object));
  });
});
