# PinFlow VS Code Extension — Package 2 Design

## Goal

Replace the single flat `pinflow.status` Tree in the Explorer with a dedicated PinFlow Activity-Bar container that hosts three structured views (Status, Runs, Actions) and gives PinFlow a native product feel inside VS Code — without introducing a Webview or any new runtime dependency.

This is the second iteration of the extension. Package 1 shipped a working but terminal-flavored flat list; Package 2 makes the same data feel like first-class VS Code surface area.

## Why Now

Package 1 proved the wiring end-to-end: workspace discovery, monorepo demo-fixture detection, local CLI path resolution, smoke-test against the React-18-TS fixture. With that foundation stable on `origin/main` (`fddac0f`), the next blocker for adoption is presentation: a single flat list does not communicate that PinFlow is a tool, not a log. Users currently open the Explorer view, see lifecycle items mixed with evidence files mixed with timeline lines, and treat the whole thing as terminal output.

Splitting the data into Status / Runs / Actions, with a dedicated Activity-Bar container and a brand icon, makes the extension legible at a glance and gives every following feature (Webview timeline, fs-watch, multi-workspace) a stable home.

## Non-Goals

- No Webview. Timeline and run-detail rendering stay native TreeView.
- No `fs.watch` / `chokidar`. The 3 s polling tick stays.
- No designer-finished SVG asset (a pragmatic monochrome SVG is hand-drawn here; the existing raster `pinflow-icon-{light,dark}.svg` files in `assets/` are reserved for the VSIX/Marketplace icon, not the Activity Bar).
- No multi-workspace-folder UI. `getBestPinFlowWorkspaceStatus()` keeps its current single-best-folder semantics.
- No automatic cleanup of `.pinflow/runs/`.
- No Marketplace publish.

## UI Structure

### Activity Bar

A new container `pinflow` appears in VS Code's left Activity Bar between the existing icons. Container name: `PinFlow`. Container icon: a hand-drawn monochrome SVG (transparent background, single `currentColor` path) that traces the D-shield + cursor motif from the existing `assets/pinflow-icon-{light,dark}.png` brand. The colored raster SVGs the user added to `assets/` (`pinflow-icon-light.svg`, `pinflow-icon-dark.svg`) are upgraded into the VSIX/Marketplace icon (`package.json#icon`); they do **not** drive the Activity Bar because they are PNG-in-SVG and would render as solid blocks against the wrong theme.

The existing `pinflow.status` view in the Explorer is removed — Package 2 owns its own surface.

### View 1 — Status (top, always visible)

Flat list, four items max (External Claim conditional):

| Item | Icon (codicon) | Description | Tooltip |
|---|---|---|---|
| Relay | `circle-filled` (green ready / yellow missing / grey not-configured) | `host:port` or `missing` | Workspace folder path |
| Runner | `loading~spin` (working) / `check` (done) / `error` (failed) / `circle-outline` (idle) | `via codex` / `via claude` / etc. | Last run state from summary |
| Workspace | `folder` | Repo name, or `Demo Fixture` when monorepo demo path is active | Full `appRoot` path |
| External Claim | `bookmark` | claim id or `active` (only present when a claim is held) | Claim metadata snippet |

Items are not expandable. Detail surfaces via tooltip.

### View 2 — Runs (main stage)

Three top-level groups, all expandable, `Today` expanded by default:

- **Today** — runs from the current local day, newest first
- **Last 7 days** — runs from the previous 7 days excluding today, newest first
- **Older** — next 20 runs after that, then truncated

Each run entry:

- Label: `HH:MM · annotationId` (e.g. `14:32 · ann_abc123`)
- Status icon left: same icon vocabulary as Runner
- Description right: `via <provider>` plus diff summary when present (`+5 -1, 2 files`)
- Expandable into evidence sub-items (5 children, lazy-loaded for timeline):
  1. `prompt.md`
  2. `transcript.log`
  3. `diff.patch` (only if present)
  4. `Changed files (N)` — itself expandable into the individual changed files
  5. `Timeline` — itself expandable; children are produced lazily from `buildFollowTimelineItems(transcriptPath)` when the user opens this node

Inline actions on each run item (visible on hover, right edge):

- `diff` icon → opens `diff.patch` directly (skips expanding the node)
- `go-to-file` icon → reveals the run directory in the OS file explorer

