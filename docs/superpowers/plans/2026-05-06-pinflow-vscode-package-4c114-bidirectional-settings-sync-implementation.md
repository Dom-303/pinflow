# PinFlow C.1.14 Bidirectional Overlay Settings Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync three overlay user-preferences (theme, picker mode, comment entry mode) bidirectionally between VS Code Settings, a workspace file (`.pinflow/overlay-settings.json`), and the browser overlay.

**Architecture:** File-based source of truth at `${workspaceRoot}/.pinflow/overlay-settings.json`. Three layers (VS Code Extension, Relay, Overlay) all read/write/watch the file. Changes propagate via file mtime → fs watcher → consumers. Loop prevention via "only-act-on-actual-changes" rule per layer. WS broadcasts and an HTTP seed endpoint keep browser tabs in sync.

**Tech Stack:** Zod schemas (pinflow-core), Fastify + chokidar (relay), VS Code Configuration API + FileSystemWatcher (extension), Lit + WS client (overlay), Vitest with constructor DI.

**Spec:** [docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c114-bidirectional-settings-sync-design.md](../specs/2026-05-06-pinflow-vscode-package-4c114-bidirectional-settings-sync-design.md)

---

## File Structure Overview

| Path | Responsibility |
|---|---|
| `packages/pinflow-core/src/lib/types/overlay-settings.ts` | **NEW** — Zod schema, `OverlaySettings` type, defaults, JSON serializer |
| `packages/pinflow-core/src/index.ts` | Re-export overlay-settings types |
| `packages/pinflow-core/src/lib/constants/index.ts` | Two new `WS_EVENTS` entries |
| `packages/pinflow-relay/src/server/services/overlay-settings-service.ts` | **NEW** — file read/write/watch with dedup |
| `packages/pinflow-relay/src/server/services/overlay-settings-service.spec.ts` | **NEW** — service tests |
| `packages/pinflow-relay/src/server/services/index.ts` | Re-export new service |
| `packages/pinflow-relay/src/server/ws-server.ts` | Wire WS handler + broadcast on file change |
| `packages/pinflow-relay/src/server/handlers/overlay-settings-handler.ts` | **NEW** — HTTP route handler (`GET /api/overlay-settings`) |
| `packages/pinflow-relay/src/server/handlers/index.ts` | Re-export handler |
| `packages/pinflow-relay/src/server/http-server.ts` | Register the new route |
| `packages/pinflow-vscode/package.json` | Three new `pinflow.overlay.*` configuration entries |
| `packages/pinflow-vscode/src/core/overlay-settings-bridge.ts` | **NEW** — VS Code ↔ file synchronizer |
| `packages/pinflow-vscode/src/core/overlay-settings-bridge.spec.ts` | **NEW** — bridge tests with DI |
| `packages/pinflow-vscode/src/extension.ts` | Activate the bridge per workspace folder |
| `packages/pinflow-overlay/src/services/relay-service.ts` | Subscribe to WS broadcast; expose `requestSettingsUpdate(partial)` + HTTP seed-on-init |
| `packages/pinflow-overlay/src/services/relay-service.spec.ts` | New tests for the WS handlers + HTTP seed |
| `packages/pinflow-overlay/src/core/overlay-store.ts` | Split user-driven setters from sync-driven setters (`applySyncedSettings`); user setters now also call `relayService.requestSettingsUpdate` |
| `packages/pinflow-overlay/src/core/overlay-store.sync.spec.ts` | **NEW** — tests for the user-vs-sync setter split |

---

## Conventions (must follow)

- **Schema-first**: define Zod schema, derive type with `z.infer<typeof X>`. Never duplicate the shape as a hand-written interface.
- **Named exports only.** No default exports.
- **All imports use `.js` extension** (ESM compiled output, even when source is `.ts`).
- **Constructor DI** for testability — every new service or bridge takes its dependencies via `private readonly` constructor params, with a `createDefault*` factory wiring real impls.
- **No `vi.mock` on Node built-ins** — inject `fs` / `chokidar` / `vscode` via DI surfaces.
- **`PinFlowError` for domain errors** when we throw inside the relay; quiet log otherwise.
- **Stable JSON formatting**: 2-space indent, sorted keys (use the helper introduced in Task 1).
- **AAA test layout** with blank lines separating Arrange/Act/Assert.
- **Single in_progress task at a time** — do not start the next task until the current one is committed.

---

## Task 1: Schema + WS_EVENTS in `@pinflow/core`, settings declarations in `pinflow-vscode`

**Files:**
- Create: `packages/pinflow-core/src/lib/types/overlay-settings.ts`
- Modify: `packages/pinflow-core/src/index.ts`
- Modify: `packages/pinflow-core/src/lib/constants/index.ts:47-65` (extend `WS_EVENTS`)
- Modify: `packages/pinflow-vscode/package.json:147-205` (extend `contributes.configuration.properties`)
- Test: `packages/pinflow-core/src/lib/types/overlay-settings.spec.ts`

### Step 1.1: Write the schema spec (failing test)

