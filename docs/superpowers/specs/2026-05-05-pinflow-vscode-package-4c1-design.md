# PinFlow VS Code Extension — Package 4 Phase C.1: Multi-Folder Simultaneous Tracking

## Goal

Replace the silent single-folder auto-priority of `getBestPinFlowWorkspaceStatus` with **simultaneous tracking of all configured workspace folders**. A power-user with 5 PinFlow-configured repos open in a multi-root VS Code workspace sees all 5 folders' status, runs, and actions at the same time in the sidebar — no folder-switching needed for the common case.

This is the architectural unblock for the original "PinFlow as power-user dashboard" vision and the foundation for Phase C.2 (Cost-Tracking) and C.3 (Multi-Agent-Comparison), both of which need the same per-folder state model.

## Why Now

After Phase A shipped, the 3B-1 smoke-test surfaced the underlying problem clearly: Phase A added a Folder-Picker (`pinflow.switchFolder`) that lets users *switch* between folders, but the user explicitly asked for **simultaneous** tracking ("5 Repos gleichzeitig"). Phase A's Folder-Picker is a stopgap, not the solution. Phase C.1 delivers the actual architecture.

Architecturally, PinFlow's CLI (relay, runner, lock-files, port-allocation) is already concurrency-safe across N repos — verified during 3B-1 wrap-up. The blocker is the VS Code extension's UI assumption that exactly ONE folder is "active". This spec lifts that assumption.

## Non-Goals (parked for later phases)

- **Run cost tracking and aggregation** — Phase C.2.
- **Multi-agent comparison view** (Codex vs Claude side-by-side) — Phase C.3.
- **Per-folder filter / sort / search** — Phase D.
- **Live log streaming inline in cards** — Phase B (post-C).
- **Diff-viewer inline in cards** — Phase B (post-C).
- **Settings-controlled folder allowlist** (`pinflow.workspace.trackedFolders`) — premature; users opt out via `.pinflow/` removal or VS Code's "Remove from Workspace" instead.
- **Marketplace polish, walkthrough images, telemetry** — Phase E.

## Architectural Decisions (from brainstorming 2026-05-05 evening)

| Decision | Choice | Reasoning |
|---|---|---|
| Sidebar layout | **Akkordeon: per-folder collapsible group inside each of the 3 existing views (Status, Runs, Actions)** | Fulfills user's "gleichzeitig" requirement literally; uses VS Code's TreeDataProvider collapsible-group API natively; preserves Phase A investments. |
| Default expansion | **Active/preferred folder expanded; others collapsed with run-count in header** | First-glance focused but nothing overwhelming. |
| Tracked folders | **All configured folders auto-tracked (no new opt-in setting)** | YAGNI — user opts out via `.pinflow/` removal or "Remove from Workspace". |
| State key | **`Map<folderFsPath, PinFlowRunEvidence[]>` per folder** in extension.ts | Clean separation; mirrors per-folder lock-files in the relay. |
| Refresh strategy | **`Promise.all` parallel per folder, no concurrency cap** | 5 folders × 80 runs ≈ 25 file reads per 3-second tick; OS disk cache makes this cheap. Revisit only if profiled hot-path. |
| Action-command pattern | **Optional `folderPath` argument on `pinflow.startWorkflow` etc.** | Backward-compat: Command Palette falls back to active/preferred folder; folder-section click passes explicit path. |
| Phase A's `pinflow.switchFolder` | **Repurpose: focuses (= sets `preferredFolder` = default-expanded) a specific folder** | Phase A investment preserved. Semantic shift is non-breaking. |
| Webview message protocol | **`runs:update` payload changes from `runs: PinFlowRunEvidence[]` to `runsByFolder: Record<string, PinFlowRunEvidence[]>`** | `Record` (plain object) for JSON-serialization, not `Map`. |
| Lit component | **New `pinflow-folder-section` wrapping existing `pinflow-run-card`** | Composition not inheritance. |
| `getBestPinFlowWorkspaceStatus` | **Kept; semantically becomes "the focus folder for ambiguous commands"** | Used for default expansion + Command-Palette-invoked actions without explicit folder. |
| Auto-browser tracking | **`Map<folderFsPath, Set<url>>` per folder** | Each `pinflow dev` has its own dev.lock and URL; per-folder Set prevents cross-folder URL collisions. |
| First-run toast & Failed-run notification | **No change — already keyed correctly** (toast by `workspaceRoot`, notification by `runId`) | Existing per-folder behavior is correct. |

