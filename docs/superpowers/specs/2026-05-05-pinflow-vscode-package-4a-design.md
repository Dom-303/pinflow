# PinFlow VS Code Extension — Package 4 Phase A: UX & Onboarding

## Goal

Close the four UX gaps surfaced by the 3B-1 smoke-test (2026-05-04 evening): silent folder auto-selection, missing first-time onboarding, opaque status-row affordances, and manual browser-opening for the local dev server. Phase A delivers the foundation for Package 4 — every subsequent phase (Multi-Repo, Live-Logs, Cost-Tracking) builds on the navigation and onboarding established here.

## Why Now

After 3B-1 the extension renders runs as cards correctly, but the user-flow before getting there is broken:

- **Folder selection is invisible.** `getBestPinFlowWorkspaceStatus` silently picks one folder out of N via auto-priority. With multiple repos open, users don't know why the "wrong" folder was picked or how to switch.
- **First-time users are not greeted.** 3A's `viewsWelcome` only fires for unconfigured folders. Users who have an existing PinFlow project still get no orientation.
- **Status rows tell symptoms, not next-actions.** "Relay missing" doesn't say *click to start*. "Workspace [name]" doesn't say *click to switch*.
- **`pinflow dev` produces a Localhost URL but the browser doesn't open.** Users expect the local preview to "just appear" — today they have to discover the Preview-row click target.

Phase A fixes all four with the smallest possible scope: ~2-3 days of focused subagent-driven dev. After Phase A, every Phase A pain point from the smoke-test is resolved; the user can navigate confidently between repos and onboard new team members in seconds.

## Non-Goals (parked for later phases)

- **Multi-folder simultaneous tracking** — Phase C. Phase A only adds a folder-picker; only one folder is "active" at a time.
- **Live-log streaming, diff viewer** — Phase B.
- **Run-cost tracking, multi-agent comparison** — Phase C.
- **Filter / sort / search** — Phase D.
- **Marketplace polish, telemetry, team-sharing** — Phase E.
- **Custom walkthrough images / GIFs** — Phase E. Phase A uses markdown-only walkthrough steps.
- **Run-detail drawer or detail page** — later.

## Architectural Decisions (settled during brainstorming 2026-05-05)

| Decision | Choice | Reasoning |
|---|---|---|
| Folder-Picker UI | **QuickPick on click** of the Workspace status-row | Single VS Code-standard pattern, no extra sidebar real-estate, reuses 3B-1's `StatusViewItem.command` field. Workspace folder + status icon next to each candidate. |
| First-Time-Welcome format | **VS Code Walkthrough API** via `contributes.walkthroughs` | Standard UX users know from GitLens, Copilot, Prettier; auto-discovers in "Get Started" tab; built-in completion-tracking; manifest-only contribution. |
| Status-row affordance | **Whole-row-click** on actionable rows + enriched tooltips | Consistent pattern with Folder-Picker; the dense sidebar can't afford additional inline action icons; uses 3B-1's `command` field on `StatusViewItem`. |
| Auto-browser at `pinflow dev` | **Auto-open by default** with `pinflow.preview.autoOpen` setting (boolean, default `true`) | User explicitly expected this behavior; Setting allows opt-out for users who don't want it. Per-session debouncing avoids re-opening on the user closing the tab. |
| Walkthrough content | **4 markdown-only steps** (no images yet) | Welcome → Pick folder → `pinflow init` → Start workflow. Images deferred to Phase E. Multi-repo (Phase C) teasered inline in step 4's text, not as a separate non-completable step. |
| Existing `viewsWelcome` (3A) | **Keep unchanged** | Different surface (in-view vs Get-Started-tab). Both coexist. The Walkthrough doesn't hide the in-view welcome. |

## Architecture

### File-level changes

```
packages/pinflow-vscode/
├── package.json                                            # MOD — walkthrough + new command + setting
├── .vscodeignore                                           # MOD — must NOT exclude walkthroughs/
├── walkthroughs/                                           # NEW — at package root (not src/), referenced verbatim from package.json
│   ├── 01-welcome.md
│   ├── 02-pick-folder.md
│   ├── 03-init.md
│   └── 04-first-workflow.md
└── src/
    ├── extension.ts                                        # MOD — register pinflow.switchFolder + auto-browser logic
    ├── core/
    │   ├── folder-picker.ts                                # NEW — pure logic for "list candidate folders with status"
    │   ├── folder-picker.spec.ts                           # NEW
    │   └── views/
    │       ├── status-view-model.ts                        # MOD — wire `command` field on Relay/Workspace/Runner rows
    │       └── status-view-model.spec.ts                   # MOD — assert new commands on those rows
    └── extension-manifest.spec.ts                          # MOD — assert walkthrough + new command + new setting
```

### Manifest contributions (`package.json`)

#### New command

