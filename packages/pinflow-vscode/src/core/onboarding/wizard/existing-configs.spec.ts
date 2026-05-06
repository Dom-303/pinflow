import { describe, it, expect, vi } from 'vitest';

import { detectExistingConfigs } from './existing-configs.js';

describe('detectExistingConfigs', () => {
  it('returns the subset of paths whose pinflow.config.json exists', async () => {
    // Arrange
    const accessFn = vi.fn(async (path: string) => {
      if (path === '/repo/apps/web/pinflow.config.json') return;
      throw new Error('ENOENT');
    });

    // Act
    const result = await detectExistingConfigs(
      ['/repo/apps/web', '/repo/apps/api'],
      { access: accessFn },
    );

    // Assert
    expect(result).toEqual(['/repo/apps/web']);
  });

  it('returns empty array for empty input', async () => {
    // Arrange
    const accessFn = vi.fn();

    // Act
    const result = await detectExistingConfigs([], { access: accessFn });

    // Assert
    expect(result).toEqual([]);
    expect(accessFn).not.toHaveBeenCalled();
  });

  it('returns empty array when no configs exist', async () => {
    // Arrange
    const accessFn = vi.fn(async () => {
      throw new Error('ENOENT');
    });

    // Act
    const result = await detectExistingConfigs(
      ['/repo/apps/web', '/repo/apps/api'],
      { access: accessFn },
    );

    // Assert
    expect(result).toEqual([]);
  });

  it('runs access calls in parallel', async () => {
    // Arrange
    const order: string[] = [];
    const accessFn = vi.fn(async (path: string) => {
      order.push(`start:${path}`);
      await new Promise((r) => setTimeout(r, 10));
      order.push(`end:${path}`);
    });

    // Act
    await detectExistingConfigs(['/a', '/b', '/c'], { access: accessFn });

    // Assert — all starts happen before any end (parallel)
    expect(order.slice(0, 3).every((s) => s.startsWith('start:'))).toBe(true);
  });
});
