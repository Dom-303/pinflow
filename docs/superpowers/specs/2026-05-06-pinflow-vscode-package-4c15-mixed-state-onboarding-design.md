# PinFlow VS Code Extension — Package 4 Phase C.1.5: Mixed-State Workspace Onboarding

## Goal

Close the multi-folder onboarding gap surfaced when smoking C.1 in a real-world workspace: user opens VS Code with 4 repositories, only one of which has `.pinflow/`. Today the extension silently shows that single configured folder and provides no path to set up the other three. After C.1.5 the user sees **all** workspace folders in the Status sidebar — configured ones with the existing folder-grouped accordion, unconfigured ones with a single "Setup PinFlow" action that runs `pinflow init` for that exact folder.

## Why Now

C.1 delivered multi-folder simultaneous tracking but explicitly filtered non-configured folders out of every view (`expandToCandidateFolders`, design-spec line 77). That was correct for the simultaneous-tracking story; it's wrong for the onboarding story. Two concrete failure modes:

1. **Welcome blindness.** The `pinflow.notConfigured` context becomes `false` as soon as ≥1 folder is configured, so the rocket-button welcome card never appears for the other folders. They are invisible from PinFlow's perspective.
2. **Init is folder-blind.** `pinflow.runInit` always opens its terminal in `folders[0]`. The user cannot choose which folder to initialize; if `folders[0]` is already configured, init lands in the wrong place.

C.1.5 fixes both, completes Phase C.1's smoke-test prerequisites, and restores the Phase A onboarding promise ("user with 5 repos can configure them all from the sidebar") for the multi-root case it never explicitly covered.

## Non-Goals (parked)

- **Bulk-init across all unconfigured folders in one click.** Phase E polish if needed.
- **Auto-detection of "PinFlow-able" projects.** Every workspace folder is a candidate; non-configured = "set up here?", not "this folder probably wants PinFlow".
- **Walkthrough re-design.** The existing 4-step walkthrough stays; only its `pinflow.runInit` step now respects the folder argument when triggered from the sidebar.
- **Status-bar item changes.** Stays anchored on the active folder.
- **Phase B/C.2/C.3/D/E features.** Untouched.
- **Recursive scanning of huge monorepos for unconfigured sub-folders.** We only show top-level VS Code workspace folders as unconfigured rows — nested sub-folders are only shown when they are themselves configured (matches C.1 behavior for configured nested folders).

## Architectural Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Where to display unconfigured folders | **Status, Actions, and Runs views all show one accordion section per unconfigured top-level workspace folder** | Consistent with C.1 multi-folder presentation. User sees all folders side by side, configured and not. |
| Children of an unconfigured Status-section | **Single leaf "Setup PinFlow"** with rocket icon, runs `pinflow.runInit` with `folderPath` argument | Mirrors the existing `viewsWelcome` rocket affordance. No empty-section silence. |
| Children of an unconfigured Actions-section | **Single leaf "Setup PinFlow"** (same command) | Same pattern; replaces the four normal actions which would all fail without `.pinflow/`. |
| Runs-webview unconfigured section | **Folder-section header with empty-state "Run `pinflow init` to start tracking" copy and a "Setup" button posting `pinflow.runInit` via existing message channel** | Matches the empty-state style of the existing `<pinflow-folder-section>` component for configured-but-no-runs. |
| `pinflow.runInit` folder argument | **Optional first argument `folderPath: string`** — falls back to the active folder, then `folders[0]` | Backward-compatible (Command-Palette invocation still works). New sidebar buttons pass the folder explicitly. |
| Discovery scope for unconfigured rows | **Top-level VS Code workspace folders only** (no recursive scan for unconfigured) | Prevents 100s of noisy rows in monorepos. Configured nested folders continue to surface via `getWorkspaceCandidateFolders` exactly as in C.1. |
| Welcome-card behavior | **Unchanged.** It only fires when zero folders are configured. With ≥1 configured folder, the per-folder accordion now carries the onboarding affordance. | Avoids redundancy. The accordion is the canonical onboarding path once any folder is set up. |
| Folder-picker `pinflow.switchFolder` | **Unchanged.** Already lists all candidates including non-configured (Phase A). Picking a non-configured folder still sets it as `preferredFolder` — that's a no-op until `pinflow init` runs, but it's not destructive. | No regression, no new behavior needed. |