```jsonc
{
  "command": "pinflow.switchFolder",
  "title": "PinFlow: Switch Workspace Folder",
  "category": "PinFlow",
  "icon": "$(folder-library)"
}
```

Visible in Command Palette and triggered by clicking the Workspace status-row.

#### New walkthrough

```jsonc
"walkthroughs": [
  {
    "id": "pinflow.gettingStarted",
    "title": "Get Started with PinFlow",
    "description": "Set up your first AI-coding workflow with PinFlow in 4 short steps.",
    "steps": [
      {
        "id": "pinflow.welcome",
        "title": "Welcome to PinFlow",
        "description": "PinFlow connects your editor with AI coding agents...",
        "media": { "markdown": "walkthroughs/01-welcome.md" }
      },
      {
        "id": "pinflow.pickFolder",
        "title": "Pick a workspace folder",
        "description": "Tell PinFlow which folder to track.",
        "media": { "markdown": "walkthroughs/02-pick-folder.md" },
        "completionEvents": ["onCommand:pinflow.switchFolder"]
      },
      {
        "id": "pinflow.runInit",
        "title": "Initialize PinFlow",
        "description": "Run pinflow init to scaffold the .pinflow/ folder.",
        "media": { "markdown": "walkthroughs/03-init.md" },
        "completionEvents": ["onCommand:pinflow.runInit"]
      },
      {
        "id": "pinflow.startWorkflow",
        "title": "Start your first workflow",
        "description": "Trigger the relay + dev-server + coding agent in one click. Multi-repo workflows coming in Phase C.",
        "media": { "markdown": "walkthroughs/04-first-workflow.md" },
        "completionEvents": ["onCommand:pinflow.startWorkflow"]
      }
    ]
  }
]
```

VS Code automatically renders this in the "Get Started" tab and in the Welcome page. Each step has a completion-event that auto-checks it off when the user runs the corresponding command.

#### New setting

```jsonc
"pinflow.preview.autoOpen": {
  "type": "boolean",
  "default": true,
  "description": "Automatically open the dev server's localhost URL in your browser when 'pinflow dev' detects it. Set to false to require a manual click on the Preview row."
}
```

### Folder-Picker (`pinflow.switchFolder` command)

**Pure-logic module** at `core/folder-picker.ts`:

```ts
export interface FolderCandidate {
  readonly fsPath: string;        // candidate folder path (after getWorkspaceCandidateFolders expansion)
  readonly displayName: string;   // path.basename
  readonly status: 'ready' | 'relay-missing' | 'not-configured';
  readonly isActive: boolean;     // currently selected by getBestPinFlowWorkspaceStatus
}

export function buildFolderCandidates(
  workspaceFolders: readonly string[],
  options: { processProbe?: ProcessProbe; preferredFolder?: string },
): readonly FolderCandidate[];
```

Internally calls `getWorkspaceCandidateFolders` (existing) to expand nested-config repos, then `getPinFlowWorkspaceStatus` per candidate to compute status. The `isActive` flag matches whichever candidate `getBestPinFlowWorkspaceStatus` would pick with the same options.

Used by both the QuickPick UI and the future Multi-Folder-View (Phase C).

**Command handler in `extension.ts`:**

```ts
vscode.commands.registerCommand('pinflow.switchFolder', async () => {
  const folders = getWorkspaceFolders();
  if (folders.length === 0) {
    void vscode.window.showInformationMessage('Open a workspace folder first.');
    return;
  }
  const candidates = buildFolderCandidates(folders, { /* ... */ });
  const items = candidates.map(c => ({
    label: c.displayName,
    description: c.fsPath,
    detail: `${statusIcon(c.status)} ${statusLabel(c.status)}${c.isActive ? ' · current' : ''}`,
    candidate: c,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    title: 'Switch PinFlow Workspace Folder',
    placeHolder: 'Choose a folder to track',
  });
  if (!picked) return;
  if (picked.candidate.isActive) return;  // no-op if user picked the already-active folder
  await vscode.workspace.getConfiguration('pinflow').update(
    'workspace.preferredFolder',
    picked.candidate.fsPath,
    vscode.ConfigurationTarget.Workspace,
  );
  refreshStatus();
});
```

`statusIcon` returns `'$(check)' / '$(circle-outline)' / '$(circle-slash)'` matching the three states (`ready` / `relay-missing` / `not-configured`).

### Status-row command bindings (modify `status-view-model.ts`)

Today only the Preview row has a `command` field. Phase A extends this:

```ts
function buildRelayItem(status: PinFlowWorkspaceResult): StatusViewItem {
  // existing logic unchanged
  return {
    id: 'relay',
    label: 'Relay',
    description: relayDescription(status),
    tooltip: relayTooltip(status),  // enriched, see table below
    themeIcon: relayIcon(status),
    themeIconColor: relayColor(status),
    command: status.status === 'relay-missing'
      ? { command: 'pinflow.startWorkflow', arguments: [] }
      : undefined,  // ready/not-configured rows are inert (no command)
  };
}

function buildWorkspaceItem(...): StatusViewItem {
  // existing logic, add:
  return {
    // ...existing fields
    command: { command: 'pinflow.switchFolder', arguments: [] },
  };
}

function buildRunnerItem(...): StatusViewItem {
  // existing logic, add:
  return {
    // ...existing fields
    command: {
      command: 'workbench.action.openSettings',
      arguments: ['pinflow.externalHandoff.defaultProvider'],
    },
  };
}
```

Tooltips are enriched with action hints:

| Row | Old tooltip | New tooltip |
|---|---|---|
| Relay missing | (none / generic) | `Click to start the workflow (relay + dev + agent)` |
| Workspace `[name]` | `[fsPath]` | `[fsPath]\nClick to switch folder` |
| Runner idle/active | (none) | `Click to change the default provider in settings` |
| Preview not running | `No dev server detected. Start with PinFlow: Start Workflow.` | (unchanged) |

### Auto-browser at `pinflow dev`

**Trigger logic in `extension.ts` `refreshAll`:**

```ts
let openedDevUrls = new Set<string>();  // module-level, per-session

async function refreshAll(): Promise<void> {
  // ...existing logic...
  if (workspaceStatus.devServer && workspaceStatus.devServer.url) {
    const config = vscode.workspace.getConfiguration('pinflow');
    const autoOpen = config.get<boolean>('preview.autoOpen', true);
    const url = workspaceStatus.devServer.url;
    if (autoOpen && !openedDevUrls.has(url)) {
      openedDevUrls.add(url);
      void vscode.env.openExternal(vscode.Uri.parse(url));
    }
  }
}
```

The `openedDevUrls` Set is reset on extension activation (per VS Code session) but persists during the session — so closing and reopening a browser tab won't trigger a re-open during the same VS Code window's lifetime.

When `pinflow dev` exits and the dev.lock disappears, the URL is also removed from the Set so that a fresh `pinflow dev` run does trigger the auto-open again:

```ts
if (!workspaceStatus.devServer && previousDevServerUrl) {
  openedDevUrls.delete(previousDevServerUrl);
}
```

### Walkthrough markdown files

Each step is a small markdown file ~10-30 lines. Example for `02-pick-folder.md`:

```markdown
# Pick your workspace folder

PinFlow needs to know which folder in your VS Code workspace to track.

If you only have one folder open, it picks automatically.
If you have multiple folders open (a multi-root workspace), you'll
want to choose explicitly.

**To pick a folder:**
1. Open the PinFlow sidebar
2. Click on the **Workspace** row (under Status)
3. Choose your folder from the QuickPick

You can also run **`PinFlow: Switch Workspace Folder`** from the
Command Palette at any time.
```

Steps 03 and 04 reference existing commands (`pinflow.runInit`, `pinflow.startWorkflow`). Step 05 is a teaser.

## Tests

### `folder-picker.spec.ts` (new file)

| Test | Expects |
|---|---|
| `buildFolderCandidates` with 1 ready folder | one candidate, `status: 'ready'`, `isActive: true` |
| `buildFolderCandidates` with mixed states | candidates ordered as input, status correctly classified |
| `buildFolderCandidates` with `preferredFolder` set | `isActive: true` only on the matching candidate |
| `buildFolderCandidates` with no folders | empty array |
| `buildFolderCandidates` with relay-missing folder | `status: 'relay-missing'` |

5 new tests.

### `status-view-model.spec.ts` (modify)

| Test | Expects |
|---|---|
| Relay row `command` is `pinflow.startWorkflow` only when status is `relay-missing` | new test |
| Workspace row always has `command: pinflow.switchFolder` | new test |
| Runner row has `command: workbench.action.openSettings` with arg `pinflow.externalHandoff.defaultProvider` | new test |
| Tooltips on Relay, Workspace, Runner contain "Click to..." action hints | new test |

4 new tests on top of existing.

### `extension-manifest.spec.ts` (modify)

| Test | Expects |
|---|---|
| Walkthrough `pinflow.gettingStarted` exists with 4 steps in correct order | new test |
| Each walkthrough step references an existing markdown file under `walkthroughs/` | new test |
| `pinflow.switchFolder` command is contributed | new test |
| `pinflow.preview.autoOpen` setting exists with type `boolean` and default `true` | new test |

4 new tests.

### Not unit-tested (consistent with 3A/3B-1)

- The actual QuickPick UX (interactive, requires VS Code mock).
- Auto-browser firing (interactive, requires `vscode.env.openExternal` mock).
- Walkthrough rendering and completion tracking (VS Code-managed, manual smoke).

These are covered by the manual smoke test below.

### Test count delta

