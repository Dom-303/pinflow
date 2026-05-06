/**
 * Per-workspace overlay-settings file service.
 *
 * Owns `.pinflow/overlay-settings.json` for one workspace root:
 *  - reads it on start (defaults if missing / invalid)
 *  - exposes a synchronous `getSettings()` cache for HTTP / WS handlers
 *  - applies partial updates via `applyUpdate()` with stable serialization
 *    + a no-op short-circuit (no write if the serialized output is unchanged)
 *  - watches the file via chokidar and emits `onChange` events for external edits
 *
 * @module @pinflow/relay/server/services/overlay-settings-service
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import chokidar, { type FSWatcher } from 'chokidar';
import {
  DEFAULT_OVERLAY_SETTINGS,
  parseOverlaySettings,
  serializeOverlaySettings,
  type OverlaySettings,
} from '@pinflow/core';

export interface OverlaySettingsService {
  start(): Promise<void>;
  close(): Promise<void>;
  getSettings(): OverlaySettings;
  applyUpdate(partial: Partial<OverlaySettings>): Promise<OverlaySettings>;
  onChange(listener: (settings: OverlaySettings) => void): () => void;
}

interface OverlaySettingsServiceOptions {
  readonly workspaceRoot: string;
  readonly debug?: boolean;
}

export function createOverlaySettingsService(
  options: OverlaySettingsServiceOptions,
): OverlaySettingsService {
  const filePath = path.join(
    options.workspaceRoot,
    '.pinflow',
    'overlay-settings.json',
  );
  const dirPath = path.dirname(filePath);
  let cached: OverlaySettings = DEFAULT_OVERLAY_SETTINGS;
  let lastSerialized: string | null = null;
  let watcher: FSWatcher | null = null;
  const listeners = new Set<(s: OverlaySettings) => void>();
  let suppressNextWatcherEvent = false;

  function emit(next: OverlaySettings): void {
    cached = next;
    for (const l of listeners) {
      try {
        l(next);
      } catch (error) {
        if (options.debug) {
          console.error(
            '[pinflow-relay][overlay-settings-service] listener error:',
            error,
          );
        }
      }
    }
  }

  async function readFromDisk(): Promise<OverlaySettings> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return parseOverlaySettings(raw);
    } catch {
      return DEFAULT_OVERLAY_SETTINGS;
    }
  }

  async function start(): Promise<void> {
    const initial = await readFromDisk();
    cached = initial;
    try {
      lastSerialized = await fs.readFile(filePath, 'utf-8');
    } catch {
      lastSerialized = null;
    }

    // Ensure the .pinflow dir exists so the watcher can observe new files.
    await fs.mkdir(dirPath, { recursive: true });

    // Watch the parent directory (not the file itself) — on WSL2 and some
    // Linux fs implementations, chokidar cannot detect creation of a file
    // in a non-existent directory when the specific path is watched.
    const fileName = path.basename(filePath);
    watcher = chokidar.watch(dirPath, {
      ignoreInitial: true,
      persistent: false,
    });

    const isTarget = (p: string) => path.basename(p) === fileName;

    watcher.on('add', (p) => { if (isTarget(p)) void refresh(); });
    watcher.on('change', (p) => { if (isTarget(p)) void refresh(); });
    watcher.on('unlink', (p) => {
      if (!isTarget(p)) return;
      lastSerialized = null;
      emit(DEFAULT_OVERLAY_SETTINGS);
    });

    // Wait for chokidar to finish its initial scan so that changes written
    // immediately after start() resolve are not swallowed by the baseline snapshot.
    const activeWatcher = watcher;
    await new Promise<void>((resolve) => {
      activeWatcher.on('ready', () => resolve());
    });
  }

  async function refresh(): Promise<void> {
    if (suppressNextWatcherEvent) {
      suppressNextWatcherEvent = false;
      return;
    }
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      return;
    }
    if (raw === lastSerialized) return;
    lastSerialized = raw;
    emit(parseOverlaySettings(raw));
  }

  async function close(): Promise<void> {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    listeners.clear();
  }

  function getSettings(): OverlaySettings {
    return cached;
  }

  async function applyUpdate(
    partial: Partial<OverlaySettings>,
  ): Promise<OverlaySettings> {
    const merged: OverlaySettings = { ...cached, ...partial };
    const serialized = serializeOverlaySettings(merged);
    if (serialized === lastSerialized) {
      return cached;
    }
    await fs.mkdir(dirPath, { recursive: true });
    suppressNextWatcherEvent = true;
    await fs.writeFile(filePath, serialized, 'utf-8');
    lastSerialized = serialized;
    emit(merged);
    return merged;
  }

  function onChange(listener: (s: OverlaySettings) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { start, close, getSettings, applyUpdate, onChange };
}
