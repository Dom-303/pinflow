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
      [{ path: '/repo/apps/web', framework: 'react-vite' }],
      'Step 2/3',
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
        { path: '/repo/apps/web', framework: 'react-vite' },
        { path: '/repo/apps/api', framework: 'vue-webpack' },
      ],
      'Step 2/2',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toEqual(['/repo/apps/web', '/repo/apps/api']);
    const [items, options] = showQuickPick.mock.calls[0];
    expect(items).toEqual([
      { label: 'apps/web', description: 'React + Vite', picked: true, value: '/repo/apps/web' },
      { label: 'apps/api', description: 'Vue + Webpack', picked: true, value: '/repo/apps/api' },
    ]);
    expect(options.canPickMany).toBe(true);
    expect(options.title).toBe('PinFlow Setup · Step 2/2 — Choose apps');
    expect(options.placeHolder).toBe(
      'Multiple frontend apps found — choose one or more',
    );
  });

  it('returns undefined when multi-select is cancelled', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web', framework: 'react-vite' },
        { path: '/repo/apps/api', framework: 'other-webpack' },
      ],
      'Step 2/3',
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
        { path: '/repo/apps/web', framework: 'react-vite' },
        { path: '/repo/apps/api', framework: 'vue-webpack' },
      ],
      'Step 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it('shows InputBox prompt when no apps detected (frontend-aware copy)', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInputBox = vi.fn().mockResolvedValue('/manual/path');

    // Act
    const result = await pickAppRoot(
      '/repo',
      [],
      'Step 2/2',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toEqual(['/manual/path']);
    const [options] = showInputBox.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Step 2/2 — Choose app root');
    expect(options.prompt).toBe(
      'No frontend app (Vite/Webpack/Next.js/Nuxt) detected. Enter the path to the app root:',
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
      'Step 1/1',
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
        { path: '/repo/apps/web', framework: 'react-vite' },
        { path: '/repo/apps/api', framework: 'next' },
      ],
      '',
      { showQuickPick, showInputBox },
    );

    // Assert
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Choose apps');
  });

  it('uses readable labels from FRAMEWORKS table in descriptions', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue([]);
    const showInputBox = vi.fn();

    // Act
    await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web', framework: 'nuxt' },
        { path: '/repo/apps/overlay', framework: 'other-vite' },
      ],
      '',
      { showQuickPick, showInputBox },
    );

    // Assert
    const [items] = showQuickPick.mock.calls[0];
    expect(items[0].description).toBe('Nuxt');
    expect(items[1].description).toBe('Other (Vite)');
  });
});