## Architecture

### File-level changes

```
packages/pinflow-vscode/
├── src/
│   ├── extension.ts                                              # MOD — runInit folder-aware, refreshAll uses new expander
│   ├── core/
│   │   ├── multi-folder-state.ts                                 # MOD — new expandToAllWorkspaceFolders + helper to mark unconfigured
│   │   ├── multi-folder-state.spec.ts                            # MOD — new tests for the all-folders expander
│   │   ├── folder-picker.ts                                      # NO CHANGE — already correct
│   │   └── views/
│   │       ├── status-view-model.ts                              # MOD — buildStatusFolderGroups returns "setup" group for not-configured
│   │       ├── status-view-model.spec.ts                         # MOD — new test cases
│   │       ├── actions-view-model.ts                             # MOD — buildActionFolderGroups returns "setup" group for not-configured
│   │       ├── actions-view-model.spec.ts                        # MOD — new test cases
│   │       ├── runs-webview-messages.ts                          # MOD — runs-update payload tags folder status
│   │       ├── runs-webview-messages.spec.ts                     # MOD — new fields covered
│   │       └── runs-webview-provider.ts                          # MOD — postRuns includes folderStatuses, init message added
│   └── runs-webview/
│       ├── pinflow-folder-section.ts                             # MOD — render setup state
│       ├── pinflow-folder-section.spec.ts                        # MOD — new test cases
│       └── pinflow-runs-app.ts                                   # MOD — wire setup-button → pinflow.runInit message
└── docs/superpowers/
    ├── specs/2026-05-06-pinflow-vscode-package-4c15-mixed-state-onboarding-design.md      # NEW (this file)
    └── plans/2026-05-06-pinflow-vscode-package-4c15-mixed-state-onboarding-implementation.md  # NEW
```

No new commands, no new settings, no new walkthrough. Zero new dependencies.

### `multi-folder-state.ts` — new helper

```ts
export interface PerFolderState {
  readonly folder: string;
  readonly status: PinFlowWorkspaceResult;
  readonly runs: readonly PinFlowRunEvidence[];
}

// EXISTING — keep as-is, used only where configured-only matters
export function expandToCandidateFolders(
  workspaceFolders: readonly string[],
): readonly string[];

// NEW — superset used for multi-folder views (Status, Actions, Runs)
export function expandToAllWorkspaceFolders(
  workspaceFolders: readonly string[],
): readonly string[];
```

Semantics of `expandToAllWorkspaceFolders`:

1. Start with all configured candidates (`expandToCandidateFolders`).
2. For each top-level workspace folder that has zero configured candidates underneath it, add the workspace folder itself as a candidate (so it surfaces with `status: 'not-configured'`).
3. Returns the union, deduped, in input order.

This means a workspace folder where a nested sub-folder is configured shows only the nested sub-folder (matching C.1). A workspace folder with no configured anywhere shows itself as unconfigured.

`buildPerFolderState` is unchanged — it already calls `getPinFlowWorkspaceStatus(folder)` which can return `not-configured`. The change is upstream (more folders flow in).

### `extension.ts` `refreshAll` change

```ts
// Before:
const candidates = expandToCandidateFolders(workspaceFolders);
if (candidates.length === 0) { /* show notConfigured welcome */ }

// After:
const candidates = expandToAllWorkspaceFolders(workspaceFolders);
const allUnconfigured = candidates.every((folder) => {
  const status = getPinFlowWorkspaceStatus(folder);
  return status.status === 'not-configured';
});
void vscode.commands.executeCommand(
  'setContext', 'pinflow.notConfigured', allUnconfigured,
);
if (candidates.length === 0) {
  // unchanged: empty workspace
}
```