## Architecture

### High-level state model

```ts
// In extension.ts — activate-scoped (closure variables):
type PerFolderState = {
  readonly folder: string;            // workspace folder fsPath (after candidate-expansion)
  readonly status: PinFlowWorkspaceResult;
  readonly runs: readonly PinFlowRunEvidence[];
};

// Snapshot recomputed each refresh tick:
let trackedFolders: readonly PerFolderState[] = [];
let lastEmittedSignature: string = '';  // diff key — see "Tree refresh discipline" below

// In multi-folder-state.ts:
async function buildPerFolderState(
  folder: string,
  options: PinFlowWorkspaceOptions,
): Promise<PerFolderState> {
  const status = getPinFlowWorkspaceStatus(folder, options);
  const runs = status.workspaceRoot
    ? await findRunEvidence(status.workspaceRoot, { limit: RUN_EVIDENCE_LIMIT })
    : [];
  return { folder, status, runs };
}

// Auto-browser per-folder URL tracking (module-level):
const openedDevUrls = new Map<string, Set<string>>();  // folder -> seen URLs
const lastSeenDevUrls = new Map<string, string>();     // folder -> current URL
```

`trackedFolders` is the source of truth for all three views. Each refresh tick:

1. Compute the candidate list of CONFIGURED folders only — `getPinFlowWorkspaceStatus(folder).status !== 'not-configured'`. Folders without `.pinflow/` are filtered out so the sidebar only shows folders that PinFlow can actually track.
2. `Promise.all(candidates.map(f => buildPerFolderState(f, opts)))` — parallel I/O.
3. Diff against previous emission via `lastEmittedSignature` (see Tree refresh discipline). Only push to providers when the signature changed — preserves user's manual expand/collapse state.

If `candidates.length === 0` (zero configured folders, even with workspace folders open), set `pinflow.notConfigured` context to `true` so 3A's `viewsWelcome` cards show. The Akkordeon stays empty.

### File-level changes

```
packages/pinflow-vscode/
├── package.json                                            # MOD — add pinflow.startWorkflow's optional folderPath argument
└── src/
    ├── extension.ts                                        # MOD — refreshAll refactor for Map-based state + Promise.all
    ├── core/
    │   ├── views/
    │   │   ├── status-view-model.ts                        # MOD — new top-level "folder group" rendering
    │   │   ├── status-view-model.spec.ts                   # MOD
    │   │   ├── actions-view-model.ts                       # MOD — per-folder action commands
    │   │   ├── actions-view-model.spec.ts                  # MOD
    │   │   ├── runs-webview-messages.ts                    # MOD — runs:update payload shape
    │   │   ├── runs-webview-messages.spec.ts               # MOD
    │   │   ├── runs-webview-provider.ts                    # MOD — postRunsByFolder method
    │   │   └── runs-webview-provider.spec.ts               # MOD
    │   └── multi-folder-state.ts                           # NEW — pure-logic computation of PerFolderState[]
    │       └── multi-folder-state.spec.ts                  # NEW (TDD-tested)
    └── runs-webview/
        ├── main.ts                                         # MOD — handle new runs:update payload shape
        └── components/
            ├── pinflow-folder-section.ts                   # NEW — Lit component for collapsible folder group
            ├── pinflow-folder-section.spec.ts              # NEW
            ├── pinflow-runs-app.ts                         # MOD — render array of folder-sections
            └── pinflow-runs-app.spec.ts                    # MOD
```

### Status View (Tree)

**Old structure** (single-folder):
```
[Relay] [Runner] [Workspace] [Preview]
```

