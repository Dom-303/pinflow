import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createOverlaySettingsBridge } from './overlay-settings-bridge.js';
import type { BridgeVscodeDeps } from './overlay-settings-bridge.js';

function makeVscodeStub() {
  const cfg = new Map<string, string>([
    ['pinflow.overlay.theme', 'light'],
    ['pinflow.overlay.pickerMode', 'element'],
    ['pinflow.overlay.commentEntryMode', 'workspace'],
  ]);
  const onDidChangeConfigurationListeners: Array<
    (e: { affectsConfiguration: (k: string) => boolean }) => void
  > = [];
  const onDidChangeFileListeners: Array<() => void> = [];
  const updateMock = vi.fn(async (key: string, value: string) => {
    cfg.set(key, value);
  });
  const stub: BridgeVscodeDeps = {
    getConfiguration: () => ({
      get: <T,>(key: string) => cfg.get(key) as T,
      update: updateMock,
    }),
    onDidChangeConfiguration: (listener) => {
      onDidChangeConfigurationListeners.push(listener);
      return { dispose: vi.fn() };
    },
    createFileSystemWatcher: () => ({
      onDidChange: (listener) => {
        onDidChangeFileListeners.push(listener);
        return { dispose: vi.fn() };
      },
      onDidCreate: (listener) => {
        onDidChangeFileListeners.push(listener);
        return { dispose: vi.fn() };
      },
      onDidDelete: () => ({ dispose: vi.fn() }),
      dispose: vi.fn(),
    }),
  };
  return {
    stub,
    cfg,
    fireConfigChange: (affected: string) => {
      for (const l of onDidChangeConfigurationListeners) {
        l({
          affectsConfiguration: (k) =>
            k === affected || affected.startsWith(k + '.'),
        });
      }
    },
    fireFileChange: () => {
      for (const l of onDidChangeFileListeners) l();
    },
    updateMock,
  };
}

describe('overlay-settings-bridge', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pinflow-bridge-'));
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('seeds the file from VS Code Settings on activate when file does not exist', async () => {
    // Arrange
    const v = makeVscodeStub();
    v.cfg.set('pinflow.overlay.theme', 'dark');
    const bridge = createOverlaySettingsBridge({ workspaceRoot, vscode: v.stub });

    // Act
    await bridge.activate();

    // Assert
    const onDisk = JSON.parse(
      await readFile(
        path.join(workspaceRoot, '.pinflow', 'overlay-settings.json'),
        'utf-8',
      ),
    );
    expect(onDisk.theme).toBe('dark');

    await bridge.dispose();
  });

  it('writes the file when configuration changes', async () => {
    // Arrange
    const v = makeVscodeStub();
    const bridge = createOverlaySettingsBridge({ workspaceRoot, vscode: v.stub });
    await bridge.activate();
    v.cfg.set('pinflow.overlay.theme', 'dark');

    // Act
    v.fireConfigChange('pinflow.overlay.theme');
    await new Promise((r) => setTimeout(r, 30));

    // Assert
    const onDisk = JSON.parse(
      await readFile(
        path.join(workspaceRoot, '.pinflow', 'overlay-settings.json'),
        'utf-8',
      ),
    );
    expect(onDisk.theme).toBe('dark');

    await bridge.dispose();
  });

  it('writes back to VS Code Settings only for keys that actually differ', async () => {
    // Arrange
    const v = makeVscodeStub();
    const bridge = createOverlaySettingsBridge({ workspaceRoot, vscode: v.stub });
    await bridge.activate();
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'overlay-settings.json'),
      JSON.stringify({
        theme: 'dark',
        pickerMode: 'element',
        commentEntryMode: 'workspace',
      }),
    );

    // Act
    v.fireFileChange();
    await new Promise((r) => setTimeout(r, 30));

    // Assert — theme differs (dark vs light) → updated; the other two match → not updated
    expect(v.updateMock).toHaveBeenCalledWith(
      'pinflow.overlay.theme',
      'dark',
      expect.anything(),
    );
    expect(v.updateMock).toHaveBeenCalledTimes(1);

    await bridge.dispose();
  });

  it('does not write the file when configuration change matches current file contents', async () => {
    // Arrange
    const v = makeVscodeStub();
    const bridge = createOverlaySettingsBridge({ workspaceRoot, vscode: v.stub });
    await bridge.activate();
    const filePath = path.join(workspaceRoot, '.pinflow', 'overlay-settings.json');
    const fs = await import('node:fs/promises');
    const beforeMtime = (await fs.stat(filePath)).mtimeMs;

    // Act — fire a change but the value didn't change
    v.fireConfigChange('pinflow.overlay.theme');
    await new Promise((r) => setTimeout(r, 30));
    const afterMtime = (await fs.stat(filePath)).mtimeMs;

    // Assert
    expect(afterMtime).toBe(beforeMtime);

    await bridge.dispose();
  });
});
