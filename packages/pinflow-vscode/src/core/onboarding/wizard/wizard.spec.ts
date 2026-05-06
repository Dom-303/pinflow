import { describe, expect, it, vi, beforeEach } from 'vitest';

import { runWizard, __test_resetPendingWizards } from './wizard.js';
import type { RunWizardDeps, WizardInternalDeps } from './wizard.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInternalDeps(overrides?: Partial<WizardInternalDeps>): WizardInternalDeps {
  return {
    detectApps: vi.fn().mockReturnValue([{ path: '/workspace/app', framework: 'vite' }]),
    pickAgent: vi.fn().mockResolvedValue('codex'),
    pickAppRoot: vi.fn().mockResolvedValue('/workspace/app'),
    pickFramework: vi.fn().mockResolvedValue('vite'),
    writeWizardConfig: vi.fn().mockResolvedValue(undefined),
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    openExternal: vi.fn().mockResolvedValue(true),
    parseUri: vi.fn().mockReturnValue({ scheme: 'https' }),
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
  it('happy path: calls writeWizardConfig, onSuccess, and shows success toast', async () => {
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
    expect(internal.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('PinFlow ready in'),
      'Install Agent Plugin',
    );
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
    expect(internal.showInformationMessage).not.toHaveBeenCalled();
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
    expect(internal.showInformationMessage).not.toHaveBeenCalled();
  });
});