**New structure** (multi-folder Akkordeon):
```
▾ folder-A (active)              ← default-expanded
  [Relay] [Runner] [Workspace] [Preview]
▸ folder-B (3 runs)              ← collapsed by default, run-count in header
▸ folder-C (10 runs)
```

Each top-level row is a "folder group" with `TreeItemCollapsibleState.Expanded` (for the active/preferred folder) or `Collapsed` (for the rest). Children are the existing 4 status-rows scoped to that folder.

**`status-view-model.ts` extension:** A new top-level builder `buildStatusFolderGroups(folders: PerFolderState[], options): readonly StatusFolderGroup[]`. Each group has:

```ts
interface StatusFolderGroup {
  readonly id: string;            // folder fsPath
  readonly displayName: string;   // basename
  readonly runCount: number;      // for collapsed-header display
  readonly isActive: boolean;
  readonly children: readonly StatusViewItem[];  // existing 4 rows
}
```

The existing `buildStatusViewItems` becomes an internal helper `buildStatusViewItemsForFolder` and gets wrapped per-folder.

The provider in `extension.ts` (`StatusTreeDataProvider`) gains a 2-level `getChildren` implementation: top-level returns folder-groups; group's children return its 4 status-rows.

#### Tree refresh discipline

VS Code's TreeDataProvider re-emit (`_onDidChangeTreeData.fire(undefined)`) loses user-toggled expansion state for tree-items NOT at their declared `defaultCollapsibleState`. To preserve user-expanded folders across refresh ticks:

- `setFolderGroups()` computes a stable `signature` from `(folderId, runCount, status)` per group.
- If the signature equals `lastEmittedSignature`, skip the `fire(undefined)` — the data hasn't changed, no UI update needed.
- If a folder's run-count changes (new run completed) or status changes (relay started), fire only for that folder's group, not the whole tree.
- Each TreeItem's `id` is derived from the folder fsPath (stable across re-emits) so VS Code correlates items between updates.

This means: after the user manually expands Folder-B, subsequent ticks that don't touch Folder-B's data don't fire a re-emission — Folder-B stays expanded.

### Actions View (Tree)

Same Akkordeon pattern. Existing actions:
- Start Workflow
- Follow Runs
- Open Latest Run
- Claim External Task

Become per-folder actions. The TreeItem for "Start Workflow" inside Folder-A's group invokes `pinflow.startWorkflow(folderA.fsPath)`. From the Command Palette, the command is invoked without an argument and falls back to the active/preferred folder.

`actions-view-model.ts` gains `buildActionFolderGroups(folders: PerFolderState[], externalClaim): readonly ActionFolderGroup[]`. Existing `buildActionsViewItems` is wrapped per-folder.

Command-handler change in `extension.ts`:
```ts
vscode.commands.registerCommand('pinflow.startWorkflow', (folderPath?: string) => {
  const targetFolder = folderPath ?? getCurrentWorkspace()?.commandRoot;
  if (!targetFolder) return;
  startStandardWorkflow(targetFolder, ...);
}),
```

#### Per-folder vs global commands

| Command | Per-folder? | Reasoning |
|---|---|---|
| `pinflow.startWorkflow` | **Yes** | Each folder has its own relay/dev/agent processes |
| `pinflow.followRuns` | **Yes** | `pinflow follow` accepts a workspace path |
| `pinflow.openLatestRun` | **Yes** | Latest run is per-folder |
| `pinflow.openSettings` | No (global) | VS Code settings are global |
| `pinflow.refreshPanel` | No (global) | Refreshes all folders at once |
| `pinflow.runInit` | No (global) | Always for the active/focused folder, single-shot setup |
| `pinflow.openDocumentation` | No (global) | URL is product-wide |
| `pinflow.openPreview` | Receives URL arg, no folder needed | URL identifies its folder implicitly |
| `pinflow.switchFolder` | Receives QuickPick choice | Phase A semantic; sets focus folder |
| `pinflow.externalClaim/Complete/Fail` | No (single-context-per-window) | External handoff is one active claim per VS Code window. Revisit if Phase C.2/C.3 needs per-folder |

### Runs Webview

