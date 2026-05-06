import { describe, it, expect, vi } from 'vitest';

import { pickAppRoot } from './monorepo-step.js';

describe('pickAppRoot', () => {
  it('auto-picks the only detected app silently', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [{ path: '/repo/apps/web', framework: 'vite' }],
      'Schritt 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toEqual(['/repo/apps/web']);
    expect(showQuickPick).not.toHaveBeenCalled();
    expect(showInputBox).not.toHaveBeenCalled();
  });

  it('shows multi-select QuickPick with all items pre-checked when 2+ apps detected', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue([
      { label: 'apps/web', value: '/repo/apps/web', picked: true },
      { label: 'apps/api', value: '/repo/apps/api', picked: true },
    ]);
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web', framework: 'vite' },
        { path: '/repo/apps/api', framework: 'webpack' },
      ],
      'Schritt 2/2',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toEqual(['/repo/apps/web', '/repo/apps/api']);
    const [items, options] = showQuickPick.mock.calls[0];
    expect(items).toEqual([
      { label: 'apps/web', description: 'vite', picked: true, value: '/repo/apps/web' },
      { label: 'apps/api', description: 'webpack', picked: true, value: '/repo/apps/api' },
    ]);
    expect(options.canPickMany).toBe(true);
    expect(options.title).toBe('PinFlow Setup · Schritt 2/2 — Apps auswählen');
    expect(options.placeHolder).toBe('Mehrere Apps gefunden — wähle eine oder mehrere');
  });

  it('describes apps without detected framework as "unbekanntes Framework"', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInputBox = vi.fn();

    // Act
    await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api', framework: 'webpack' },
      ],
      'Schritt 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    const [items] = showQuickPick.mock.calls[0];
    expect(items[0].description).toBe('unbekanntes Framework');
    expect(items[1].description).toBe('webpack');
  });

  it('returns undefined when multi-select is cancelled', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ],
      'Schritt 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it('returns undefined when user deselects everything in multi-select', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue([]);
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ],
      'Schritt 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it('shows InputBox with German prompt when no apps detected', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInputBox = vi.fn().mockResolvedValue('/manual/path');

    // Act
    const result = await pickAppRoot(
      '/repo',
      [],
      'Schritt 2/2',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toEqual(['/manual/path']);
    const [options] = showInputBox.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Schritt 2/2 — App-Root wählen');
    expect(options.prompt).toBe(
      'Keine package.json gefunden. Pfad zum App-Root eingeben:',
    );
    expect(options.value).toBe('/repo');
  });

  it('returns undefined when InputBox is cancelled or empty', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInputBox = vi.fn().mockResolvedValue(undefined);

    // Act
    const result = await pickAppRoot(
      '/repo',
      [],
      'Schritt 1/1',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it('omits step prefix when stepLabel is empty', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue([]);
    const showInputBox = vi.fn();

    // Act
    await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ],
      '',
      { showQuickPick, showInputBox },
    );

    // Assert
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Apps auswählen');
  });
});
