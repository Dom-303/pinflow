import { describe, expect, it, vi } from 'vitest';

import { pickAppRoot } from './monorepo-step.js';
import type { MonorepoStepDeps } from './monorepo-step.js';
import type { DetectedApp } from './app-detection.js';

const CWD = '/workspace/myproject';

function makeDeps(overrides?: Partial<MonorepoStepDeps>): MonorepoStepDeps {
  return {
    showQuickPick: vi.fn().mockResolvedValue(undefined),
    showInputBox: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('pickAppRoot', () => {
  it('auto-picks the single app path without showing any UI', async () => {
    // Arrange
    const apps: DetectedApp[] = [{ path: '/workspace/myproject/app', framework: 'vite' }];
    const deps = makeDeps();

    // Act
    const result = await pickAppRoot(CWD, apps, deps);

    // Assert
    expect(result).toBe('/workspace/myproject/app');
    expect(deps.showQuickPick).not.toHaveBeenCalled();
    expect(deps.showInputBox).not.toHaveBeenCalled();
  });

  it('shows QuickPick and returns chosen path for multiple apps', async () => {
    // Arrange
    const apps: DetectedApp[] = [
      { path: '/workspace/myproject/packages/a', framework: 'vite' },
      { path: '/workspace/myproject/packages/b', framework: 'webpack' },
    ];
    const deps = makeDeps({
      showQuickPick: vi.fn().mockResolvedValue({ value: '/workspace/myproject/packages/b' }),
    });

    // Act
    const result = await pickAppRoot(CWD, apps, deps);

    // Assert
    expect(result).toBe('/workspace/myproject/packages/b');
    expect(deps.showQuickPick).toHaveBeenCalledOnce();
    expect(deps.showInputBox).not.toHaveBeenCalled();
  });

  it('shows InputBox with cwd default when no apps detected', async () => {
    // Arrange
    const apps: DetectedApp[] = [];
    const deps = makeDeps({
      showInputBox: vi.fn().mockResolvedValue('/workspace/myproject/custom'),
    });

    // Act
    const result = await pickAppRoot(CWD, apps, deps);

    // Assert
    expect(result).toBe('/workspace/myproject/custom');
    expect(deps.showInputBox).toHaveBeenCalledWith(
      expect.objectContaining({ value: CWD }),
    );
    expect(deps.showQuickPick).not.toHaveBeenCalled();
  });

  it('returns undefined when user cancels QuickPick', async () => {
    // Arrange
    const apps: DetectedApp[] = [
      { path: '/workspace/myproject/packages/a' },
      { path: '/workspace/myproject/packages/b' },
    ];
    const deps = makeDeps({
      showQuickPick: vi.fn().mockResolvedValue(undefined),
    });

    // Act
    const result = await pickAppRoot(CWD, apps, deps);

    // Assert
    expect(result).toBeUndefined();
  });
});