**Single Webview instance** (no architectural change to provider lifecycle). The Webview's content changes from "list of cards" to "list of folder-sections, each with a list of cards".

**Message protocol change** (`runs-webview-messages.ts`):

```ts
// Old:
| { readonly type: 'runs:update'; readonly runs: readonly PinFlowRunEvidence[] }
| { readonly type: 'webview:init-ack'; readonly runs: readonly PinFlowRunEvidence[]; readonly settings: RunsWebviewSettings }

// New:
| { readonly type: 'runs:update'; readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>; readonly activeFolder?: string }
| { readonly type: 'webview:init-ack'; readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>; readonly activeFolder?: string; readonly settings: RunsWebviewSettings }
```

`activeFolder` is the folder the webview should expand by default; matches the active/preferred folder from the host side.

**Type-guard updates:** `isExtToWebviewMessage` now checks `runsByFolder` is an object (not array). The legacy `runs` shape is dropped — Phase C.1 is a full refactor, no backward-compat shim needed since both ends ship together.

**`RunsWebviewProvider` API change:**

```ts
// Old:
postRuns(runs: readonly PinFlowRunEvidence[]): void;

// New:
postRuns(snapshot: {
  readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
  readonly activeFolder?: string;
}): void;
```

The provider's `getCurrentRuns` callback type also changes to return the snapshot.

### Lit Components

**New: `pinflow-folder-section.ts`**

```ts
@customElement('pinflow-folder-section')
export class PinflowFolderSection extends LitElement {
  @property({ attribute: false }) folderPath!: string;
  @property({ attribute: false }) displayName!: string;
  @property({ attribute: false }) runs: readonly PinFlowRunEvidence[] = [];
  @property({ attribute: false }) timeFormat: '24h' | '12h' = '24h';
  @property({ type: Boolean }) defaultExpanded = false;
  @property({ type: Boolean }) isActive = false;

  // User's manual toggle, initialized from defaultExpanded:
  @state() private expanded = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.expanded = this.defaultExpanded;
  }

  // Header: chevron + displayName + runCount + (gold dot if isActive)
  // Body: stack of pinflow-run-card (only rendered when expanded)
  // Click on header toggles internal `expanded` @state — survives parent re-render.
}
```

The user's manual toggle is preserved across `runs:update` re-renders because `expanded` is `@state`, not `@property`. The parent's `defaultExpanded` only initializes the value on first connect.

Header design follows Phase A's editorial-calm aesthetic: 2px gold accent line on the left, folder name in `--vscode-font-family`, run-count subtly muted, chevron rotates on expand. The "active" indicator is a 6px gold-filled circle (`background: var(--pf-accent)`) right of the folder name when `isActive` — same gold as the card-edge accent, visually paired.

**Modified: `pinflow-runs-app.ts`**

Renders `repeat(folders, folder => folder.fsPath, folder => html`<pinflow-folder-section ...>`)`. The `repeat()` directive ensures stable identity across folder changes.

When `runs.length === 0` for a folder, that folder's section still renders with header but the body shows an inline empty-state message.

When `runsByFolder` is entirely empty (no configured folders at all), the existing `pinflow-empty-state` shows.

### `extension.ts.refreshAll` refactor

