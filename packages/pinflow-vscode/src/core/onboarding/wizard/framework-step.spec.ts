import { describe, it, expect, vi } from 'vitest';

import { pickFramework } from './framework-step.js';

describe('pickFramework', () => {
  it('returns detected framework synchronously without QuickPick', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInformationMessage = vi.fn();

    // Act
    const result = await pickFramework(
      { path: '/repo/apps/web', framework: 'vite' },
      'Schritt 3/3',
      { showQuickPick, showInformationMessage },
    );

    // Assert
    expect(result).toBe('vite');
    expect(showQuickPick).not.toHaveBeenCalled();
    expect(showInformationMessage).toHaveBeenCalledWith('Framework erkannt: Vite');
  });

  it('shows QuickPick with all four options when nothing detected', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue({ label: 'Webpack', value: 'webpack' });
    const showInformationMessage = vi.fn();

    // Act
    const result = await pickFramework(
      { path: '/repo/apps/web' },
      'Schritt 2/2',
      { showQuickPick, showInformationMessage },
    );

    // Assert
    expect(result).toBe('webpack');
    expect(showInformationMessage).not.toHaveBeenCalled();
    const [items, options] = showQuickPick.mock.calls[0];
    expect(items.map((i: { value: string }) => i.value)).toEqual([
      'vite',
      'webpack',
      'next',
      'nuxt',
    ]);
    expect(options.title).toBe('PinFlow Setup · Schritt 2/2 — Framework wählen');
    expect(options.placeHolder).toBe('Konnte kein Framework erkennen — wähle manuell');
  });

  it('omits step prefix when stepLabel is empty', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInformationMessage = vi.fn();

    // Act
    await pickFramework(
      { path: '/repo' },
      '',
      { showQuickPick, showInformationMessage },
    );

    // Assert
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Framework wählen');
  });

  it('returns undefined when QuickPick is cancelled', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInformationMessage = vi.fn();

    // Act
    const result = await pickFramework(
      { path: '/repo' },
      'Schritt 1/1',
      { showQuickPick, showInformationMessage },
    );

    // Assert
    expect(result).toBeUndefined();
  });
});
