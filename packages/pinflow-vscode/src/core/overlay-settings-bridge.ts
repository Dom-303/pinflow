/**
 * Bidirectional bridge between VS Code Settings (`pinflow.overlay.*`)
 * and `${workspaceRoot}/.pinflow/overlay-settings.json`.
 *
 * - VS Code config change → write file (only when value differs)
 * - File change → update VS Code config (only keys that differ)
 * - On activate: seed the file from VS Code config if file does not exist
 *
 * Both directions enforce the "only-act-on-actual-changes" rule to prevent
 * sync loops. All `vscode.*` access is injected via `BridgeVscodeDeps` for
 * testability.
 *
 * @module pinflow-vscode/core/overlay-settings-bridge
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  DEFAULT_OVERLAY_SETTINGS,
  parseOverlaySettings,
  serializeOverlaySettings,
  type OverlaySettings,
} from '@pinflow/core';

const SYNC_KEYS = ['theme', 'pickerMode', 'commentEntryMode'] as const;
type SyncKey = (typeof SYNC_KEYS)[number];

export interface BridgeDisposable {
  dispose(): void;
}

export interface BridgeFileSystemWatcher {
  onDidChange(listener: () => void): BridgeDisposable;
  onDidCreate(listener: () => void): BridgeDisposable;
  onDidDelete(listener: () => void): BridgeDisposable;
  dispose(): void;
}

export interface BridgeConfiguration {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown, target?: unknown): Promise<void>;
}

export interface BridgeVscodeDeps {
  getConfiguration(): BridgeConfiguration;
  onDidChangeConfiguration(
    listener: (e: { affectsConfiguration: (key: string) => boolean }) => void,
  ): BridgeDisposable;
  createFileSystemWatcher(globPattern: string): BridgeFileSystemWatcher;
}

export interface OverlaySettingsBridge {
  activate(): Promise<void>;
  dispose(): Promise<void>;
}

interface CreateOptions {
  readonly workspaceRoot: string;
  readonly vscode: BridgeVscodeDeps;
}

export function createOverlaySettingsBridge(
  options: CreateOptions,
): OverlaySettingsBridge {
  const filePath = path.join(
    options.workspaceRoot,
    '.pinflow',
    'overlay-settings.json',
  );
  const dirPath = path.dirname(filePath);
  const disposables: BridgeDisposable[] = [];
  let fileSystemWatcher: BridgeFileSystemWatcher | null = null;
  let lastSerialized: string | null = null;

  function readConfigSnapshot(): OverlaySettings {
    const cfg = options.vscode.getConfiguration();
    return {
      theme:
        cfg.get<OverlaySettings['theme']>('pinflow.overlay.theme') ??
        DEFAULT_OVERLAY_SETTINGS.theme,
      pickerMode:
        cfg.get<OverlaySettings['pickerMode']>('pinflow.overlay.pickerMode') ??
        DEFAULT_OVERLAY_SETTINGS.pickerMode,
      commentEntryMode:
        cfg.get<OverlaySettings['commentEntryMode']>(
          'pinflow.overlay.commentEntryMode',
        ) ?? DEFAULT_OVERLAY_SETTINGS.commentEntryMode,
    };
  }

  async function readFileSnapshot(): Promise<OverlaySettings> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      lastSerialized = raw;
      return parseOverlaySettings(raw);
    } catch {
      lastSerialized = null;
      return DEFAULT_OVERLAY_SETTINGS;
    }
  }

  async function writeFileIfChanged(next: OverlaySettings): Promise<void> {
    const serialized = serializeOverlaySettings(next);
    if (serialized === lastSerialized) return;
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, serialized, 'utf-8');
    lastSerialized = serialized;
  }

  async function syncFileToConfig(): Promise<void> {
    const file = await readFileSnapshot();
    const cfg = options.vscode.getConfiguration();
    for (const key of SYNC_KEYS) {
      const current = cfg.get<string>(`pinflow.overlay.${key}`);
      if (current !== file[key as SyncKey]) {
        // Numeric 2 == ConfigurationTarget.Workspace — avoids importing vscode
        // at module top-level so the bridge stays testable without VS Code runtime.
        await cfg.update(`pinflow.overlay.${key}`, file[key as SyncKey], 2);
      }
    }
  }

  async function syncConfigToFile(): Promise<void> {
    const config = readConfigSnapshot();
    await writeFileIfChanged(config);
  }

  async function activate(): Promise<void> {
    // Seed the file from config only if the file does not already exist.
    // When the file already exists it is the source of truth — don't overwrite.
    try {
      lastSerialized = await fs.readFile(filePath, 'utf-8');
    } catch {
      await syncConfigToFile();
    }

    disposables.push(
      options.vscode.onDidChangeConfiguration((event) => {
        const touched = SYNC_KEYS.some((k) =>
          event.affectsConfiguration(`pinflow.overlay.${k}`),
        );
        if (!touched) return;
        void syncConfigToFile();
      }),
    );

    fileSystemWatcher = options.vscode.createFileSystemWatcher(
      '**/.pinflow/overlay-settings.json',
    );
    disposables.push(fileSystemWatcher.onDidChange(() => void syncFileToConfig()));
    disposables.push(fileSystemWatcher.onDidCreate(() => void syncFileToConfig()));
  }

  async function dispose(): Promise<void> {
    for (const d of disposables) {
      try {
        d.dispose();
      } catch {
        /* swallow */
      }
    }
    disposables.length = 0;
    if (fileSystemWatcher) {
      try {
        fileSystemWatcher.dispose();
      } catch {
        /* swallow */
      }
      fileSystemWatcher = null;
    }
  }

  return { activate, dispose };
}