View title actions (top-right toolbar):

- `refresh` → calls `pinflow.refreshPanel`

### View 3 — Actions (bottom, compact)

Context-dependent flat list:

Default state:

- ▶ Start Workflow
- 👁 Follow Runs
- 📂 Open Latest Run
- 🔖 Claim External Task

When an external claim is active, two more items appear at the top:

- ✓ Complete External Task
- ✕ Fail External Task

(Above icons are written here for readability — implementation uses codicons `play`, `eye`, `folder-opened`, `bookmark`, `check`, `close`. No emoji in code.)

View title actions: `refresh` → `pinflow.refreshPanel`.

### Status Bar

The `[PinFlow]` status bar item stays. Its `command` is rewired from `pinflow.openPanel` → `pinflow.openContainer`, which executes `workbench.view.extension.pinflow` to focus the new container. The `pinflow.openPanel` command is kept as an alias that delegates to `pinflow.openContainer`, so keybindings or older invocations still work.

## Architecture

### File layout

```
packages/pinflow-vscode/
├── media/
│   ├── icon.png                       # existing — VSIX/Marketplace banner (will be upgraded)
│   └── sidebar-icon.svg               # NEW — monochrome activity-bar icon (hand-drawn)
├── package.json                       # MOD — viewsContainers, views, menus, commands, icon path
└── src/
    ├── extension.ts                   # MOD — three providers wired to the same poll tick
    └── core/
        ├── cli-command.ts             # unchanged
        ├── commands.ts                # unchanged
        ├── evidence-commands.ts       # unchanged
        ├── external-handoff.ts        # unchanged
        ├── follow-timeline.ts         # unchanged — consumed lazily by Runs provider
        ├── workspace.ts               # unchanged
        ├── run-evidence.ts            # MOD — new findRunEvidence({ limit })
        ├── panel-model.ts             # DELETE — replaced by views/
        ├── panel-model.spec.ts        # DELETE
        └── views/                     # NEW
            ├── status-view-model.ts
            ├── status-view-model.spec.ts
            ├── runs-view-model.ts
            ├── runs-view-model.spec.ts
            ├── group-runs-by-date.ts
            ├── group-runs-by-date.spec.ts
            ├── actions-view-model.ts
            └── actions-view-model.spec.ts
```

Assets in the repo root `assets/` directory:

- `assets/pinflow-icon-light.svg` (raster-in-SVG, user-supplied) — repurposed as the upgraded VSIX banner source.
- `assets/pinflow-icon-dark.svg` (raster-in-SVG, user-supplied) — kept for marketing/Marketplace dark variants.

### Module contracts

**`run-evidence.ts` (modified)**

```ts
export interface FindRunEvidenceOptions {
  readonly limit?: number;
}

export async function findRunEvidence(
  workspaceRoot: string,
  options?: FindRunEvidenceOptions,
): Promise<readonly PinFlowRunEvidence[]>;

export async function findLatestRunEvidence(
  workspaceRoot: string,
): Promise<PinFlowRunEvidence | null>;
```

`findLatestRunEvidence` becomes a thin wrapper over `findRunEvidence(root, { limit: 1 })`. Existing callers in `evidence-commands.ts` are not changed.

`findRunEvidence` reads at most `limit` newest run directories. Polling discipline (the polling cap in the Risks section) is enforced by callers passing `limit: 80`.

**`group-runs-by-date.ts` (new)**

```ts
export interface GroupedRuns {
  readonly today: readonly PinFlowRunEvidence[];
  readonly lastSevenDays: readonly PinFlowRunEvidence[];
  readonly older: readonly PinFlowRunEvidence[];
}

export function groupRunsByDate(
  runs: readonly PinFlowRunEvidence[],
  now: Date,
): GroupedRuns;
```

Pure function. `now` is injected for deterministic testing. The `older` bucket is hard-capped at the 20 newest entries; the rest is silently dropped (consistent with the documented "next 20" UI promise).

**`status-view-model.ts` (new)**

```ts
export interface StatusViewItem {
  readonly id: 'relay' | 'runner' | 'workspace' | 'externalClaim';
  readonly label: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly themeIcon: string;
  readonly themeIconColor?: string;
}

export function buildStatusViewItems(
  status: PinFlowWorkspaceStatus,
  externalClaim: ExternalHandoffClaim | null,
): readonly StatusViewItem[];
```

