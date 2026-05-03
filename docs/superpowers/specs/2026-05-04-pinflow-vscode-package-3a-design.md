# PinFlow VS Code Extension — Package 3A: Onboarding & Active Bootstrap

## Goal

Close the user-experience gap between "PinFlow extension installed" and "first run completed" by adding active onboarding affordances, sidecar dev-server detection, a clickable Preview row in Status, a one-time First-Run celebration toast, and visible Workspace-folder transparency. The user should never wonder "what do I do now?" or "which folder is PinFlow tracking?"

This builds on Package 2 (Activity-Bar container with three Views) and Package 2.5 (5 user-settings + Settings toolbar button), both already shipped on the same branch.

## Why Now

Smoke-test feedback after Package 2.5 surfaced concrete missing affordances:

- When PinFlow is not configured, the Status view shows `Relay missing` with no path forward. The user is expected to know `pinflow init` exists.
- When `pinflow dev` runs and Vite serves a localhost URL, nothing in the sidebar offers to open it. The URL is buried in the Dev terminal output.
- After `pinflow dev` succeeds and a run completes, no celebration moment confirms "this works." The first-time user sees data appear in the tree without context.
- In a multi-root workspace, PinFlow silently picks the "best" folder via `getBestPinFlowWorkspaceStatus` and shows only `Workspace: Demo Fixture` (or similar). The user has no signal which of their open folders is being tracked.

3A directly addresses these four. It is the smallest scope that turns PinFlow from "observer of advanced workflow" into "tool with a discoverable beginner journey."

## Non-Goals