```ts
async function refreshAll(): Promise<void> {
  const workspaceFolders = getWorkspaceFolders();
  // ...empty-folders early return unchanged...

  const config = vscode.workspace.getConfiguration('pinflow');
  const preferredFolder = config.get<string>('workspace.preferredFolder', '');

  // Step 1: discover all candidate folders
  const candidates = expandToCandidateFolders(workspaceFolders);
  if (candidates.length === 0) {
    // No PinFlow-eligible folders — show empty state
    statusProvider.setFolderGroups([]);
    runsWebviewProvider.postRuns({ runsByFolder: {}, activeFolder: undefined });
    actionsProvider.setFolderGroups([]);
    return;
  }

  // Step 2: parallel fetch state for each candidate
  const folderStates = await Promise.all(
    candidates.map(folder => buildPerFolderState(folder, options)),
  );

  // Step 3: identify active folder for default expansion
  const activeFolder = pickActiveFolder(folderStates, preferredFolder);

  // Step 4: push to all 3 views
  statusProvider.setFolderGroups(toStatusFolderGroups(folderStates, activeFolder));
  runsWebviewProvider.postRuns({
    runsByFolder: toRunsRecord(folderStates),
    activeFolder,
  });
  actionsProvider.setFolderGroups(toActionFolderGroups(folderStates, externalClaim, activeFolder));
  
  // Step 5: failed-run notifications + first-run toast (per folder, existing logic, unchanged keying)
  for (const folderState of folderStates) {
    notifyFailedRunsForFolder(folderState);
    maybeFireFirstRunToast(folderState);
  }
  
  // Step 6: auto-browser per-folder
  for (const folderState of folderStates) {
    handleAutoBrowserForFolder(folderState, config);
  }
}
```

The bulk of refresh logic moves into `multi-folder-state.ts` as pure functions (`expandToCandidateFolders`, `buildPerFolderState`, `pickActiveFolder`). `refreshAll` becomes mostly orchestration.

### Auto-browser per-folder

```ts
const openedDevUrls = new Map<string, Set<string>>();  // folder -> URLs
const lastSeenDevUrls = new Map<string, string>();     // folder -> current URL

function handleAutoBrowserForFolder(state: PerFolderState, config: WorkspaceConfiguration): void {
  const currentUrl = state.status.devServer?.url;
  const lastSeen = lastSeenDevUrls.get(state.folder);
  
  if (lastSeen && lastSeen !== currentUrl) {
    openedDevUrls.get(state.folder)?.delete(lastSeen);
  }
  if (currentUrl) {
    lastSeenDevUrls.set(state.folder, currentUrl);
  } else {
    lastSeenDevUrls.delete(state.folder);
  }
  
  if (!currentUrl) return;
  const autoOpen = config.get<boolean>('preview.autoOpen', true);
  if (!autoOpen) return;
  
  const folderUrls = openedDevUrls.get(state.folder) ?? new Set<string>();
  if (folderUrls.has(currentUrl)) return;
  folderUrls.add(currentUrl);
  openedDevUrls.set(state.folder, folderUrls);
  
  try {
    void vscode.env.openExternal(vscode.Uri.parse(currentUrl));
  } catch {
    // Malformed dev URLs shouldn't crash the refresh tick
  }
}
```

Each folder gets its own URL-deduplication. If 5 folders all start `pinflow dev` at once, 5 browser tabs open — exactly the simultaneous-multi-repo expectation.

#### Cleanup on folder removal

When the user removes a folder from the VS Code workspace, the existing `vscode.workspace.onDidChangeWorkspaceFolders` listener in `extension.ts` already triggers `refreshStatus()`. To prevent stale entries in the per-folder Maps, the listener also clears those maps for folders no longer in the workspace:

```ts
vscode.workspace.onDidChangeWorkspaceFolders((event) => {
  for (const removed of event.removed ?? []) {
    const folderPath = removed.uri.fsPath;
    openedDevUrls.delete(folderPath);
    lastSeenDevUrls.delete(folderPath);
  }
  refreshStatus();
}),
```

This prevents accumulated state if a long-lived VS Code session sees workspace folders come and go.

## Tests

### `multi-folder-state.spec.ts` (new file)

| Test | Expects |
|---|---|
| `expandToCandidateFolders` with 2 workspaceFolders, both configured | returns 2 candidates |
| `expandToCandidateFolders` filters out non-configured folders | only PinFlow-configured folders pass |
| `expandToCandidateFolders` expands nested configs | uses `getWorkspaceCandidateFolders` |
| `buildPerFolderState` returns folder + status + runs | snapshot shape correct |
| `buildPerFolderState` with no runs returns empty array | edge case |
| `pickActiveFolder` honors `preferredFolder` setting | preference wins |
| `pickActiveFolder` falls back to first-ready folder | auto-priority chain |
| `pickActiveFolder` returns undefined when no folders | empty input |

8 new tests.

