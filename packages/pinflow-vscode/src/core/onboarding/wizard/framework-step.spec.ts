import { describe, it, expect, vi } from 'vitest';

import { pickFramework } from './framework-step.js';

describe('pickFramework', () => {
  it('returns the picked value', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue({ label: 'Vite', value: 'vite' });

    // Act
    const result = await pickFramework('Step 3/3', { showQuickPick });

    // Assert
    expect(result).toBe('vite');
  });

  it('shows all four options with title and placeholder', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    await pickFramework('Step 3/3', { showQuickPick });

    // Assert
    const [items, options] = showQuickPick.mock.calls[0];
    expect(items.map((i: { value: string }) => i.value)).toEqual([
      'vite',
      'webpack',
      'next',
      'nuxt',
    ]);
    expect(options.title).toBe('PinFlow Setup · Step 3/3 — Choose framework');
    expect(options.placeHolder).toBe(
      'No frontend app detected — choose the framework manually',
    );
  });

  it('omits step prefix when stepLabel is empty', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    await pickFramework('', { showQuickPick });

    // Assert
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Choose framework');
  });

  it('returns undefined when QuickPick is cancelled', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    const result = await pickFramework('Step 1/1', { showQuickPick });

    // Assert
    expect(result).toBeUndefined();
  });
});