- No Webview rendering — that is Package 3B.
- No embedded live preview / iframe — that is Package 3C.
- No multi-folder simultaneous tracking with folder-switcher dropdown — Package 4+.
- No port-probing or Vite-output regex parsing — explicitly rejected during brainstorming in favor of the sidecar-lockfile contract.
- No telemetry, no Marketplace publish, no fix for the no-`pinflow`-CLI-in-PATH case beyond a textual hint in the welcome content.
- No lifecycle animations / "Starting…" pills (will come naturally with 3B's Webview).

## UI Structure

### Welcome State (replaces views when not configured)

Two mutually-exclusive `viewsWelcome` blocks contributed in `package.json`:

**Variant A — Workspace folder open but no PinFlow setup** (most common case):

`when: workbenchState != empty && pinflow.notConfigured`

Markdown content:

```
PinFlow ist in diesem Workspace nicht eingerichtet.

[$(rocket) PinFlow einrichten](command:pinflow.runInit)

[$(book) Dokumentation öffnen](command:pinflow.openDocumentation)

Voraussetzung: PinFlow CLI verfügbar (lokal in deinem Projekt oder global installiert).
```

**Variant B — No workspace folder open at all**:

`when: workbenchState == empty`

Markdown content:

```
PinFlow braucht einen geöffneten Ordner.

[$(folder-opened) Ordner öffnen](command:vscode.openFolder)
```

Both variants are contributed only on `pinflow.status` (the top view in the container, where the user's eyes land first). `pinflow.runs` and `pinflow.actions` show their normal empty state when not configured — the missing welcome there reduces visual redundancy.

The `pinflow.notConfigured` context key is set every refresh tick:

```ts
void vscode.commands.executeCommand(
  'setContext',
  'pinflow.notConfigured',
  workspaceStatus?.status === 'not-configured',
);
```

The `workbenchState` context is built into VS Code (no manual maintenance).

### Status View — new "Preview" row

A 4th status item appears between `Workspace` and the conditional `External Claim`:

| State | Description | Icon | Color | Click |
|---|---|---|---|---|
| Dev server detected | `host:port` (e.g. `localhost:5173`) | `circle-filled` | `charts.green` | Opens URL via `vscode.env.openExternal` |
| No dev server | `not running` | `circle-outline` | (default) | Inert; tooltip explains |

Tooltip when running: the full URL (`http://localhost:5173/`).
Tooltip when not running: `No dev server detected. Start with PinFlow: Start Workflow.`

### Status View — Workspace row transparency improvements

Description stays clean — just the folder name (e.g. `my-vite-app` or `Demo Fixture` for the monorepo demo case).

Tooltip is enriched: shows the full `appRoot` plus a multi-folder hint when applicable:

```
/home/domi/projects/my-vite-app
1 of 3 workspace folders
```

Two new inputs flow into `buildWorkspaceItem`: the count of currently-open `vscode.workspace.workspaceFolders` (for the "of N" line) and the active folder index (resolved from the picked workspace path).

### First-Run Toast

Triggered exactly once per workspace, the first time PinFlow's poll detects a run with `summary.status === 'processed'`:

```
Erster PinFlow-Run abgeschlossen: ann_abc123

[Run öffnen]   [OK]
```

`Run öffnen` opens the run's `prompt.md` in the editor. `OK` dismisses.

Persistence via `context.globalState` keyed by `pinflow.firstRunSeen.<workspaceRoot>`. After firing, the key is set to `true` permanently. No suppression logic is needed beyond the globalState check — even on the very first refresh after activation, if globalState says "never seen," the toast fires.

Failed-run notifications (Package 2.5) and the first-run celebration are independent: a failed run never triggers the celebration, and the first failure does not consume the celebration slot. Only a `processed` run can mark the celebration as seen.

## Architecture

### File-level changes

```
packages/pinflow-vscode/
├── package.json                                         # MOD — viewsWelcome, new commands, new setting, new activationEvents
└── src/
    ├── extension.ts                                     # MOD — Welcome trigger, sidecar polling, first-run toast, 3 new commands
    ├── extension-manifest.spec.ts                       # MOD — assert viewsWelcome, new commands, new setting
    └── core/
        ├── workspace.ts                                 # MOD — readRunningDevServer, preferredFolder override, folder-index resolution
        ├── workspace.spec.ts                            # MOD — new tests for dev-lock reader and preferredFolder
        └── views/
            ├── status-view-model.ts                     # MOD — 'preview' StatusItemId, optional command field, folder-count input
            └── status-view-model.spec.ts                # MOD — tests for preview row variants and workspace count

packages/pinflow-relay/
└── src/cli/...                                          # MOD — 'dev' command writes/cleans up .pinflow/dev.lock
                                                        #     (exact file location and integration point determined during plan-writing)
```

The pinflow-relay change is a small CLI extension (estimated 30–50 lines plus a test). The exact module to touch is determined at plan-writing time after reading the existing `dev` command structure.

### Sidecar lockfile contract

**File path:** `<workspaceRoot>/.pinflow/dev.lock`

**Format** (identical shape to `relay.lock` for consistency):

```json
{
  "host": "localhost",
  "port": 5173,
  "url": "http://localhost:5173",
  "pid": 12345
}
```

**Lifecycle:**

1. **Write at start.** When `pinflow dev` knows the dev-server URL, it writes the file atomically (temp + rename).
2. **Delete on graceful exit.** Trap `SIGINT` / `SIGTERM` and remove the file before exit.
3. **Stale on crash.** Extension performs a PID liveness check via `process.kill(pid, 0)`. If the PID is dead, the file is treated as absent.

**Open question deferred to plan-writing phase:** how `pinflow dev` learns the URL. Three plausible paths the implementation plan will choose between after reading the relay-CLI code:

- If `pinflow dev` already spawns the dev-server as a subprocess: capture its stdout once at startup to extract the URL.
- If `pinflow dev` is relay-only and the user runs Vite separately: accept a CLI flag like `--preview-url <url>` or read it from `pinflow.config.*`.
- A combination of the above.

The contract above is the same regardless of which path is implemented, so the extension side is unblocked.

### Module contracts (extension side)

**`workspace.ts` — extended `PinFlowWorkspaceResult`:**

```ts
export interface PinFlowWorkspaceResult {
  // ... existing fields
  readonly devServer?: {
    readonly host: string;
    readonly port: number;
    readonly url: string;
    readonly pid: number;
  };
  readonly workspaceFolderCount: number;
  readonly activeFolderIndex: number;
}
```

`workspaceFolderCount` is `vscode.workspace.workspaceFolders?.length ?? 0` (passed in from the extension layer; not derived inside `workspace.ts` because that file is platform-free).

`activeFolderIndex` is the 0-based index in the original workspaceFolders array of the folder that was picked.

**New private function in `workspace.ts`:**

```ts
function readRunningDevServer(
  workspaceRoot: string,
  processProbe: ProcessProbe = defaultProcessProbe,
): PinFlowWorkspaceResult['devServer'] | undefined;
```

Same shape as the existing `readRunningRelay`. Reads `.pinflow/dev.lock`, validates JSON, validates PID with `processProbe`, returns the parsed structure or `undefined`.

**`getBestPinFlowWorkspaceStatus` extended with `preferredFolder` override:**

```ts
export interface PinFlowWorkspaceOptions {
  readonly processProbe?: ProcessProbe;
  readonly preferredFolder?: string;  // NEW — absolute or relative path
  readonly workspaceFolderCount?: number;  // NEW — from VS Code
}
```

When `preferredFolder` is set:
1. Resolve the path. If relative, try resolving against each open workspace folder until one matches.
2. Get the status of that resolved folder.
3. If found and configured: return that status (skipping the auto-priority).
4. If not found or not configured: fall back to existing auto-priority. (No warning toast — the visible `Workspace` row will show the actual active folder, which is sufficient signal.)

**`status-view-model.ts` — `StatusItemId` extension:**

```ts
export type StatusItemId =
  | 'relay'
  | 'runner'
  | 'workspace'
  | 'preview'
  | 'externalClaim';

export interface StatusViewItem {
  // ... existing fields
  readonly command?: {
    readonly command: string;
    readonly arguments?: readonly unknown[];
  };
}
```

**New `buildPreviewItem` helper:**

```ts
function buildPreviewItem(
  devServer: PinFlowWorkspaceResult['devServer'],
): StatusViewItem;
```

Returns a "running" or "not running" variant per the table in the UI Structure section.

**`buildWorkspaceItem` enrichment:**

Receives the existing `PinFlowWorkspaceResult` plus already has access to `workspaceFolderCount` and `activeFolderIndex` via the extended status object. Builds the multi-line tooltip when count > 1.

**`buildStatusViewItems` updated order:**

```
[Relay, Runner, Workspace, Preview, (ExternalClaim?)]
```

### Provider changes (`extension.ts`)

`StatusTreeDataProvider.getTreeItem` now reads `element.command` and sets `item.command` accordingly when present. Default behavior (no command) remains: row is inert.

### New commands

| Command | Behavior |
|---|---|
| `pinflow.runInit` | Open a terminal at the active workspace folder, run `pinflow init` (resolved via `formatPinFlowCliCommand`). |
| `pinflow.openDocumentation` | `vscode.env.openExternal('https://github.com/Dom-303/pinflow#readme')`. |
| `pinflow.openPreview` | Receives a URL string argument; opens it via `vscode.env.openExternal`. |

All three are also visible in the Command Palette (default), useful for power users.

### New setting

```jsonc
"pinflow.workspace.preferredFolder": {
  "type": "string",
  "default": "",
  "description": "Absolute or relative path to the workspace folder PinFlow should track. Leave empty to use auto-detection (the first folder with a running relay, then the first configured folder, then the first folder)."
}
```

This brings the Package 2.5 settings count from 5 to 6.

### `refreshAll` additions

Inside the existing `refreshAll`:

1. **Pass `preferredFolder` and folder count** into `getBestPinFlowWorkspaceStatus`:

   ```ts
   const config = vscode.workspace.getConfiguration('pinflow');
   const preferredFolder = config.get<string>('workspace.preferredFolder', '');
   const workspaceStatus = getBestPinFlowWorkspaceStatus(workspaceFolders, {
     preferredFolder: preferredFolder || undefined,
     workspaceFolderCount: workspaceFolders.length,
   });
   ```

2. **Set the welcome context:**

   ```ts
   void vscode.commands.executeCommand(
     'setContext',
     'pinflow.notConfigured',
     workspaceStatus?.status === 'not-configured',
   );
   ```

3. **First-run toast detection** (after the Failed-Run notification block, sharing the same `runEvidence` array):

   ```ts
   const newestProcessed = runEvidence.find(
     (run) => run.summary.status === 'processed',
   );
   if (newestProcessed && workspaceStatus?.workspaceRoot) {
     const key = `pinflow.firstRunSeen.${workspaceStatus.workspaceRoot}`;
     const seen = context.globalState.get<boolean>(key, false);
     if (!seen) {
       void showFirstRunToast(newestProcessed);
       void context.globalState.update(key, true);
     }
   }
   ```

   `showFirstRunToast` is a small private helper that uses `vscode.window.showInformationMessage` with two buttons.

## Tests

### `workspace.spec.ts` — new tests

- `readRunningDevServer`: 4 cases — file absent, valid JSON with live PID, valid JSON with dead PID, malformed JSON.
- `preferredFolder` override: 3 cases — exact match, relative-path match, non-matching path falls back to auto-priority.

### `status-view-model.spec.ts` — new tests

- `buildPreviewItem` running: asserts `description === 'host:port'`, `themeIcon === 'circle-filled'`, `themeIconColor === 'charts.green'`, `command.command === 'pinflow.openPreview'`, `command.arguments[0] === url`.
- `buildPreviewItem` not running: asserts `description === 'not running'`, `themeIcon === 'circle-outline'`, no command field.
- `buildStatusViewItems` includes the preview row in position 4 (between Workspace and ExternalClaim).
- `buildWorkspaceItem` with `workspaceFolderCount > 1`: tooltip contains the multi-folder hint; description stays just the folder name.
- `buildWorkspaceItem` with `workspaceFolderCount === 1`: tooltip is just the path; no multi-folder hint.

### `extension-manifest.spec.ts` — new tests

- Asserts `contributes.viewsWelcome` exists with the two entries (workbenchState == empty / pinflow.notConfigured) on `pinflow.status`.
- Asserts the three new commands (`pinflow.runInit`, `pinflow.openDocumentation`, `pinflow.openPreview`) are in `contributes.commands`.
- Asserts the new setting `pinflow.workspace.preferredFolder` exists in `contributes.configuration.properties`, default `""`, type `string`.

### Not unit-tested (consistent with existing patterns)

- The Welcome trigger via `setContext` (provider-layer concern in `extension.ts`).
- The First-Run toast firing (interactive `showInformationMessage`, requires VS Code mock).
- The sidecar polling integration end-to-end.

These are covered in the manual smoke test below.

## Manual Smoke Test (final verification gate)

Run after the implementation plan completes:

1. Build the VSIX: `corepack pnpm --filter pinflow-vscode package:vsix`.
2. Install the VSIX in a VS Code window. Reload the window.
3. **No-folder welcome:** Open a fresh VS Code window with no folder. Click the PinFlow Activity-Bar icon. Confirm the "Ordner öffnen" welcome appears with a working "Open Folder" button.
4. **Init welcome:** Open a folder that has no `.pinflow/` and no `pinflow.config.*`. Confirm the "PinFlow einrichten" welcome appears. Click `Dokumentation öffnen` — confirm browser opens to GitHub README.
5. **Init flow:** Click `PinFlow einrichten`. A terminal opens running `pinflow init`. Walk through the prompts. After the directory `.pinflow/` is created, the welcome should disappear (within 3 s) and the normal Status / Runs / Actions views should appear.
6. **Preview row + sidecar:** Run `PinFlow: Start Workflow`. Once `pinflow dev` writes `.pinflow/dev.lock`, confirm the Status view's `Preview` row turns green with the host:port description. Click the row — browser opens to the URL.
7. **Preview cleanup:** Stop `pinflow dev` (Ctrl+C). Within 3 s the Preview row should turn back to grey "not running."
8. **Multi-folder transparency:** Open a multi-root workspace with two folders. Hover the Workspace row — confirm the tooltip shows "1 of 2 workspace folders" or similar.
9. **preferredFolder override:** Set the setting to one of the folder names; confirm the Workspace row updates within 3 s.
10. **First-run toast:** Trigger a successful run end-to-end. Confirm the celebration toast appears once. Close it. Trigger another run. Confirm the toast does NOT appear again. Open settings or globalState and verify `pinflow.firstRunSeen.<workspaceRoot>` is `true`.

## Risks (closed or accepted)

- **`pinflow init` not in PATH** — handled by the welcome content's "Voraussetzung"-line setting expectations. No automatic install.
- **Multiple `pinflow dev` instances overwriting `dev.lock`** — last writer wins; PID check on read handles staleness. Acceptable for development workflow.
- **PinFlow-relay CLI changes are out-of-package for the extension** — coordinated within the same monorepo via `build:all`. No release coupling because `pinflow-vscode` only reads the contract; it doesn't import pinflow-relay code.
- **`workbenchState == empty` welcome only works because viewsWelcome contributions render even before the extension is activated by view.show.** Verified during plan-writing — VS Code evaluates `viewsWelcome` against the view declaration, not against extension activation state.

## Verification Gates

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx test pinflow-relay     # if CLI changes land here
corepack pnpm nx build pinflow-vscode
corepack pnpm nx build pinflow-relay    # if CLI changes land here
corepack pnpm nx lint pinflow-vscode
corepack pnpm nx lint pinflow-relay
git -C /home/domi/eventbaer/dev/pinflow diff --check
```

All gates green before manual smoke test. Manual smoke test is the final gate before considering 3A complete. No `git push`, no merge to `main`, no Marketplace publish without explicit user approval.

## Out of Scope (parked)

- **Package 3B** — Webview-based dashboard with run cards, live log streaming, lifecycle pills.
- **Package 3C** — Embedded live preview iframe with click-to-code.
- **Package 4+** — Multi-folder simultaneous tracking with explicit folder switcher in the sidebar header.
- **Better `pinflow init` UX** — automatic CLI install detection, interactive QuickPick for framework selection, progress reporting during init.
- **Telemetry / analytics on welcome conversion.**
- **Marketplace publish.**