### `runs-webview-messages.spec.ts` (modify)

| Test | Expects |
|---|---|
| `isExtToWebviewMessage` accepts new `runs:update` shape with `runsByFolder` | type guard updated |
| `isExtToWebviewMessage` rejects old `runs` array shape | clean break, no backward-compat |
| `isExtToWebviewMessage` accepts new `init-ack` with `runsByFolder` + `activeFolder` | shape correct |
| Round-trip preserves `runsByFolder` keys + values | JSON serialization safe |

3-4 modified tests, plus existing positive-case tests adapted.

### `status-view-model.spec.ts` (modify substantially)

The existing tests assume single-folder. Most need to be wrapped in folder-groups. New tests:

| Test | Expects |
|---|---|
| `buildStatusFolderGroups` with 0 folders | returns empty array |
| `buildStatusFolderGroups` with 1 folder | returns 1 group, isActive=true |
| `buildStatusFolderGroups` with 3 folders, preferredFolder=B | only B is isActive |
| Group's children include all 4 existing status-rows scoped to its folder | composition correct |
| Active group has `defaultExpanded: true`, others `false` | UX rule |

Existing single-folder tests stay but get wrapped via a helper `singleFolderGroupOf(status)` for backward-compat in tests.

### `actions-view-model.spec.ts` (modify)

| Test | Expects |
|---|---|
| `buildActionFolderGroups` per folder generates one group with 4 actions each | composition correct |
| Action commands include `folderPath` argument matching the group's folder | per-folder routing |
| `pinflow.externalClaim` action does NOT accept folderPath (single-context for now) | scope decision |

3 new tests.

### `runs-webview-provider.spec.ts` (modify)

| Test | Expects |
|---|---|
| `postRuns({ runsByFolder, activeFolder })` sends new payload shape | API contract |
| Init-ack handshake includes `runsByFolder` + `activeFolder` | initial-load state |
| Provider stores latest snapshot for re-emission | replay on reconnect |

3-4 modified tests.

### `pinflow-folder-section.spec.ts` (new)

| Test | Expects |
|---|---|
| Renders header with displayName and run-count | basic render |
| Default expanded state matches `expanded` property | controlled |
| Click on header toggles expanded | interaction |
| Body renders one `pinflow-run-card` per run when expanded | composition |
| Body shows inline empty-state message when runs.length === 0 | edge case |
| Active marker in header when `isActive` | visual cue |

6 new tests.

### `pinflow-runs-app.spec.ts` (modify)

| Test | Expects |
|---|---|
| Renders one `pinflow-folder-section` per folder in `runsByFolder` | composition |
| Empty `runsByFolder` shows global `pinflow-empty-state` | edge case |
| Stress test: 5 folders × 80 runs each renders without throw | performance sanity |

3-4 modified tests.

### Test count delta

- New: ~8 (multi-folder-state) + ~6 (folder-section) = ~14 new tests
- Modified: ~10-15 existing tests adapted to multi-folder shape
- Net pinflow-vscode: ~118 → ~132 (+14 net new, plus modifications in-place)

### Not unit-tested (consistent with existing pattern)

- The actual Tree-collapsible-group rendering in VS Code (manual smoke).
- 5-folder-parallel `Promise.all` performance (manual smoke + DevTools profile).
- Browser auto-open for multiple folders simultaneously (manual smoke).

## Risk Resolutions