The `pinflow.notConfigured` context becomes true ONLY when every candidate is unconfigured. With ≥1 configured, the context is false (welcome card hides), and the unconfigured ones surface as accordion sections instead.

`pickActiveFolder` is unchanged — it already prefers `ready` over other states. Active folder logic still picks a configured folder when one exists.

### `pinflow.runInit` folder-aware

```ts
vscode.commands.registerCommand(
  'pinflow.runInit',
  (folderPath?: unknown) => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      void vscode.window.showInformationMessage(
        'Open a workspace folder to run PinFlow init.',
      );
      return;
    }
    const cwd = resolveRunInitCwd(folderPath, folders);
    const terminal = vscode.window.createTerminal({ name: 'PinFlow Init', cwd });
    terminal.sendText(formatPinFlowCliCommand(cwd, ['init']));
    terminal.show();
  },
);

function resolveRunInitCwd(
  folderPath: unknown,
  workspaceFolders: readonly vscode.WorkspaceFolder[],
): string {
  if (typeof folderPath === 'string' && folderPath.trim()) {
    return folderPath;
  }
  const active = activeFolder; // module-level, set by refreshAll
  if (active) return active;
  return workspaceFolders[0].uri.fsPath;
}
```

The Command-Palette invocation passes no argument, so the active-folder fallback applies. Sidebar Setup-actions pass the folder explicitly.

### `status-view-model.ts` — `buildStatusFolderGroups` for unconfigured

```ts
const SETUP_ITEM: StatusViewItem = {
  id: 'setup',
  label: 'Setup PinFlow',
  description: 'run pinflow init',
  tooltip: 'Click to scaffold .pinflow/ in this folder',
  themeIcon: 'rocket',
  command: { command: 'pinflow.runInit', arguments: [/* folder injected per-group */] },
};

export function buildStatusFolderGroups(
  folders: readonly PerFolderState[],
  options: BuildStatusFolderGroupsOptions = {},
): readonly StatusFolderGroup[] {
  return folders.map((state) => {
    const isConfigured = state.status.status !== 'not-configured';
    const children = isConfigured
      ? buildStatusViewItems(state.status, options.externalClaim ?? null, state.runs[0] ?? null)
      : [{ ...SETUP_ITEM, command: { command: 'pinflow.runInit', arguments: [state.folder] } }];
    return {
      id: state.folder,
      displayName: path.basename(state.folder),
      runCount: state.runs.length,
      isActive: state.folder === options.activeFolder,
      children,
    };
  });
}
```

Folder-group display unchanged for configured folders. Unconfigured folders get a single Setup leaf. The `runCount` is always 0 for unconfigured (no `.pinflow/` to scan).

### `actions-view-model.ts` — `buildActionFolderGroups` for unconfigured

Same pattern: unconfigured folders get a single Setup-action child. Configured folders get the four normal actions (unchanged).

### Runs-webview — `pinflow-folder-section` setup state

Adds a third visual state alongside the existing "has runs" / "no runs yet":

- **Unconfigured:** folder header rendered with subdued styling, empty body shows `"Run pinflow init to start tracking this folder"` copy + a small "Setup PinFlow" button. Click posts `{ type: 'webview:run-init', folder }` which the provider forwards to `vscode.commands.executeCommand('pinflow.runInit', folder)`.

The webview-message protocol gains:

```ts
// webview → ext
| { readonly type: 'webview:run-init'; readonly folder: string }

// ext → webview (extension of existing runs-update)
type FolderStatus = 'configured' | 'not-configured';
{ readonly type: 'runs:update'; readonly runsByFolder: ...; readonly folderStatuses: Record<string, FolderStatus>; readonly activeFolder?: string }
```