Returns 3 items by default; appends the External Claim item only when `externalClaim != null`.

**`runs-view-model.ts` (new)**

```ts
export type RunsViewNode =
  | RunsViewGroupNode
  | RunsViewRunNode
  | RunsViewEvidenceFileNode
  | RunsViewChangedFilesNode
  | RunsViewChangedFileNode
  | RunsViewTimelineMarkerNode;

export interface RunsViewGroupNode {
  readonly kind: 'group';
  readonly id: 'today' | 'lastSevenDays' | 'older';
  readonly label: string;
  readonly children: readonly RunsViewRunNode[];
  readonly defaultExpanded: boolean;
}

export interface RunsViewRunNode {
  readonly kind: 'run';
  readonly run: PinFlowRunEvidence;
  readonly label: string;            // "HH:MM · annotationId"
  readonly description?: string;     // "via codex · +5 -1, 2 files"
  readonly themeIcon: string;
  readonly themeIconColor?: string;
  readonly children: readonly (RunsViewEvidenceFileNode | RunsViewChangedFilesNode | RunsViewTimelineMarkerNode)[];
}

export interface RunsViewEvidenceFileNode {
  readonly kind: 'evidenceFile';
  readonly label: 'prompt.md' | 'transcript.log' | 'diff.patch';
  readonly absolutePath: string;
}

export interface RunsViewChangedFilesNode {
  readonly kind: 'changedFiles';
  readonly count: number;
  readonly children: readonly RunsViewChangedFileNode[];
}

export interface RunsViewChangedFileNode {
  readonly kind: 'changedFile';
  readonly relativePath: string;
  readonly absolutePath: string;
}

export interface RunsViewTimelineMarkerNode {
  readonly kind: 'timelineMarker';
  readonly transcriptPath: string;
}

export function buildRunsViewTree(
  runs: readonly PinFlowRunEvidence[],
  now: Date,
): readonly RunsViewGroupNode[];
```

The model emits a `timelineMarker` node per run rather than parsing the transcript eagerly. The provider expands a marker into the actual timeline children by calling `buildFollowTimelineItems(transcriptPath)` on demand.

**`actions-view-model.ts` (new)**

```ts
export interface ActionsViewItem {
  readonly id: string;
  readonly label: string;
  readonly themeIcon: string;
  readonly command: string;
}

export function buildActionsViewItems(
  externalClaim: ExternalHandoffClaim | null,
): readonly ActionsViewItem[];
```

Static base list plus the two External-Claim items when `externalClaim != null`.

### Provider topology in `extension.ts`

A small base class `BaseTreeDataProvider<T>` owns `_items: readonly T[]`, `setItems(next)`, and `onDidChangeTreeData`. Three subclasses implement `getTreeItem` / `getChildren`:

- `StatusTreeDataProvider` — flat, no recursion.
- `RunsTreeDataProvider` — hierarchical, recurses on `children`. `getChildren` for a `timelineMarker` node lazily calls `buildFollowTimelineItems(node.transcriptPath)` and converts the result.
- `ActionsTreeDataProvider` — flat.

The 3 s `refreshStatus` tick:

1. `getBestPinFlowWorkspaceStatus()` (existing)
2. `findRunEvidence(root, { limit: 80 })` — single fs sweep per tick
3. `getCurrentExternalClaim()` (existing)
4. Build the three view models and call `setItems` on each provider

### `package.json` contributions