- [ ] Write `packages/pinflow-core/src/lib/types/overlay-settings.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  OverlaySettingsSchema,
  DEFAULT_OVERLAY_SETTINGS,
  serializeOverlaySettings,
  parseOverlaySettings,
} from './overlay-settings.js';

describe('OverlaySettings schema', () => {
  describe('OverlaySettingsSchema', () => {
    it('parses a fully populated valid settings object', () => {
      // Arrange
      const input = {
        theme: 'dark',
        pickerMode: 'region',
        commentEntryMode: 'inline',
      };

      // Act
      const result = OverlaySettingsSchema.parse(input);

      // Assert
      expect(result).toEqual(input);
    });

    it('fills missing keys with defaults', () => {
      // Arrange
      const input = {};

      // Act
      const result = OverlaySettingsSchema.parse(input);

      // Assert
      expect(result).toEqual({
        theme: 'light',
        pickerMode: 'element',
        commentEntryMode: 'workspace',
      });
    });

    it('rejects invalid theme value', () => {
      // Arrange
      const input = { theme: 'system' };

      // Act + Assert
      expect(() => OverlaySettingsSchema.parse(input)).toThrow();
    });

    it('rejects invalid pickerMode value', () => {
      expect(() =>
        OverlaySettingsSchema.parse({ pickerMode: 'lasso' }),
      ).toThrow();
    });
  });

  describe('DEFAULT_OVERLAY_SETTINGS', () => {
    it('matches the schema default', () => {
      expect(OverlaySettingsSchema.parse({})).toEqual(DEFAULT_OVERLAY_SETTINGS);
    });
  });

  describe('serializeOverlaySettings', () => {
    it('produces stable 2-space-indented JSON with sorted keys + $schema header', () => {
      // Arrange
      const settings = {
        theme: 'dark' as const,
        pickerMode: 'element' as const,
        commentEntryMode: 'workspace' as const,
      };

      // Act
      const output = serializeOverlaySettings(settings);

      // Assert
      expect(output).toBe(
        [
          '{',
          '  "$schema": "https://pinflow.dev/schemas/overlay-settings.json",',
          '  "commentEntryMode": "workspace",',
          '  "pickerMode": "element",',
          '  "theme": "dark"',
          '}',
        ].join('\n'),
      );
    });

    it('is deterministic for the same input (key order independent)', () => {
      // Arrange
      const a = { theme: 'light' as const, pickerMode: 'element' as const, commentEntryMode: 'workspace' as const };
      const b = { commentEntryMode: 'workspace' as const, pickerMode: 'element' as const, theme: 'light' as const };

      // Act + Assert
      expect(serializeOverlaySettings(a)).toBe(serializeOverlaySettings(b));
    });
  });

  describe('parseOverlaySettings', () => {
    it('returns defaults for invalid JSON string', () => {
      expect(parseOverlaySettings('not-json')).toEqual(DEFAULT_OVERLAY_SETTINGS);
    });

    it('returns defaults when fields are missing', () => {
      expect(parseOverlaySettings('{}')).toEqual(DEFAULT_OVERLAY_SETTINGS);
    });

    it('returns defaults when a value is invalid', () => {
      expect(parseOverlaySettings('{"theme": "system"}')).toEqual(
        DEFAULT_OVERLAY_SETTINGS,
      );
    });

    it('round-trips a serialized object', () => {
      // Arrange
      const settings = {
        theme: 'dark' as const,
        pickerMode: 'multi' as const,
        commentEntryMode: 'inline' as const,
      };

      // Act
      const parsed = parseOverlaySettings(serializeOverlaySettings(settings));

      // Assert
      expect(parsed).toEqual(settings);
    });
  });
});
```

- [ ] Run: `corepack pnpm exec nx test pinflow-core -- --testPathPattern=overlay-settings`
- [ ] Expected: FAIL — `Cannot find module './overlay-settings.js'`.

### Step 1.2: Implement the schema module

- [ ] Create `packages/pinflow-core/src/lib/types/overlay-settings.ts`:

```typescript
/**
 * Bidirectionally synced overlay user preferences.
 * Same shape lives in VS Code Settings, the relay file, and the overlay's localStorage.
 * @module @pinflow/core/types/overlay-settings
 */
import { z } from 'zod';

export const OverlaySettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  pickerMode: z.enum(['element', 'region', 'multi']).default('element'),
  commentEntryMode: z.enum(['workspace', 'inline']).default('workspace'),
});

export type OverlaySettings = z.infer<typeof OverlaySettingsSchema>;

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings =
  OverlaySettingsSchema.parse({});

const SCHEMA_URL = 'https://pinflow.dev/schemas/overlay-settings.json';

/**
 * Serialize settings to a stable, sorted, pretty-printed JSON string.
 * Used as the canonical on-disk representation; key order is stable so
 * a no-op write produces an identical byte sequence (file mtime guard).
 */
export function serializeOverlaySettings(settings: OverlaySettings): string {
  const payload: Record<string, string> = {
    $schema: SCHEMA_URL,
    commentEntryMode: settings.commentEntryMode,
    pickerMode: settings.pickerMode,
    theme: settings.theme,
  };
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(payload).sort()) {
    sorted[key] = payload[key];
  }
  return JSON.stringify(sorted, null, 2);
}

/**
 * Parse a JSON string into validated settings.
 * Falls back to DEFAULT_OVERLAY_SETTINGS on any error (parse / schema).
 * The `$schema` field is metadata only and is discarded by the schema.
 */
export function parseOverlaySettings(raw: string): OverlaySettings {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return OverlaySettingsSchema.parse(parsed);
  } catch {
    return DEFAULT_OVERLAY_SETTINGS;
  }
}
```

- [ ] Run: `corepack pnpm exec nx test pinflow-core -- --testPathPattern=overlay-settings`
- [ ] Expected: PASS — all 11 cases green.

### Step 1.3: Re-export from package barrel

- [ ] Modify `packages/pinflow-core/src/index.ts` — add after the existing `lib/types/*` exports:

```typescript
export * from './lib/types/overlay-settings.js';
```

- [ ] Run: `corepack pnpm exec nx typecheck pinflow-core`
- [ ] Expected: PASS.

### Step 1.4: Extend `WS_EVENTS`

- [ ] Modify `packages/pinflow-core/src/lib/constants/index.ts:47-65` — extend the `WS_EVENTS` literal:

```typescript
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',

  // Annotation events
  ANNOTATION_CREATED: 'annotation:created',
  ANNOTATION_UPDATED: 'annotation:updated',

  // Manifest events
  MANIFEST_UPDATED: 'manifest:updated',

  // Context request/response events (relay↔browser bidirectional)
  CONTEXT_REQUEST: 'context:request',
  CONTEXT_RESPONSE: 'context:response',
  BROWSER_SESSION_UPDATE: 'browser:session:update',

  // Overlay settings sync (server → all clients, client → server)
  OVERLAY_SETTINGS_UPDATED: 'overlay:settings:updated',
  OVERLAY_SETTINGS_REQUEST: 'overlay:settings:request',
} as const;
```

### Step 1.5: Declare VS Code settings

- [ ] Modify `packages/pinflow-vscode/package.json:147-205` — append to `contributes.configuration.properties` (after `pinflow.onboarding.mode`, before the closing brace of `properties`):

```json
"pinflow.overlay.theme": {
  "type": "string",
  "enum": ["light", "dark"],
  "default": "light",
  "description": "Overlay color theme. Synced bidirectionally with the browser overlay via .pinflow/overlay-settings.json. Changes here apply to all open browser tabs of this workspace within ~500 ms."
},
"pinflow.overlay.pickerMode": {
  "type": "string",
  "enum": ["element", "region", "multi"],
  "default": "element",
  "description": "Default capture mode in the overlay picker. 'element' picks one element on click, 'region' draws a selection rectangle, 'multi' allows multiple element picks per annotation. Synced bidirectionally with the browser overlay."
},
"pinflow.overlay.commentEntryMode": {
  "type": "string",
  "enum": ["workspace", "inline"],
  "default": "workspace",
  "description": "Where annotation comments are entered. 'workspace' uses the right-side workspace panel, 'inline' shows a popover next to the picked element. Synced bidirectionally with the browser overlay."
}
```

- [ ] Run: `corepack pnpm exec nx run-many --target=lint --target=typecheck --projects=pinflow-core,pinflow-vscode`
- [ ] Expected: PASS for both targets in both projects.

### Step 1.6: Commit

- [ ] Stage and commit:

```bash
git add packages/pinflow-core/src/lib/types/overlay-settings.ts \
        packages/pinflow-core/src/lib/types/overlay-settings.spec.ts \
        packages/pinflow-core/src/index.ts \
        packages/pinflow-core/src/lib/constants/index.ts \
        packages/pinflow-vscode/package.json

git commit -m "feat(core+vscode): C.1.14 Task 1 — OverlaySettings schema + WS events + VS Code config

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Relay overlay-settings service + HTTP route + WS wiring

**Files:**
- Create: `packages/pinflow-relay/src/server/services/overlay-settings-service.ts`
- Create: `packages/pinflow-relay/src/server/services/overlay-settings-service.spec.ts`
- Modify: `packages/pinflow-relay/src/server/services/index.ts`
- Create: `packages/pinflow-relay/src/server/handlers/overlay-settings-handler.ts`
- Modify: `packages/pinflow-relay/src/server/handlers/index.ts`
- Modify: `packages/pinflow-relay/src/server/http-server.ts` (register route)
- Modify: `packages/pinflow-relay/src/server/ws-server.ts` (subscribe to service + handle WS request)

The service owns all file I/O for `.pinflow/overlay-settings.json`. It exposes:
- `getSettings()` — current parsed value (synchronous, in-memory cache)
- `applyUpdate(partial)` — merge + validate + write file (only if changed)
- `onChange(listener)` — subscribe to file-change events
- `start()` / `close()` — lifecycle (starts the chokidar watcher; safe to call once)

### Step 2.1: Write the service spec (failing test)

- [ ] Create `packages/pinflow-relay/src/server/services/overlay-settings-service.spec.ts`:

```typescript
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
```

- [ ] Run: `corepack pnpm exec nx test pinflow-relay -- --testPathPattern=overlay-settings-service`
- [ ] Expected: FAIL — module not found.

### Step 2.2: Implement the service

- [ ] Create `packages/pinflow-relay/src/server/services/overlay-settings-service.ts`:

```typescript
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

    watcher = chokidar.watch(filePath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
    });
    watcher.on('add', refresh);
    watcher.on('change', refresh);
    watcher.on('unlink', () => {
      lastSerialized = null;
      emit(DEFAULT_OVERLAY_SETTINGS);
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
```

- [ ] Run: `corepack pnpm exec nx test pinflow-relay -- --testPathPattern=overlay-settings-service`
- [ ] Expected: PASS — all 8 cases green.

### Step 2.3: Re-export from services barrel

- [ ] Modify `packages/pinflow-relay/src/server/services/index.ts` — add:

```typescript
export {
  createOverlaySettingsService,
  type OverlaySettingsService,
} from './overlay-settings-service.js';
```

### Step 2.4: HTTP route handler (`GET /api/overlay-settings`)

- [ ] Create `packages/pinflow-relay/src/server/handlers/overlay-settings-handler.ts`:

```typescript
/**
 * HTTP handler for GET /api/overlay-settings.
 * Returns the current settings cache for seed-on-connect.
 *
 * @module @pinflow/relay/server/handlers/overlay-settings-handler
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { OverlaySettingsService } from '../services/overlay-settings-service.js';

export interface OverlaySettingsHandlerDeps {
  readonly service: OverlaySettingsService;
}

export function createOverlaySettingsHandler(deps: OverlaySettingsHandlerDeps) {
  return async (_req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const settings = deps.service.getSettings();
    await reply.code(200).type('application/json').send(settings);
  };
}
```

- [ ] Modify `packages/pinflow-relay/src/server/handlers/index.ts` — add:

```typescript
export { createOverlaySettingsHandler } from './overlay-settings-handler.js';
export type { OverlaySettingsHandlerDeps } from './overlay-settings-handler.js';
```

### Step 2.5: Register the HTTP route

- [ ] Modify `packages/pinflow-relay/src/server/http-server.ts` — find where existing routes are registered (search for `app.get('/api/status'` or similar `app.get(` for `/api/...`) and add alongside:

```typescript
app.get('/api/overlay-settings', createOverlaySettingsHandler({ service: overlaySettingsService }));
```

The `overlaySettingsService` must be passed into the http-server factory. Add it to the existing options interface (the modification location depends on the current shape — locate the function that takes `app, annotationService, manifestReader, ...` and add `overlaySettingsService: OverlaySettingsService`).

- [ ] If unsure where to wire the dependency, run: `grep -n "annotationService" packages/pinflow-relay/src/server/http-server.ts | head -20` — and add `overlaySettingsService` next to every annotation-service occurrence in the function signature.

### Step 2.6: WS server — broadcast on file change + handle inbound `OVERLAY_SETTINGS_REQUEST`

- [ ] Modify `packages/pinflow-relay/src/server/ws-server.ts`:
  - Add `overlaySettingsService: OverlaySettingsService` to `WSServerOptions`.
  - Inside `createWSServer`:

```typescript
// After the existing manifestReader subscription block:
const unsubOverlay = overlaySettingsService.onChange((settings) => {
  broadcast(WS_EVENTS.OVERLAY_SETTINGS_UPDATED, settings);
});
unsubscribers.push(unsubOverlay);
```

  - Inside the `socket.on('message', ...)` handler, alongside the existing `BROWSER_SESSION_UPDATE` and `CONTEXT_RESPONSE` branches, add:

```typescript
} else if (msg.event === WS_EVENTS.OVERLAY_SETTINGS_REQUEST) {
  // Validate as Partial<OverlaySettings> via the schema's partial form.
  const partial = OverlaySettingsSchema.partial().parse(msg.data);
  await overlaySettingsService.applyUpdate(partial);
}
```

  - Add the import at the top:

```typescript
import { OverlaySettingsSchema } from '@pinflow/core';
import type { OverlaySettingsService } from './services/overlay-settings-service.js';
```

  - The outer `socket.on('message', ...)` callback must be `async (raw)` to use `await`. If it is currently sync, change it. The existing try/catch already swallows errors (the `}` catch block) which is fine — invalid request data is silently ignored.

### Step 2.7: Wire the service in the relay startup path

The relay's startup sequence (look for `createServer` or a top-level entry that calls `createWSServer`) needs to:
1. Construct the `OverlaySettingsService` for the active workspace root.
2. Call `service.start()` before `createWSServer`.
3. Pass it into both `createWSServer` and the http-server registration.
4. Call `service.close()` during shutdown.

- [ ] `grep -n "createWSServer\|createHttpServer\|WSServerOptions" packages/pinflow-relay/src --include="*.ts" -r | head -20`
- [ ] Wire the service at the call site (typically in `packages/pinflow-relay/src/server/relay-server.ts` or `index.ts`). The workspace root is already known there (the relay binds to it).

### Step 2.8: Run the full relay test suite

- [ ] Run: `corepack pnpm exec nx test pinflow-relay`
- [ ] Expected: PASS — existing tests still green, 8 new overlay-settings tests added. Any failure here usually means the WS server or http-server wiring broke an existing test fixture; inspect the failing test and pass the new service through `createTestServer` if needed (or default it to a test stub).

### Step 2.9: Commit

```bash
git add packages/pinflow-relay/src/server/services/overlay-settings-service.ts \
        packages/pinflow-relay/src/server/services/overlay-settings-service.spec.ts \
        packages/pinflow-relay/src/server/services/index.ts \
        packages/pinflow-relay/src/server/handlers/overlay-settings-handler.ts \
        packages/pinflow-relay/src/server/handlers/index.ts \
        packages/pinflow-relay/src/server/http-server.ts \
        packages/pinflow-relay/src/server/ws-server.ts \
        packages/pinflow-relay/src/server/relay-server.ts

git commit -m "feat(relay): C.1.14 Task 2 — overlay-settings service + HTTP route + WS sync

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: VS Code overlay-settings-bridge

**Files:**
- Create: `packages/pinflow-vscode/src/core/overlay-settings-bridge.ts`
- Create: `packages/pinflow-vscode/src/core/overlay-settings-bridge.spec.ts`
- Modify: `packages/pinflow-vscode/src/extension.ts`

The bridge runs inside the VS Code extension. It owns:
- A `vscode.workspace.onDidChangeConfiguration` listener — when `pinflow.overlay.*` changes, write the file (via the relay's HTTP/WS, OR directly to the file). For C.1.14 we **write directly to the file** because the bridge has filesystem access and the relay's watcher will broadcast it.
- A `vscode.workspace.createFileSystemWatcher` on `**/.pinflow/overlay-settings.json` — when the file changes, write back to VS Code Settings (only for keys that actually differ).

### Step 3.1: Spec the bridge with constructor DI

- [ ] Create `packages/pinflow-vscode/src/core/overlay-settings-bridge.spec.ts`:

```typescript
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
  const onDidChangeConfigurationListeners: Array<(e: { affectsConfiguration: (k: string) => boolean }) => void> = [];
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
      return { dispose: () => {} };
    },
    createFileSystemWatcher: () => ({
      onDidChange: (listener) => {
        onDidChangeFileListeners.push(listener);
        return { dispose: () => {} };
      },
      onDidCreate: (listener) => {
        onDidChangeFileListeners.push(listener);
        return { dispose: () => {} };
      },
      onDidDelete: () => ({ dispose: () => {} }),
      dispose: () => {},
    }),
  };
  return {
    stub,
    cfg,
    fireConfigChange: (affected: string) => {
      for (const l of onDidChangeConfigurationListeners) {
        l({ affectsConfiguration: (k) => k === affected || affected.startsWith(k + '.') });
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
      await readFile(path.join(workspaceRoot, '.pinflow', 'overlay-settings.json'), 'utf-8'),
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
      await readFile(path.join(workspaceRoot, '.pinflow', 'overlay-settings.json'), 'utf-8'),
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
      JSON.stringify({ theme: 'dark', pickerMode: 'element', commentEntryMode: 'workspace' }),
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
```

- [ ] Run: `corepack pnpm exec nx test pinflow-vscode -- --testPathPattern=overlay-settings-bridge`
- [ ] Expected: FAIL — module not found.

### Step 3.2: Implement the bridge

- [ ] Create `packages/pinflow-vscode/src/core/overlay-settings-bridge.ts`:

```typescript
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
        (cfg.get<OverlaySettings['theme']>('pinflow.overlay.theme') as
          | OverlaySettings['theme']
          | undefined) ?? DEFAULT_OVERLAY_SETTINGS.theme,
      pickerMode:
        (cfg.get<OverlaySettings['pickerMode']>('pinflow.overlay.pickerMode') as
          | OverlaySettings['pickerMode']
          | undefined) ?? DEFAULT_OVERLAY_SETTINGS.pickerMode,
      commentEntryMode:
        (cfg.get<OverlaySettings['commentEntryMode']>(
          'pinflow.overlay.commentEntryMode',
        ) as OverlaySettings['commentEntryMode'] | undefined) ??
        DEFAULT_OVERLAY_SETTINGS.commentEntryMode,
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
      if (current !== file[key]) {
        // 2 == ConfigurationTarget.Workspace — do not import vscode at module
        // top-level; pass numeric value to keep deps testable.
        await cfg.update(`pinflow.overlay.${key}`, file[key], 2);
      }
    }
  }

  async function syncConfigToFile(): Promise<void> {
    const config = readConfigSnapshot();
    await writeFileIfChanged(config);
  }

  async function activate(): Promise<void> {
    // Seed the file from config if it does not exist
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
```

- [ ] Run: `corepack pnpm exec nx test pinflow-vscode -- --testPathPattern=overlay-settings-bridge`
- [ ] Expected: PASS — all 4 cases green.

### Step 3.3: Wire activation in `extension.ts`

- [ ] Modify `packages/pinflow-vscode/src/extension.ts`:
  - Add import: `import { createOverlaySettingsBridge, type OverlaySettingsBridge } from './core/overlay-settings-bridge.js';`
  - Inside `activate`, after the workspace folder is resolved, instantiate one bridge per workspace folder root. Wrap the real `vscode.*` calls in a `BridgeVscodeDeps` adapter:

```typescript
function makeBridgeDeps(): BridgeVscodeDeps {
  return {
    getConfiguration: () => {
      const c = vscode.workspace.getConfiguration();
      return {
        get: <T,>(key: string) => c.get<T>(key),
        update: async (key: string, value: unknown, target?: unknown) =>
          void c.update(
            key,
            value,
            target as vscode.ConfigurationTarget | undefined,
          ),
      };
    },
    onDidChangeConfiguration: (listener) =>
      vscode.workspace.onDidChangeConfiguration((e) =>
        listener({
          affectsConfiguration: (k) => e.affectsConfiguration(k),
        }),
      ),
    createFileSystemWatcher: (glob: string) => {
      const w = vscode.workspace.createFileSystemWatcher(glob);
      return {
        onDidChange: (l) => w.onDidChange(l),
        onDidCreate: (l) => w.onDidCreate(l),
        onDidDelete: (l) => w.onDidDelete(l),
        dispose: () => w.dispose(),
      };
    },
  };
}

const overlayBridges: OverlaySettingsBridge[] = [];
for (const folder of vscode.workspace.workspaceFolders ?? []) {
  const bridge = createOverlaySettingsBridge({
    workspaceRoot: folder.uri.fsPath,
    vscode: makeBridgeDeps(),
  });
  await bridge.activate();
  overlayBridges.push(bridge);
}

context.subscriptions.push({
  dispose: () => {
    for (const b of overlayBridges) {
      void b.dispose();
    }
  },
});
```

  - If multiple workspace folders are added/removed at runtime, also subscribe to `vscode.workspace.onDidChangeWorkspaceFolders` and create/dispose bridges accordingly. Reuse the same `overlayBridges` array.

### Step 3.4: Run lint + typecheck + tests

- [ ] Run: `corepack pnpm exec nx run-many --target=lint --target=typecheck --target=test --projects=pinflow-vscode`
- [ ] Expected: all green; bridge tests = 4 new cases.

### Step 3.5: Commit

```bash
git add packages/pinflow-vscode/src/core/overlay-settings-bridge.ts \
        packages/pinflow-vscode/src/core/overlay-settings-bridge.spec.ts \
        packages/pinflow-vscode/src/extension.ts

git commit -m "feat(vscode): C.1.14 Task 3 — VS Code ↔ overlay-settings.json bridge

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Overlay relay-service WS subscriber + sender + HTTP seed

**Files:**
- Modify: `packages/pinflow-overlay/src/services/relay-service.ts`
- Modify: `packages/pinflow-overlay/src/services/relay-service.spec.ts`

The overlay's `RelayService` becomes the channel for settings sync:
- During `initialize()`, after WS connect, fetch `GET /api/overlay-settings` once and call `store.applySyncedSettings(settings)`.
- Subscribe to `WS_EVENTS.OVERLAY_SETTINGS_UPDATED` and forward into the store as `applySyncedSettings(payload)`.
- Expose a public `requestSettingsUpdate(partial)` method that sends `WS_EVENTS.OVERLAY_SETTINGS_REQUEST` with the partial.

### Step 4.1: Add tests for the new behaviors

- [ ] Modify `packages/pinflow-overlay/src/services/relay-service.spec.ts` — add to the existing describe block (after the existing connection tests):

```typescript
describe('overlay settings sync', () => {
  it('seeds the store from GET /api/overlay-settings on init', async () => {
    // Arrange
    const httpClient = makeHttpClientStub({
      overlaySettings: { theme: 'dark', pickerMode: 'multi', commentEntryMode: 'inline' },
    });
    const wsClient = makeWsClientStub();
    const store = OverlayStore.getInstance();
    const applySpy = vi.spyOn(store, 'applySyncedSettings');
    setRelayClients({ httpClient, wsClient });

    // Act
    await RelayService.getInstance().initialize();

    // Assert
    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark', pickerMode: 'multi', commentEntryMode: 'inline' }),
    );
  });

  it('applies an incoming OVERLAY_SETTINGS_UPDATED broadcast via applySyncedSettings', async () => {
    // Arrange
    const wsClient = makeWsClientStub();
    setRelayClients({ httpClient: makeHttpClientStub(), wsClient });
    const store = OverlayStore.getInstance();
    const applySpy = vi.spyOn(store, 'applySyncedSettings');
    await RelayService.getInstance().initialize();

    // Act
    wsClient.fire(WS_EVENTS.OVERLAY_SETTINGS_UPDATED, {
      theme: 'dark',
      pickerMode: 'element',
      commentEntryMode: 'workspace',
    });

    // Assert
    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' }),
    );
  });

  it('requestSettingsUpdate sends a WS message with the partial payload', async () => {
    // Arrange
    const wsClient = makeWsClientStub();
    setRelayClients({ httpClient: makeHttpClientStub(), wsClient });
    await RelayService.getInstance().initialize();

    // Act
    RelayService.getInstance().requestSettingsUpdate({ theme: 'dark' });

    // Assert
    expect(wsClient.send).toHaveBeenCalledWith(
      WS_EVENTS.OVERLAY_SETTINGS_REQUEST,
      { theme: 'dark' },
    );
  });

  it('falls back gracefully when GET /api/overlay-settings fails (no throw)', async () => {
    // Arrange
    const httpClient = makeHttpClientStub({ overlaySettingsThrows: true });
    setRelayClients({ httpClient, wsClient: makeWsClientStub() });

    // Act + Assert — should not throw
    await expect(
      RelayService.getInstance().initialize(),
    ).resolves.toBeDefined();
  });
});
```

> Note: `setRelayClients`, `makeHttpClientStub`, `makeWsClientStub`, and `applySyncedSettings` may not exist yet. Inspect the existing spec file to find the established stub helpers (the spec is on disk at the start of this task) and adapt the helpers to expose the same shape. If the existing spec uses a different DI surface, mirror that surface — do not invent a new pattern.

- [ ] Run: `corepack pnpm exec nx test pinflow-overlay -- --testPathPattern=relay-service`
- [ ] Expected: FAIL — methods or store fn not yet implemented.

### Step 4.2: Implement the new RelayService surface

- [ ] Modify `packages/pinflow-overlay/src/services/relay-service.ts`:

  1. Add to the `RelayHttpClient` usage: a method to fetch overlay settings. If the existing `RelayHttpClient` does not have one, add it inline using `fetch` (the host+port are already known on the service):

```typescript
private async fetchOverlaySettings(): Promise<OverlaySettings | null> {
  if (!this.relayHttpClient) return null;
  try {
    const port = window.__PINFLOW_RELAY_PORT__;
    const host = window.__PINFLOW_RELAY_HOST__ ?? '127.0.0.1';
    const res = await fetch(`http://${host}:${port}/api/overlay-settings`);
    if (!res.ok) return null;
    const json = await res.json() as unknown;
    return OverlaySettingsSchema.parse(json);
  } catch {
    return null;
  }
}
```

  2. Inside `initialize()`, after the existing `setRelayConnection(true, port, host)` line near the bottom, add the seed step + WS subscription:

```typescript
// Seed overlay settings from the relay (one-time HTTP GET).
const initialSettings = await this.fetchOverlaySettings();
if (initialSettings) {
  this.store.applySyncedSettings(initialSettings);
}