| Risk | Resolution |
|---|---|
| **Refresh-tick disk-I/O explosion** with 5+ folders | Each folder's `findRunEvidence` reads ~5-20 files (summary.json's). 5 folders × 20 reads = 100 reads / 3 seconds. OS file-cache makes this ~1ms. Profile only if user reports lag. |
| **Webview re-render thrash** with 400 cards (5 folders × 80) | `pinflow-folder-section` only renders body when `expanded`. Default state has 1 expanded folder ≈ 80 cards visible. Lit's `repeat()` keys keep updates surgical. |
| **Status-View grouping breaks 3A's `viewsWelcome`** | The `viewsWelcome` blocks fire when `pinflow.notConfigured` context is true. With multi-folder, this becomes "no candidate folders found" — preserve existing semantics by setting the context based on `candidates.length === 0`. |
| **Phase A's `switchFolder` semantic shift confuses users** | Update Phase A's walkthrough Step 2 markdown ("Pick a folder") to mention that with multi-folder support, picking a folder *focuses/expands* it — doesn't switch away from others. |
| **`getBestPinFlowWorkspaceStatus` callers break** | Inventory all call sites: `getCurrentWorkspaceRoot`, `getCurrentWorkspace`, `pinflow.followRuns`, etc. These all want "the current focus folder" — keep the function, document the new semantic. |
| **Existing tests break en masse** | Acceptable scope expansion within Phase C.1 — tests are part of the contract. Modify or wrap in helper, don't delete unless redundant. |
| **`runsByFolder` keys with special characters** (e.g., `/repo/with space/`) | Folder paths are valid JSON-serializable strings. No special handling needed. |
| **External-claim row vs folder grouping** | External claim is global (single context per VS Code window). Render it as a dedicated section ABOVE the folder-groups in Status-View, not inside any folder-group. |

## Manual Smoke Test (final verification gate for Phase C.1)

1. Build the VSIX. Install in fresh VS Code window. Reload.
2. **Multi-root workspace setup:** Open a workspace with 2-3 folders, at least 2 with `.pinflow/` configured.
3. **Status-View Akkordeon:**
   - Confirm 2-3 top-level folder-groups appear in the Status section.
   - Active folder (per `preferredFolder` setting or auto-priority) is expanded; others collapsed.
   - Collapsed folders show "(N runs)" next to folder name.
   - Click a collapsed folder header — it expands, showing its 4 status rows.
4. **Runs-Webview folder-sections:**
   - Confirm one `pinflow-folder-section` per folder.
   - Active folder's section is expanded with run-cards visible.
   - Other sections show header only.
   - Click a collapsed folder's header → expands smoothly with stagger fade-in on cards.
5. **Actions-View per-folder:**
   - Confirm one folder-group per folder, each with the 4 actions (Start Workflow, Follow Runs, Open Latest Run, Claim External Task).
   - Click "Start Workflow" inside Folder-A's group → terminal opens at Folder-A's path.
   - Click the same action inside Folder-B's group → different terminal at Folder-B.
   - Run `pinflow.startWorkflow` from Command Palette → falls back to active/preferred folder.
6. **Folder-Picker (Phase A) still works:**
   - Click on a folder-group's header → equivalent to running `pinflow.switchFolder` and picking that folder.
   - Or use Command Palette → `PinFlow: Switch Workspace Folder` → QuickPick still appears, selecting changes which folder is default-expanded.
7. **Auto-browser multi-folder:**
   - Trigger `pinflow.startWorkflow` for Folder-A. Confirm browser opens A's localhost.
   - Trigger `pinflow.startWorkflow` for Folder-B. Confirm browser opens B's localhost (different port).
   - Both tabs stay open simultaneously.
8. **Failed-run notification per folder:**
   - Trigger a workflow in Folder-A that fails. Confirm toast mentions `[Folder-A]`.
   - Concurrently fail one in Folder-B. Confirm separate toast for Folder-B.
9. **First-run toast per folder:**
   - In a folder that has never had a successful run, trigger one. Confirm celebration toast fires.
   - Repeat in another folder — confirm it fires there too (each folder has own globalState key).
10. **Workflow under load:** With 3 folders × ~50 runs each, scroll through the Runs-Webview. Confirm UI stays responsive.

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

All eight green before manual smoke. Manual smoke is the final gate before merging Phase C.1 and starting C.2 (Cost-Tracking) or B (Live-Logs).

## Out of Scope (parked, restated)

- **Run cost tracking** (token + $ per run, daily/weekly aggregation) — Phase C.2.
- **Multi-agent comparison view** — Phase C.3.
- **Filter / sort / search per folder** — Phase D.
- **Live log streaming, diff viewer** — Phase B (after C).
- **Marketplace polish** — Phase E.
