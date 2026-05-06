import { describe, expect, it, vi } from 'vitest';

import { pickFramework } from './framework-step.js';
import type { FrameworkStepDeps } from './framework-step.js';
import type { DetectedApp } from './app-detection.js';

function makeDeps(returnValue: unknown): FrameworkStepDeps {
  return {
    showQuickPick: vi.fn().mockResolvedValue(returnValue),
  };
}

describe('pickFramework', () => {
  it('returns the detected framework when user confirms via the confirm QuickPick', async () => {
    // Arrange
    const app: DetectedApp = { path: '/workspace/app', framework: 'vite' };
    // User picks the "detected (default)" option in the confirm prompt
    const deps = makeDeps({ value: 'vite' });

    // Act
    const result = await pickFramework(app, deps);

    // Assert
    expect(result).toBe('vite');
    expect(deps.showQuickPick).toHaveBeenCalledOnce();
  });

  it('returns the picked framework when detection failed and all options shown', async () => {
    // Arrange
    const app: DetectedApp = { path: '/workspace/app' }; // no framework detected
    const deps = makeDeps({ value: 'next' });

    // Act
    const result = await pickFramework(app, deps);

    // Assert
    expect(result).toBe('next');
    expect(deps.showQuickPick).toHaveBeenCalledOnce();
  });

  it('returns undefined when user cancels', async () => {
    // Arrange
    const app: DetectedApp = { path: '/workspace/app', framework: 'webpack' };
    const deps = makeDeps(undefined);

    // Act
    const result = await pickFramework(app, deps);

    // Assert
    expect(result).toBeUndefined();
  });
});
