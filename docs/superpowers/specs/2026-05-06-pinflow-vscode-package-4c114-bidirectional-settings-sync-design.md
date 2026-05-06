# PinFlow VSCode Phase C.1.14 — Bidirectional Overlay Settings Sync

**Status:** approved (2026-05-06)
**Predecessor:** [C.1.13 UI state persistence + install stability](2026-05-06-pinflow-vscode-package-4c113-ui-state-persistence-and-stability-design.md)

## Why

C.1.13 makes the overlay's UI state (mode, active tab) survive a browser refresh by persisting it in the browser's localStorage. That covers the "F5 wiped my workspace" case for purely-local UI state.

The user wants a **stronger contract** for genuine user preferences (theme, picker mode, comment entry mode):

- They want to set "dark mode" once, in **VS Code Settings**, and have it apply everywhere — including new browser tabs they open later, including new Localhost URLs they spin up.
- And they want changes made in the overlay (e.g. clicking the theme toggle in the overlay UI) to **propagate back** to VS Code Settings so the preference becomes the new global default.

This is a **bidirectional sync** between VS Code Extension Settings and the overlay's localStorage. It's a real architecture-level change, not a one-line tweak — that's why it gets its own phase rather than riding along with C.1.13.

## Scope

Three settings get bidirectional sync:

- `pinflow.overlay.theme`: `'light' | 'dark'` (matches the overlay's existing `OverlayTheme` exactly).
- `pinflow.overlay.pickerMode`: `'element' | 'region' | 'multi'` (matches the overlay's `PickerMode`).
- `pinflow.overlay.commentEntryMode`: `'workspace' | 'inline'` (matches the overlay's `CommentEntryMode`).

These are the three settings the overlay already persists per-tab in localStorage; they are also the three that make most sense as global preferences. Adding more later (e.g. dispatch defaults, tab offset) follows the same pattern.

## Non-goals

- A `'system'` theme option in VS Code Settings. The overlay's theme type is `'light' | 'dark'` only — adding `'system'` would require resolving system theme dynamically in the overlay (matchMedia, listener, edge cases on iframes). Keep parity with the overlay's existing types.
- Syncing transient UI state (mode, activeTab) — that's localStorage-only per C.1.13. They are not user preferences.
- Multi-workspace settings reconciliation. We sync at workspace-folder level. Multiple workspace folders = multiple `.pinflow/overlay-settings.json` files, each with its own scope.
- VS Code Settings Sync (the cloud feature) interaction — that just works because we only use standard VS Code Configuration APIs.

## Architecture

### Source of truth

There is **one canonical store**: a JSON file at `${workspaceRoot}/.pinflow/overlay-settings.json`. All three layers (VS Code Extension, Relay, Overlay) treat it as the truth. Each layer has a way to read it and a way to write it. Changes propagate by file modification → file watcher events → consumers.

Why a file rather than putting VS Code Settings as the truth and broadcasting from there?

- The relay already has filesystem access to `.pinflow/`; the WS broadcast pipeline is the simplest reuse of an existing channel.
- The file is human-readable and survives a VS Code restart cleanly.
- A file watcher provides natural deduplication (no infinite loops if the file content didn't change).
- The file is committable to git if the user wants their team to share it (we add it to `.gitignore` by default but the user can remove that line).

### Layer responsibilities

```
   ┌───────────────────────┐    write       ┌───────────────────────────┐
   │  VS Code Extension    │ ────────────▶  │ .pinflow/overlay-settings │
   │  - reads VS Code cfg  │                │       .json (file)        │
   │  - watches cfg        │ ◀────────────  │                           │
   │  - watches file       │     read       └───────────────────────────┘
   │  - writes VS Code cfg │                  ▲                       │
   └───────────────────────┘                  │write                  │read+watch
                                              │                       ▼
   ┌───────────────────────┐    write    ┌──────────────────────────────────┐
   │  Browser Overlay      │ ──WS req──▶ │              Relay               │
   │  - localStorage       │             │  - watches file                  │
   │  - reads from WS      │ ◀──WS evt── │  - broadcasts on change          │
   │  - sends on user chg  │             │  - writes file on WS req         │
   └───────────────────────┘             └──────────────────────────────────┘
```

VS Code Extension handles two flows:
- **VS Code Settings change → file**: `vscode.workspace.onDidChangeConfiguration` fires for `pinflow.overlay.*` keys → extension reads the new values + writes the file.
- **File change → VS Code Settings**: a `vscode.workspace.createFileSystemWatcher('**/.pinflow/overlay-settings.json')` fires → extension reads the file + writes back to VS Code Settings (only the values that actually differ from current cfg, to avoid spurious change events).

Relay handles two flows:
- **File change → WS broadcast**: a chokidar (or fs.watch) watcher on the same file fires → relay reads it + broadcasts `OVERLAY_SETTINGS_UPDATED` to all WS clients.
- **WS message → file write**: an incoming `OVERLAY_SETTINGS_REQUEST` from a browser tab → relay validates (Zod schema) + writes the file. The file watcher's own debounce/dedupe prevents the relay from re-broadcasting its own write back to itself in a tight loop (it still broadcasts so other tabs hear it — but the originating tab also receives the broadcast, which is fine: the value matches what it sent).

Overlay handles two flows:
- **Init**: HTTP `GET /api/overlay-settings` once on connect to seed local state. (Pure HTTP avoids any chicken-and-egg between WS connect and first broadcast.) Falls back to localStorage if the request fails — the overlay still works offline.
- **WS broadcast received**: store update + localStorage write. **Suppresses the change-event-back-to-relay** in this case (the value is what the relay just told us; sending it back would be a loop). Detection is by comparing: if the incoming WS value equals our current state value, do nothing; if it differs, apply but don't echo.
- **User change in overlay UI**: the overlay's existing `setTheme/setPickerMode/setCommentEntryMode` methods now also send a WS `OVERLAY_SETTINGS_REQUEST`. The local state + localStorage update happens immediately (optimistic); the relay's broadcast is a confirmation.

### Loop prevention

Every layer follows the **"only act on actual changes"** rule:

1. VS Code Extension's `onDidChangeConfiguration` writes the file only if the file's content would actually change after the write. We compute a JSON-stable representation and compare to the current file before writing.
2. VS Code Extension's file watcher writes back to VS Code Settings only for the keys whose value actually differs from the current `vscode.workspace.getConfiguration().get()` result.
3. Relay's file watcher broadcasts only if the parsed file content differs from the last broadcast payload.
4. Overlay's WS receiver applies only if the incoming value differs from the current state.
5. Overlay's user-change sender sends only on real user action (not on WS-driven state updates — those go through a different setter path that doesn't trigger the WS send).

These five guards — combined with a stable JSON serializer for the file — keep the system from oscillating.

### Schema

`packages/pinflow-core/src/lib/schemas/overlay-settings.schema.ts` (new):

```typescript
export const OverlaySettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  pickerMode: z.enum(['element', 'region', 'multi']).default('element'),
  commentEntryMode: z.enum(['workspace', 'inline']).default('workspace'),
});

export type OverlaySettings = z.infer<typeof OverlaySettingsSchema>;
```

This schema is reused everywhere: VS Code reads/writes against it; relay validates incoming WS messages; overlay validates broadcasts.

### File format

```json
{
  "$schema": "https://pinflow.dev/schemas/overlay-settings.json",
  "theme": "dark",
  "pickerMode": "element",
  "commentEntryMode": "workspace"
}
```

Pretty-printed with 2-space indent. The `$schema` field is metadata only and not validated by the schema. We may host the JSON Schema for editor IntelliSense later.

### WS events

Add to `WS_EVENTS` in `packages/pinflow-core/src/lib/constants/index.ts`:

```typescript
OVERLAY_SETTINGS_UPDATED: 'overlay:settings:updated',  // server → all clients
OVERLAY_SETTINGS_REQUEST: 'overlay:settings:request',  // any client → server
```

`OVERLAY_SETTINGS_UPDATED.data` = `OverlaySettings` (full object, no diffs — simpler).
`OVERLAY_SETTINGS_REQUEST.data` = `Partial<OverlaySettings>` (overlay only sends what changed).

### HTTP endpoint

Add to relay HTTP server:

- `GET /api/overlay-settings` → reads file, returns parsed `OverlaySettings`. If file doesn't exist, returns `OverlaySettingsSchema.parse({})` (the default object).

(No PUT endpoint — write happens via WS to keep one channel for state mutations. Reads are HTTP for the seed-on-connect path.)

### File location

`${workspaceRoot}/.pinflow/overlay-settings.json`. The `.pinflow/` directory already exists for runtime artifacts (manifest, runs, evidence) per existing convention. Create the directory on first write if missing.

The VS Code Extension's wizard (C.1.9) added `.pinflow/` to `.gitignore` — that means the settings file is gitignored by default. **This is the right default**: settings are per-developer preferences, not project config. A user who wants to commit their team's defaults can remove the `.pinflow/` line from `.gitignore` themselves.

## Components

| Path | Change |
|---|---|
| `packages/pinflow-core/src/lib/schemas/overlay-settings.schema.ts` | **NEW** — Zod schema + type |
| `packages/pinflow-core/src/lib/schemas/index.ts` | Re-export the new schema |
| `packages/pinflow-core/src/lib/constants/index.ts` | Add `OVERLAY_SETTINGS_UPDATED` + `OVERLAY_SETTINGS_REQUEST` to `WS_EVENTS` |
| `packages/pinflow-relay/src/services/overlay-settings-service.ts` | **NEW** — file read/write/watch + dedup |
| `packages/pinflow-relay/src/services/overlay-settings-service.spec.ts` | **NEW** |
| `packages/pinflow-relay/src/server/ws-server.ts` | Subscribe to file changes → broadcast; handle incoming WS request → write file |
| `packages/pinflow-relay/src/server/http-server.ts` | Register `GET /api/overlay-settings` route |
| `packages/pinflow-vscode/package.json` | Declare `pinflow.overlay.theme`, `pinflow.overlay.pickerMode`, `pinflow.overlay.commentEntryMode` configuration entries |
| `packages/pinflow-vscode/src/core/overlay-settings-bridge.ts` | **NEW** — VS Code ↔ file synchronizer (config watcher + file watcher + dedupe) |
| `packages/pinflow-vscode/src/core/overlay-settings-bridge.spec.ts` | **NEW** |
| `packages/pinflow-vscode/src/extension.ts` | Activate the bridge per workspace folder |
| `packages/pinflow-overlay/src/services/relay-service.ts` | Subscribe to `OVERLAY_SETTINGS_UPDATED`; expose `requestSettingsUpdate(partial)` for outbound |
| `packages/pinflow-overlay/src/services/relay-service.spec.ts` | New tests for the WS message handlers |
| `packages/pinflow-overlay/src/core/overlay-store.ts` | Differentiate user-driven setters from sync-driven setters; sync-driven do not echo back |

## Acceptance

- Set `pinflow.overlay.theme` to `'dark'` in VS Code Settings. Open a fresh browser tab pointing at the workspace's localhost. The overlay loads with the dark theme without any further interaction.
- In the overlay UI, click the theme toggle to switch to light. The change is immediately visible in the overlay. Within 500 ms, `pinflow.overlay.theme` in VS Code Settings is updated to `'light'`. A different browser tab open on the same workspace also flips to light within 500 ms (the second tab is reading the WS broadcast).
- Idempotency: making no changes for a minute — no log spam, no cycle, file mtime unchanged.
- File deletion: while the system is running, manually delete `.pinflow/overlay-settings.json`. The next overlay change re-creates it cleanly, with current values from VS Code Settings as the seed.
- Workspace switch (multi-folder workspace): switching active folder picks up that folder's `.pinflow/overlay-settings.json`. Each folder has independent settings.

## Risks and mitigations

- **Three-way race condition** (VS Code, relay, overlay all change the same key in the same 100 ms window): last-write-wins via file mtime; the system converges. The user perceives a brief flicker if very unlucky, but no permanent inconsistency.
- **Large workspace fs watcher overhead**: one watcher per layer per workspace folder. Three layers × N folders = 3N watchers. For typical N ≤ 3 this is negligible. The watch path is precise (the single settings file), not a glob.
- **WS reconnect during a change**: the overlay reseeds via HTTP on reconnect, which is the file's current truth — no message loss. The overlay's localStorage acts as a fallback if the relay is offline.
- **VS Code Settings vs Workspace settings vs Folder settings**: writes target `ConfigurationTarget.Workspace` (the multi-root-aware default for our case). Reads use the standard cascade (folder → workspace → user → default). Documented in code.
- **Relay running outside VS Code**: if the user runs the relay manually (not through the extension), file changes still propagate to overlays — they just don't sync to VS Code Settings (because no VS Code listener is alive). Acceptable degradation.

## Out of scope (deferred)

- Sync of dispatch defaults, tab offset, sidebar width — same pattern can extend, but each adds a sync key and a UI surface. Land the three above first; add others on demand.
- Settings UI in the extension (custom webview to edit). The native VS Code Settings UI handles all three settings via the `package.json` `configuration` declarations — no custom UI needed for this phase.
- Conflict resolution UI ("VS Code says X, overlay says Y, pick one"). Last-write-wins is correct enough; a UI would be a feature creep.
- A `'system'` theme value. Stays out for parity with the overlay's `OverlayTheme` enum.