// Subscribe to broadcasts for cross-tab sync.
this.unsubscribers.push(
  this.wsClient.on(WS_EVENTS.OVERLAY_SETTINGS_UPDATED, (data: unknown) => {
    try {
      const settings = OverlaySettingsSchema.parse(data);
      this.store.applySyncedSettings(settings);
    } catch {
      /* ignore malformed payload */
    }
  }),
);
```

  3. Add the public method:

```typescript
/**
 * Send a partial overlay-settings update to the relay.
 * Called by the OverlayStore's user-driven setters; sync-driven setters MUST NOT call this.
 */
requestSettingsUpdate(partial: Partial<OverlaySettings>): void {
  this.wsClient?.send(WS_EVENTS.OVERLAY_SETTINGS_REQUEST, partial);
}
```

  4. Imports at the top:

```typescript
import {
  OverlaySettingsSchema,
  type OverlaySettings,
} from '@pinflow/core';
```

- [ ] Run: `corepack pnpm exec nx test pinflow-overlay -- --testPathPattern=relay-service`
- [ ] Expected: PASS — initialize seeds, broadcasts apply, sender works, HTTP failure does not throw.

### Step 4.3: Lint + typecheck

- [ ] Run: `corepack pnpm exec nx run-many --target=lint --target=typecheck --projects=pinflow-overlay`
- [ ] Expected: PASS.

### Step 4.4: Commit

```bash
git add packages/pinflow-overlay/src/services/relay-service.ts \
        packages/pinflow-overlay/src/services/relay-service.spec.ts