`folderStatuses` is **required** in `runs:update` and `webview:init-ack`. This is a clean break (matches C.1's break of `runs` → `runsByFolder`); no compat shim. Both ends ship together in the same VSIX.

## Tests

### `multi-folder-state.spec.ts` — new tests

| Test | Expects |
|---|---|
| `expandToAllWorkspaceFolders` with 2 configured + 1 unconfigured roots | 3 entries, original order preserved |
| `expandToAllWorkspaceFolders` with all configured | identical result to `expandToCandidateFolders` |
| `expandToAllWorkspaceFolders` with all unconfigured | each workspace folder appears as itself |
| `expandToAllWorkspaceFolders` with workspace root having configured nested sub-folder | only the nested sub-folder appears, not the root |
| `expandToAllWorkspaceFolders` dedupes when same folder appears via multiple paths | single entry |

5 new tests.

### `status-view-model.spec.ts` — new tests

| Test | Expects |
|---|---|
| `buildStatusFolderGroups` with not-configured PerFolderState | one group, one child with id `setup`, command `pinflow.runInit` carrying the folder path |
| `buildStatusFolderGroups` mixed (1 ready + 1 not-configured) | configured group has full children, unconfigured has 1 setup child |
| Setup leaf description and themeIcon | `'run pinflow init'`, `'rocket'` |
| Unconfigured group `runCount` is `0` | runCount field is always 0 for not-configured states |

4 new tests.

### `actions-view-model.spec.ts` — new tests

| Test | Expects |
|---|---|
| `buildActionFolderGroups` with not-configured folder | one group, one Setup leaf |
| Setup leaf id matches `setup` and command is `pinflow.runInit` with folder argument | exact shape |
| Mixed state: configured folder gets 4 normal actions, unconfigured gets only Setup | both behaviors verified in single test |

3 new tests.

### `runs-webview-messages.spec.ts` — new tests

| Test | Expects |
|---|---|
| `isExtToWebviewMessage` accepts `runs:update` with `folderStatuses` field | passes |
| `isExtToWebviewMessage` rejects `runs:update` without `folderStatuses` | clean break |
| `isWebviewToExtMessage` accepts `webview:run-init` with `folder` field | passes |
| `isWebviewToExtMessage` rejects `webview:run-init` without `folder` | type-guard tight |
| Round-trip preserves `folderStatuses` map | structural equality |

5 new tests.

### `pinflow-folder-section.spec.ts` — new tests

| Test | Expects |
|---|---|
| Renders unconfigured folder with Setup button and empty-state copy | DOM snapshot |
| Click on Setup button dispatches a `setup-clicked` event with folder path | event payload exact |
| Configured folder with no runs still renders normal "no runs yet" empty-state (no regression) | unchanged |

3 new tests.

### `extension-manifest.spec.ts` — no changes needed

No new manifest contributions.

### Test count delta

- New tests: ~20 (multi-folder-state 5 + status-view-model 4 + actions-view-model 3 + runs-webview-messages 5 + folder-section 3)
- Tests touched: ~3 (existing message tests need `folderStatuses` added to fixtures)
- Net pinflow-vscode delta: ~+20 → ending around 165 tests (current 145 + 20).

## Risk Resolutions

| Risk | Resolution |
|---|---|
| User has 50 unconfigured Workspace-folders → noisy sidebar | Only top-level workspace folders surface as unconfigured, never nested sub-folders. Realistic workspace size (≤10 folders) is the assumed usage. |
| `pinflow init` fails for an unconfigured folder (e.g. no `package.json`) | Terminal shows the CLI error; the user reads it and acts. Same as today's Command-Palette flow — no new failure mode. |
| Unconfigured folder accordion expanded by default → too tall | `isActive` flag stays based on the configured-active-folder logic; unconfigured groups default to `Collapsed`. User opens them deliberately. |
| Race: user runs `pinflow init` in folder F → next refresh tick sees F as configured → status flips. UI flashes between Setup and full-accordion. | Refresh is 3s. The flip is visible but expected (user just initialized). The existing first-run-toast for F also fires correctly because `notifyFailedRunsForFolder` runs only on configured states — no false positive. |
| `pinflow.runInit` invoked from Command-Palette with no argument | Falls back to active folder, then `folders[0]`. Behavior identical to today for that invocation. |
| Setup-button posts `webview:run-init` for a folder no longer in the workspace | Provider checks the folder is still tracked; otherwise shows `Open a workspace folder first.` info message. |
| `folderStatuses` map missing when restoring webview from cache | The `webview:init-ack` is the source of truth on (re)connect; cached runs:update payloads are replaced on reconnect. No-op in practice. |
| Test-fixtures (Demo Fixture under pinflow-test-fixtures) now appears alongside user's real workspace roots | Already the case in C.1 (configured nested) — no change. |

## Manual Smoke Test (final verification gate for Phase C.1.5)

1. Build the VSIX: `corepack pnpm --filter pinflow-vscode run package:vsix` → `tmp/pinflow-vscode.vsix`.
2. Install in VS Code via "Extensions: Install from VSIX…". Reload.
3. **Mixed-state workspace, 4 folders, only 1 configured:**
   - Open multi-root workspace: `pinflow` (has nested test-fixture `.pinflow/`) + 3 plain repos.
   - Sidebar Status → 4 folder accordions, configured one expanded with normal status rows, unconfigured three collapsed with subdued styling.
   - Sidebar Actions → 4 folder accordions, configured has 4 actions, unconfigured each have 1 Setup row.
   - Runs webview → 4 folder sections, configured shows runs (or empty-state), unconfigured shows Setup empty-state.
4. **Setup from sidebar:**
   - Click Setup row in an unconfigured folder's Status section → terminal opens at THAT folder's path running `pinflow init`.
   - Walk through prompts. After `init` completes, refresh tick (≤3s) → folder flips from Setup to full-accordion with `Relay missing` etc.
5. **Setup from Actions:**
   - Click Setup leaf in a different unconfigured folder's Actions section → terminal opens at the correct folder.
6. **Setup from Runs webview:**
   - Click "Setup PinFlow" button in an unconfigured folder section → terminal opens at the correct folder.
7. **Command-Palette `PinFlow: Run Init` (no folder argument):**
   - Run from Command-Palette. Terminal opens in the active folder (configured one), or `folders[0]` if no active folder.
8. **All-unconfigured workspace:**
   - Open workspace where no folder has `.pinflow/`. Welcome card with rocket button still appears (unchanged Phase A behavior).
9. **All-configured workspace:**
   - Standard C.1 behavior: 2-3 configured accordion sections, no Setup rows. No regression.
10. **Multi-folder Start Workflow per folder:**
    - In two configured folders, click Start Workflow on each. Both terminals open, both runs tick parallel. C.1 functionality preserved.
11. **Walkthrough completion still tracked:**
    - Running `pinflow.runInit` (any folder) marks the walkthrough's "Initialize PinFlow" step as completed.
12. **No regression:**
    - Folder-picker (`pinflow.switchFolder`) still lists all folders with status icons.
    - `viewsWelcome` rocket card still appears for empty-workspace and all-unconfigured cases.
    - Phase A walkthrough still on first install.
    - C.1 multi-folder simultaneous tracking still works for ≥2 configured folders.

## Verification Gates

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx test pinflow-relay
corepack pnpm nx run pinflow-vscode:build:webview
corepack pnpm nx build pinflow-vscode
corepack pnpm nx build pinflow-relay
corepack pnpm nx lint pinflow-vscode
corepack pnpm nx lint pinflow-relay
git -C /home/domi/eventbaer/dev/pinflow diff --check
```

All eight green. Then run manual smoke test above.

## Out of Scope (parked, restated)

- Phase B (Live-Logs, Diff-Viewer, Detail-Drawer)
- Phase C.2 (Cost-Tracking) and C.3 (Multi-Agent)
- Phase D (Filter, Polish, Failed-Run-Recovery)
- Phase E (Marketplace, Telemetry, Team-Sharing)
- Bulk-init across all unconfigured folders in a single command
- Recursive scanning for unconfigured nested sub-folders
- Per-folder pinflow.workspace.preferredFolder UI affordance beyond the existing folder-picker