```jsonc
{
  "main": "./dist/extension.js",
  "icon": "media/icon.png",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "pinflow",
          "title": "PinFlow",
          "icon": "media/sidebar-icon.svg"
        }
      ]
    },
    "views": {
      "pinflow": [
        { "id": "pinflow.status",  "name": "Status"  },
        { "id": "pinflow.runs",    "name": "Runs"    },
        { "id": "pinflow.actions", "name": "Actions" }
      ]
    },
    "commands": [
      // existing 8 commands plus
      { "command": "pinflow.openContainer",     "title": "PinFlow: Show Sidebar" },
      { "command": "pinflow.openRunDirectory",  "title": "PinFlow: Open Run Directory" },
      { "command": "pinflow.openRunDiff",       "title": "PinFlow: Open Run Diff" }
    ],
    "menus": {
      "view/title": [
        { "command": "pinflow.refreshPanel", "when": "view == pinflow.runs",    "group": "navigation" },
        { "command": "pinflow.refreshPanel", "when": "view == pinflow.actions", "group": "navigation" }
      ],
      "view/item/context": [
        { "command": "pinflow.openRunDiff",      "when": "viewItem == pinflow.run",         "group": "inline" },
        { "command": "pinflow.openRunDirectory", "when": "viewItem == pinflow.run",         "group": "inline" }
      ]
    }
  },
  "activationEvents": [
    "onView:pinflow.status",
    "onView:pinflow.runs",
    "onView:pinflow.actions",
    "onCommand:pinflow.openPanel",
    "onCommand:pinflow.openContainer"
  ]
}
```

`pinflow.openPanel` stays registered as a thin alias that calls `pinflow.openContainer`.

## Tests

New unit specs (no `vscode` mock — view models are platform-free):

- `views/status-view-model.spec.ts` — covers all four status states (relay variants, runner variants, workspace label resolution for monorepo vs. external repo, External-Claim conditional)
- `views/runs-view-model.spec.ts` — node tree shape, label formatting, evidence sub-items presence/absence (e.g. no `diff.patch` node when run has no diff), timeline marker emission
- `views/group-runs-by-date.spec.ts` — boundary cases (midnight, day 7 vs. day 8, older cap at 20, empty input)
- `views/actions-view-model.spec.ts` — default vs. external-claim-active list

Modified specs:

- `run-evidence.spec.ts` — `findRunEvidence({ limit })` cases: limit smaller than dir count, limit larger, limit zero, no `.pinflow/runs/` directory
- `extension-manifest.spec.ts` — assertions on the new `viewsContainers.activitybar`, three views, menus, new commands

Deleted specs:

- `panel-model.spec.ts` — superseded

Expected test count: ~33 → ~50 across ~13 files.

## Risks (closed)

- **Codicon availability** — `loading~spin`, `circle-filled`, `bookmark` etc. are stable codicons since VS Code 1.71. The package's `engines.vscode` is already `^1.90.0`. No action needed.
- **SVG optical balance** — the hand-drawn monochrome `media/sidebar-icon.svg` is explicitly an interim asset. A designer-finished SVG can replace it with a single-file swap, no code change.
- **Polling load at large run counts** — closed by two caps:
  - **Cap 1 (directory listing)**: `findRunEvidence(root, { limit: 80 })` reads at most 80 newest run directories per 3 s tick. Worst case is constant in total run count.
  - **Cap 2 (older bucket)**: `groupRunsByDate` truncates `older` at 20. Tree size is bounded.
  - mtime-cache (skip-if-unchanged) is **explicitly deferred** as YAGNI. 80 small JSON reads per 3 s on SSD is below measurement noise; if this ever becomes a real cost, adding a `Map<runDir, mtime>` in the Runs provider is a localized follow-up.

## Verification Gates

Identical to the Package 1 quality gate:

```bash
pnpm nx test pinflow-vscode
pnpm nx build pinflow-vscode
pnpm nx lint pinflow-vscode
pnpm nx typecheck pinflow-vscode
git diff --check
```

Manual VS Code smoke test (recorded in the implementation plan):

1. `pnpm --filter pinflow-vscode package:vsix`
2. Install the rebuilt VSIX in VS Code
3. Reload window
4. Confirm the new PinFlow icon appears in the Activity Bar
5. Open it; confirm Status / Runs / Actions populate
6. Run `PinFlow: Start Workflow` against the demo fixture; confirm a new run appears under "Today" within 3 s of completion
7. Expand the run; confirm `prompt.md` / `transcript.log` / `diff.patch` / Changed files / Timeline children appear correctly
8. Hover the run; confirm inline `diff` and `go-to-file` actions are visible and work
9. Confirm the status-bar item still focuses the new container

No release without explicit user approval.

## Out of scope (parked for later packages)

- **Package 3**: Webview for richer timeline / run-detail rendering, fs-watch instead of polling, designer-finished SVG asset upgrade.
- **Roadmap phase 6**: Marketplace publish.