git commit -m "feat(overlay): C.1.14 Task 4 — relay-service WS subscriber + sender + HTTP seed

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Overlay store user-vs-sync setter split

**Files:**
- Modify: `packages/pinflow-overlay/src/core/overlay-store.ts`
- Create: `packages/pinflow-overlay/src/core/overlay-store.sync.spec.ts`

The store's existing `setTheme/setPickerMode/setCommentEntryMode` setters currently:
1. update state
2. write localStorage

The new model:
- **User-driven setters** (existing names — `setTheme`, `setPickerMode`, `setCommentEntryMode`): unchanged behavior PLUS dispatch `relayService.requestSettingsUpdate({ <key>: value })`.
- **`applySyncedSettings(settings)`** (new method, called only by `RelayService`): updates state + writes localStorage, but does **not** dispatch back. Each key only applied if it differs from current state (no-op otherwise — guards against echo).

### Step 5.1: Spec the new contract

- [ ] Create `packages/pinflow-overlay/src/core/overlay-store.sync.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverlayStore } from './overlay-store.js';
import { RelayService } from '../services/relay-service.js';

describe('OverlayStore — settings sync', () => {
  beforeEach(() => {
    OverlayStore.resetInstance();
    RelayService.resetInstance();
    localStorage.clear();
  });

  describe('user-driven setters', () => {
    it('setTheme updates state, persists, and asks relay to broadcast', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      const requestSpy = vi
        .spyOn(RelayService.getInstance(), 'requestSettingsUpdate')
        .mockImplementation(() => undefined);

      // Act
      store.setTheme('dark');

      // Assert
      expect(store.getState().theme).toBe('dark');
      expect(localStorage.getItem('pinflow:theme')).toBe('dark');
      expect(requestSpy).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('setPickerMode triggers a relay request with pickerMode', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      const requestSpy = vi
        .spyOn(RelayService.getInstance(), 'requestSettingsUpdate')
        .mockImplementation(() => undefined);

      // Act
      store.setPickerMode('multi');

      // Assert
      expect(requestSpy).toHaveBeenCalledWith({ pickerMode: 'multi' });
    });

    it('setCommentEntryMode triggers a relay request with commentEntryMode', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      const requestSpy = vi
        .spyOn(RelayService.getInstance(), 'requestSettingsUpdate')
        .mockImplementation(() => undefined);

      // Act
      store.setCommentEntryMode('inline');

      // Assert
      expect(requestSpy).toHaveBeenCalledWith({ commentEntryMode: 'inline' });
    });
  });

  describe('applySyncedSettings', () => {
    it('updates state for every changed key', () => {
      // Arrange
      const store = OverlayStore.getInstance();

      // Act
      store.applySyncedSettings({
        theme: 'dark',
        pickerMode: 'multi',
        commentEntryMode: 'inline',
      });

      // Assert
      expect(store.getState()).toMatchObject({
        theme: 'dark',
        pickerMode: 'multi',
        commentEntryMode: 'inline',
      });
    });

    it('writes localStorage for every changed key', () => {
      // Arrange
      const store = OverlayStore.getInstance();

      // Act
      store.applySyncedSettings({
        theme: 'dark',
        pickerMode: 'multi',
        commentEntryMode: 'inline',
      });

      // Assert
      expect(localStorage.getItem('pinflow:theme')).toBe('dark');
      expect(localStorage.getItem('pinflow:pickerMode')).toBe('multi');
      expect(localStorage.getItem('pinflow:commentEntryMode')).toBe('inline');
    });

    it('does NOT call relayService.requestSettingsUpdate', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      const requestSpy = vi
        .spyOn(RelayService.getInstance(), 'requestSettingsUpdate')
        .mockImplementation(() => undefined);

      // Act
      store.applySyncedSettings({ theme: 'dark' });

      // Assert
      expect(requestSpy).not.toHaveBeenCalled();
    });

    it('is a no-op when incoming value equals current state', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      const subscriber = vi.fn();
      store.subscribe(subscriber);
      subscriber.mockClear();

      // Act
      store.applySyncedSettings({ theme: 'light' });

      // Assert
      expect(subscriber).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] Run: `corepack pnpm exec nx test pinflow-overlay -- --testPathPattern=overlay-store.sync`
- [ ] Expected: FAIL — `applySyncedSettings` not defined; setters do not call `requestSettingsUpdate`.

### Step 5.2: Modify the store

- [ ] Modify `packages/pinflow-overlay/src/core/overlay-store.ts`:

  1. Locate the existing `setTheme`, `setPickerMode`, `setCommentEntryMode` methods.
  2. After each `setState` + localStorage write, add (only if value actually changed compared to previous state — use a guard at the top of each method to short-circuit):

```typescript
RelayService.getInstance().requestSettingsUpdate({ theme: value });
```

(equivalent for `pickerMode` and `commentEntryMode`).

  3. Each method's structure becomes:

```typescript
setTheme(theme: OverlayTheme): void {
  if (this.state.theme === theme) return;
  this.setState({ theme });
  this.persistTheme(theme);
  RelayService.getInstance().requestSettingsUpdate({ theme });
}
```

If `persistTheme` does not exist, the existing inline localStorage write (look near the existing setter for the literal `localStorage.setItem(OverlayStore.THEME_KEY, ...)`) stays. The added guard + `requestSettingsUpdate` is what's new.

Apply the same shape to `setPickerMode` and `setCommentEntryMode`.

  4. Add the new `applySyncedSettings` method:

```typescript
/**
 * Apply settings received from the relay (broadcast or HTTP seed).
 * Updates state + localStorage for changed keys only; does NOT echo back to the relay.
 */
