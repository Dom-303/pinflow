import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DEFAULT_OVERLAY_SETTINGS } from '@pinflow/core';
import { createOverlaySettingsService } from './overlay-settings-service.js';

describe('overlay-settings-service', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pinflow-cfg-'));
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('returns DEFAULT_OVERLAY_SETTINGS when file does not exist', async () => {
    // Arrange
    const service = createOverlaySettingsService({ workspaceRoot });
    await service.start();

    // Act
    const settings = service.getSettings();

    // Assert
    expect(settings).toEqual(DEFAULT_OVERLAY_SETTINGS);

    await service.close();
  });

  it('reads existing file on start', async () => {
    // Arrange
    const dir = path.join(workspaceRoot, '.pinflow');
    await writeFile(
      path.join(dir, 'overlay-settings.json'),
      JSON.stringify({ theme: 'dark' }),
      { flag: 'w' },
    ).catch(async () => {
      const fs = await import('node:fs/promises');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, 'overlay-settings.json'),
        JSON.stringify({ theme: 'dark' }),
      );
    });
    const service = createOverlaySettingsService({ workspaceRoot });

    // Act
    await service.start();
    const settings = service.getSettings();

    // Assert
    expect(settings.theme).toBe('dark');

    await service.close();
  });

  it('writes file on applyUpdate(partial) and merges with current state', async () => {
    // Arrange
    const service = createOverlaySettingsService({ workspaceRoot });
    await service.start();

    // Act
    await service.applyUpdate({ theme: 'dark' });
    const onDisk = await readFile(
      path.join(workspaceRoot, '.pinflow', 'overlay-settings.json'),
      'utf-8',
    );

    // Assert
    expect(service.getSettings()).toEqual({
      ...DEFAULT_OVERLAY_SETTINGS,
      theme: 'dark',
    });
    expect(JSON.parse(onDisk)).toMatchObject({ theme: 'dark' });

    await service.close();
  });

  it('does not re-write file when applyUpdate produces no real change', async () => {
    // Arrange
    const service = createOverlaySettingsService({ workspaceRoot });
    await service.start();
    await service.applyUpdate({ theme: 'dark' });
    const filePath = path.join(workspaceRoot, '.pinflow', 'overlay-settings.json');
    const fs = await import('node:fs/promises');
    const beforeMtime = (await fs.stat(filePath)).mtimeMs;

    // Act
    await service.applyUpdate({ theme: 'dark' });
    const afterMtime = (await fs.stat(filePath)).mtimeMs;

    // Assert
    expect(afterMtime).toBe(beforeMtime);

    await service.close();
  });

  it('emits change event when applyUpdate actually changes the file', async () => {
    // Arrange
    const service = createOverlaySettingsService({ workspaceRoot });
    await service.start();
    const seen: unknown[] = [];
    service.onChange((s) => seen.push(s));

    // Act
    await service.applyUpdate({ theme: 'dark' });

    // Assert
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ theme: 'dark' });

    await service.close();
  });

  it('does NOT emit change event for a no-op applyUpdate', async () => {
    // Arrange
    const service = createOverlaySettingsService({ workspaceRoot });
    await service.start();
    await service.applyUpdate({ theme: 'dark' });
    const seen: unknown[] = [];
    service.onChange((s) => seen.push(s));

    // Act
    await service.applyUpdate({ theme: 'dark' });

    // Assert
    expect(seen).toHaveLength(0);

    await service.close();
  });

  it('emits change event when the file is mutated externally', async () => {
    // Arrange
    const service = createOverlaySettingsService({ workspaceRoot });
    await service.start();
    const seen: unknown[] = [];
    service.onChange((s) => seen.push(s));
    const fs = await import('node:fs/promises');
    const filePath = path.join(workspaceRoot, '.pinflow', 'overlay-settings.json');
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Act
    await fs.writeFile(filePath, JSON.stringify({ pickerMode: 'multi' }));
    await new Promise((r) => setTimeout(r, 250));

    // Assert
    expect(seen.length).toBeGreaterThanOrEqual(1);
    const last = seen[seen.length - 1] as { pickerMode: string };
    expect(last.pickerMode).toBe('multi');

    await service.close();
  });

  it('falls back to defaults on corrupted JSON file', async () => {
    // Arrange
    const fs = await import('node:fs/promises');
    const filePath = path.join(workspaceRoot, '.pinflow', 'overlay-settings.json');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, '{ malformed');
    const service = createOverlaySettingsService({ workspaceRoot });

    // Act
    await service.start();

    // Assert
    expect(service.getSettings()).toEqual(DEFAULT_OVERLAY_SETTINGS);

    await service.close();
  });
});