- New tests: ~13 (folder-picker 5 + status-view-model 4 + manifest 4)
- Tests touched: ~5 (existing status-view-model tests get tooltip-string updates)
- Net pinflow-vscode delta: ~+13 → ending around 116 tests (current 103 + 13).

## Risk Resolutions

| Risk | Resolution |
|---|---|
| Walkthrough completion-events fire for *unrelated* command invocations (e.g., user runs `pinflow.runInit` from Command Palette before the walkthrough) | This is the **intended behavior** — VS Code marks the step complete regardless of how the user triggered the command. Walkthrough is informational, not gating. |
| Auto-browser fires repeatedly if user reloads VS Code while `pinflow dev` is running | `openedDevUrls` is a per-session Set; reload resets it. So one auto-open per VS Code window per `pinflow dev` lifetime — acceptable. |
| User has 5 folders, multi-root, with stale `pinflow.workspace.preferredFolder` pointing to a deleted folder | Existing `getBestPinFlowWorkspaceStatus` falls back to auto-priority when preferredFolder doesn't match. No regression. |
| `pinflow.switchFolder` opens QuickPick with 0 candidates (workspace closed mid-flight) | Command shows info message and returns; doesn't crash. |
| Walkthrough markdown links to commands that don't exist if extension is partially loaded | VS Code shows the link as broken; user can navigate manually. Acceptable for Phase A. |
| Tooltips with `\nClick to switch folder` produce raw `\n` in some VS Code versions | VS Code's `MarkdownString` is the proper API for multi-line tooltips. We migrate to `MarkdownString` for the affected rows. |
| `vscode.ConfigurationTarget.Workspace` requires a workspace; falls back to global if no workspace open | Guarded earlier by the empty-folders check. |

## Manual Smoke Test (final verification gate for Phase A)

1. Build the VSIX: `corepack pnpm --filter pinflow-vscode package:vsix`.
2. Install in a fresh VS Code window. Reload.
3. **Walkthrough auto-show on first install:**
   - VS Code's "Get Started" tab opens automatically. Confirm the "Get Started with PinFlow" walkthrough is listed.
   - Click it. Confirm 5 steps render with correct titles and markdown content.
4. **Folder-Picker via Workspace-row click:**
   - Open a multi-root workspace with 2-3 folders, at least one with `.pinflow/`.
   - Click the **Workspace [name]** row in the Status view.
   - Confirm a QuickPick appears listing all folders with status icons.
   - Pick a different folder. Confirm the active workspace switches and the Status updates.
5. **Folder-Picker also from Command Palette:**
   - Run `PinFlow: Switch Workspace Folder`. Confirm same QuickPick appears.
6. **Status-row clicks:**
   - With a folder where `Relay missing`: click the Relay row → confirm `Start Workflow` is triggered (terminal opens).
   - Click the Workspace row → confirm folder-picker opens.
   - Click the Runner row → confirm Settings open filtered to `pinflow.externalHandoff.defaultProvider`.
   - Hover each row → confirm tooltips show "Click to..." hints.
7. **Auto-browser at `pinflow dev`:**
   - With `pinflow.preview.autoOpen` at default `true`, click `Start Workflow` (Actions row).
   - Wait for the dev server to start. Confirm browser tab opens automatically with the localhost URL.
   - Close the browser tab. Wait. Confirm the auto-open does NOT fire again (Set debouncing).
   - Stop `pinflow dev` (Ctrl+C in the dev terminal). Wait. Restart `pinflow dev`. Confirm the auto-open fires again.
8. **Auto-browser opt-out:**
   - Toggle `pinflow.preview.autoOpen` to `false`.
   - Restart `pinflow dev`. Confirm browser does NOT auto-open.
9. **Walkthrough completion tracking:**
   - From the Welcome → "Get Started with PinFlow" walkthrough, click "Pick a workspace folder" step.
   - Click the action button → confirm folder-picker QuickPick opens.
   - Pick a folder. Return to walkthrough. Confirm step 2 is marked as completed.
10. **No regression:**
    - Status, Runs, Actions views all render correctly.
    - 3A welcome cards (`viewsWelcome`) still appear for unconfigured folders.
    - 3B-1 run cards still render in the Runs section.

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

All eight must be green before manual smoke. Manual smoke is the final gate before considering Phase A complete and starting Phase C.

## Out of Scope (parked, restated)

- Phase B (Live-Logs, Diff-Viewer, Detail-Drawer)
- Phase C (Multi-Folder simultaneous, Cost-Tracking, Multi-Agent-Comparison)
- Phase D (Filter, Polish, Failed-Run-Recovery)
- Phase E (Marketplace, Telemetry, Team-Sharing)
- Walkthrough images / GIFs
- Custom Welcome-Page Webview (the user-explicit request was for VS Code Walkthrough API, not custom UI)