applySyncedSettings(settings: Partial<OverlaySettings>): void {
  const patch: Partial<OverlayState> = {};
  if (settings.theme !== undefined && settings.theme !== this.state.theme) {
    patch.theme = settings.theme;
    try {
      localStorage.setItem(OverlayStore.THEME_KEY, settings.theme);
    } catch {
      /* ignore localStorage failures */
    }
  }
  if (
    settings.pickerMode !== undefined &&
    settings.pickerMode !== this.state.pickerMode
  ) {
    patch.pickerMode = settings.pickerMode;
    try {
      localStorage.setItem(OverlayStore.PICKER_MODE_KEY, settings.pickerMode);
    } catch {
      /* ignore */
    }
  }
  if (
    settings.commentEntryMode !== undefined &&
    settings.commentEntryMode !== this.state.commentEntryMode
  ) {
    patch.commentEntryMode = settings.commentEntryMode;
    try {
      localStorage.setItem(
        OverlayStore.COMMENT_ENTRY_MODE_KEY,
        settings.commentEntryMode,
      );
    } catch {
      /* ignore */
    }
  }
  if (Object.keys(patch).length === 0) return;
  this.setState(patch);
}
```

  5. Add the import at the top:

```typescript
import type { OverlaySettings } from '@pinflow/core';
```

- [ ] Run: `corepack pnpm exec nx test pinflow-overlay -- --testPathPattern=overlay-store.sync`
- [ ] Expected: PASS — all 7 cases green.

### Step 5.3: Update existing persistence tests if needed

Some existing tests for `setTheme`/`setPickerMode`/`setCommentEntryMode` may not have a `RelayService` mock and will now throw because `RelayService.getInstance()` is unmocked. The cleanest fix is in those existing test files: add a `vi.spyOn(RelayService.getInstance(), 'requestSettingsUpdate').mockImplementation(() => undefined)` in the `beforeEach`. Files to inspect:

- `packages/pinflow-overlay/src/core/overlay-store.persistence.spec.ts` (added in C.1.13)
- Any other `overlay-store.*.spec.ts` that exercises a user-setter

- [ ] Run: `corepack pnpm exec nx test pinflow-overlay`
- [ ] If a previously-green test now fails because of an unstubbed `RelayService`, add the spy in its `beforeEach`. Do not change behavior — just stub the side effect.
- [ ] Expected: full overlay test suite green.

### Step 5.4: Lint + typecheck

- [ ] Run: `corepack pnpm exec nx run-many --target=lint --target=typecheck --projects=pinflow-overlay`
- [ ] Expected: PASS.

### Step 5.5: Commit

```bash
git add packages/pinflow-overlay/src/core/overlay-store.ts \
        packages/pinflow-overlay/src/core/overlay-store.sync.spec.ts \
        packages/pinflow-overlay/src/core/overlay-store.persistence.spec.ts

git commit -m "feat(overlay): C.1.14 Task 5 — user-vs-sync setter split

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Final integration: full quality gate + VSIX

### Step F.1: Repo-wide quality gate

- [ ] Run: `corepack pnpm exec nx run-many --target=lint --target=typecheck --target=test --projects=pinflow-core,pinflow-relay,pinflow-vscode,pinflow-overlay`
- [ ] Expected: all green across all four packages.

### Step F.2: Build VSIX (combined C.1.13 + C.1.14)

- [ ] Run: `cd packages/pinflow-vscode && corepack pnpm package:vsix`
- [ ] Expected: VSIX written to `tmp/pinflow-vscode.vsix`.

### Step F.3: Push + PR

- [ ] Run:

```bash
git push -u origin feature/c114-bidirectional-settings-sync
gh pr create --title "feat: C.1.14 bidirectional overlay-settings sync" --body "$(cat <<'EOF'
## Summary

Bidirektionaler Sync von Overlay-Userpräferenzen (theme, pickerMode, commentEntryMode) zwischen VS Code Settings, dem Workspace-File `.pinflow/overlay-settings.json` und der Browser-Overlay.

Drei Layer (VS Code Extension, Relay, Overlay) lesen/schreiben/watchen das File. Loop-Schutz über die "only-act-on-actual-changes"-Regel pro Layer. Cross-Tab-Sync via WebSocket-Broadcast, Seed-on-Connect via HTTP `GET /api/overlay-settings`.

Spec: docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c114-bidirectional-settings-sync-design.md
Plan: docs/superpowers/plans/2026-05-06-pinflow-vscode-package-4c114-bidirectional-settings-sync-implementation.md

## Test plan

- [x] pinflow-core: schema + serializer tests grün
- [x] pinflow-relay: overlay-settings-service tests grün (file watcher, dedup, applyUpdate)
- [x] pinflow-vscode: overlay-settings-bridge tests grün (config↔file, only-act-on-changes)
- [x] pinflow-overlay: relay-service WS + HTTP-seed tests grün; store user/sync setter split tests grün
- [x] Lint + typecheck repo-weit clean
- [ ] Smoke: dark mode in VS Code Settings setzen → frischer Browser-Tab lädt mit dark
- [ ] Smoke: theme-toggle im Overlay → VS Code Setting flippt + zweiter Tab flippt mit
- [ ] Smoke: 1-Minute Idle → kein Log-Spam, file-mtime unverändert

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step F.4: Merge

- [ ] Run (only after CI green):

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only
```

---

## Acceptance recap (from spec)

After all five tasks land, the following must hold:

1. Setting `pinflow.overlay.theme = 'dark'` in VS Code → fresh browser tab loads dark.
2. Toggling theme in overlay → VS Code Setting flips within ~500 ms; other open tabs flip within ~500 ms.
3. 1-minute idle → no log spam, no oscillation, file mtime unchanged.
4. Manual deletion of `.pinflow/overlay-settings.json` → next overlay change recreates it from current VS Code Settings.
5. Multi-folder workspace → each folder has independent settings; no cross-talk.
