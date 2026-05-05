# PinFlow VS Code Extension — Package 4 Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four UX gaps from the 3B-1 smoke-test (folder selection, first-time onboarding, status-row affordances, auto-browser).

**Spec source:** `docs/superpowers/specs/2026-05-05-pinflow-vscode-package-4a-design.md`.

**Tech Stack:** TypeScript 5 (ESM, `nodenext`), VS Code Extension API ≥ 1.90 (Walkthrough API), Vitest + happy-dom, Nx, pnpm. Zero new runtime dependencies.

---

## Phase 0 — Pre-flight

### Task 0: Confirm baseline is green

**Files:** none

- [ ] **Step 1: Confirm branch + clean tree**

```bash
git -C /home/domi/eventbaer/dev/pinflow rev-parse --abbrev-ref HEAD
# expected: main
git -C /home/domi/eventbaer/dev/pinflow log --oneline -1
# expected: starts with f0811fd docs: add package 4a (UX & Onboarding) design spec
git -C /home/domi/eventbaer/dev/pinflow status --porcelain
# expected: empty
```

- [ ] **Step 2: Run baseline quality gate**

```bash
corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode,pinflow-relay
```

Record current test counts: pinflow-vscode 103, pinflow-relay 421.

---

## Phase 1 — Manifest Contributions

### Task 1: Walkthrough + new command + new setting in `package.json` + spec assertions

**Files:**
- Modify: `packages/pinflow-vscode/package.json`
- Modify: `packages/pinflow-vscode/src/extension-manifest.spec.ts`
- Modify: `packages/pinflow-vscode/.vscodeignore`

- [ ] **Step 1: Write failing manifest spec assertions**

In `packages/pinflow-vscode/src/extension-manifest.spec.ts`, first widen the `manifest.contributes` type at the top of the file to include `walkthroughs`. Add:

```ts
walkthroughs?: Array<{
  id: string;
  title: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    media: { markdown: string } | { image: string; altText: string };
    completionEvents?: string[];
  }>;
}>;
```

Then append three new `it(...)` blocks inside the existing `describe('VS Code extension manifest', ...)`:

```ts
it('contributes the package-4a getting-started walkthrough with 4 completable steps', () => {
  const walkthrough = manifest.contributes?.walkthroughs?.find(
    (w) => w.id === 'pinflow.gettingStarted',
  );
  expect(walkthrough).toBeDefined();
  expect(walkthrough?.steps.map((s) => s.id)).toEqual([
    'pinflow.welcome',
    'pinflow.pickFolder',
    'pinflow.runInit',
    'pinflow.startWorkflow',
  ]);
  expect(walkthrough?.steps[1]?.completionEvents).toContain(
    'onCommand:pinflow.switchFolder',
  );
  expect(walkthrough?.steps[2]?.completionEvents).toContain(
    'onCommand:pinflow.runInit',
  );
  expect(walkthrough?.steps[3]?.completionEvents).toContain(
    'onCommand:pinflow.startWorkflow',
  );
  for (const step of walkthrough?.steps ?? []) {
    expect(step.media).toEqual(
      expect.objectContaining({
        markdown: expect.stringMatching(/^walkthroughs\/\d{2}-.+\.md$/),
      }),
    );
  }
});

it('contributes the package-4a switchFolder command', () => {
  const commands = manifest.contributes?.commands?.map((c) => c.command) ?? [];
  expect(commands).toContain('pinflow.switchFolder');
});

it('contributes the package-4a preview.autoOpen setting', () => {
  const props = manifest.contributes?.configuration?.properties ?? {};
  expect(props['pinflow.preview.autoOpen']).toBeDefined();
  expect(props['pinflow.preview.autoOpen'].type).toBe('boolean');
  expect(props['pinflow.preview.autoOpen'].default).toBe(true);
});
```

Run: `corepack pnpm nx test pinflow-vscode -- extension-manifest`
Expected: FAIL — walkthrough/command/setting not yet in manifest.

- [ ] **Step 2: Add walkthrough + command + setting to `package.json`**

Append the new command to `contributes.commands`:

```jsonc
{
  "command": "pinflow.switchFolder",
  "title": "PinFlow: Switch Workspace Folder",
  "category": "PinFlow",
  "icon": "$(folder-library)"
}
```

Add the new setting inside `contributes.configuration.properties`, after the existing `pinflow.workspace.preferredFolder`:

```jsonc
"pinflow.preview.autoOpen": {
  "type": "boolean",
  "default": true,
  "description": "Automatically open the dev server's localhost URL in your browser when 'pinflow dev' detects it. Set to false to require a manual click on the Preview row."
}
```

Add a new top-level entry in `contributes` named `walkthroughs` (sibling of `commands`, `views`, etc.):

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
        "description": "PinFlow connects your editor with AI coding agents.",
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

- [ ] **Step 3: Update `.vscodeignore`** to ensure `walkthroughs/` is INCLUDED in the VSIX

Add to `.vscodeignore` (excluding the inverse — i.e., make sure the folder is NOT excluded):

```
# walkthroughs/ are referenced from package.json's contributes.walkthroughs and MUST ship in the VSIX
!walkthroughs/**
```

(Only needed if a broader exclude pattern would otherwise catch it. Verify by checking the existing `.vscodeignore`.)

- [ ] **Step 4: Run manifest spec to verify pass**

Run: `corepack pnpm nx test pinflow-vscode -- extension-manifest`
Expected: PASS — existing tests stay green plus 3 new package-4a assertions.

- [ ] **Step 5: Verify build (no runtime breakage from manifest changes)**

```bash
corepack pnpm nx build pinflow-vscode
corepack pnpm nx lint pinflow-vscode
```

Both green. Walkthrough markdown files don't exist yet — that's fine for the manifest test (which only asserts the references look right), but at runtime VS Code would silently fail to load them. We add them in Task 2.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/package.json \
        packages/pinflow-vscode/src/extension-manifest.spec.ts \
        packages/pinflow-vscode/.vscodeignore
git commit -m "feat(vscode): contribute package-4a walkthrough, switchFolder command, autoOpen setting"
```

---

## Phase 2 — Walkthrough Content

### Task 2: Write the 4 markdown files

**Files:**
- Create: `packages/pinflow-vscode/walkthroughs/01-welcome.md`
- Create: `packages/pinflow-vscode/walkthroughs/02-pick-folder.md`
- Create: `packages/pinflow-vscode/walkthroughs/03-init.md`
- Create: `packages/pinflow-vscode/walkthroughs/04-first-workflow.md`

- [ ] **Step 1: Write `01-welcome.md`**

```markdown
# Welcome to PinFlow

PinFlow is a pixel-to-code dev tool that connects your VS Code editor
with AI coding agents (Codex, Claude). You click an element in the
running web app, PinFlow captures runtime context (props, state, events),
and a coding agent works on the matching source code.

This walkthrough takes you through the 4 steps to your first run.

**Prerequisites:**
- The PinFlow CLI is installed (locally in your project, or globally).
- One or more folders open in your VS Code workspace.

When you're ready, click **Mark Done** below or move to the next step.
```

- [ ] **Step 2: Write `02-pick-folder.md`**

```markdown
# Pick your workspace folder

PinFlow needs to know which folder in your VS Code workspace to track.

If you only have one folder open, it picks automatically.
If you have multiple folders open (a multi-root workspace), you'll
want to choose explicitly.

**To pick a folder:**
1. Open the **PinFlow sidebar** (look for the PinFlow icon in the
   Activity Bar on the left edge of VS Code).
2. Click on the **Workspace** row in the **Status** section.
3. Choose your folder from the QuickPick.

You can also run **`PinFlow: Switch Workspace Folder`** from the
Command Palette (Ctrl/Cmd+Shift+P) at any time. This step marks
itself complete the first time you do.
```

- [ ] **Step 3: Write `03-init.md`**

```markdown
# Initialize PinFlow in your folder

If your folder doesn't yet have a `.pinflow/` directory, you need to
run `pinflow init` once to scaffold it.

**To initialize:**
1. In the **PinFlow sidebar**, look at the **Status** section.
2. If PinFlow shows "this workspace is not configured" with a
   **Setup PinFlow** rocket button, click it.
3. A terminal opens running `pinflow init`. Walk through the prompts.

You can also run **`PinFlow: Run Init`** from the Command Palette.

**What `pinflow init` does:**
- Creates `.pinflow/` with config defaults
- Sets up the relay manifest
- Configures your default coding agent (Codex by default — you can
  change this in Settings under `pinflow.externalHandoff.defaultProvider`)
```

- [ ] **Step 4: Write `04-first-workflow.md`**

```markdown
# Start your first workflow

After your folder is initialized, you're ready to run PinFlow end-to-end.

**To start the workflow:**
1. In the **PinFlow sidebar**, scroll to the **Actions** section.
2. Click **Start Workflow**.

This single click does three things:
- Starts the **relay** (the local PinFlow server)
- Starts the **dev server** (your web app at `localhost:NNNN`)
- Spawns the **coding agent** (Codex or Claude) ready to work

Once the dev server is up, your browser will open the localhost URL
automatically (you can disable this with `pinflow.preview.autoOpen`).
A new run card appears in the **Runs** section showing the run's
status, lifecycle pill, and timestamps.

**What's next:**
- **Phase B (coming soon):** live log streaming inside run cards,
  inline diff viewer.
- **Phase C (coming soon):** track multiple repos simultaneously
  in the same workspace.
- **Phase D (coming soon):** filter, sort, and search across all
  your runs.
- **Phase E (coming soon):** Marketplace v1.0 release.

For now: **enjoy your first PinFlow run.**
```

- [ ] **Step 5: Verify VSIX-packaging would include the files**

```bash
cd packages/pinflow-vscode && \
corepack pnpm dlx @vscode/vsce ls --no-dependencies | grep walkthroughs
```

Expected: 4 markdown files listed.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/walkthroughs/
git commit -m "feat(vscode): add package-4a walkthrough markdown content (4 steps)"
```

---

## Phase 3 — Folder-Picker Pure Logic

### Task 3: `core/folder-picker.ts` + tests (TDD)

**Files:**
- Create: `packages/pinflow-vscode/src/core/folder-picker.ts`
- Create: `packages/pinflow-vscode/src/core/folder-picker.spec.ts`

- [ ] **Step 1: Write failing tests first (TDD)**

`packages/pinflow-vscode/src/core/folder-picker.spec.ts`:

```ts
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildFolderCandidates } from './folder-picker.js';

describe('buildFolderCandidates', () => {
  let workspaceA: string;
  let workspaceB: string;

  beforeEach(async () => {
    workspaceA = await mkdtemp(path.join(tmpdir(), 'pinflow-fp-a-'));
    workspaceB = await mkdtemp(path.join(tmpdir(), 'pinflow-fp-b-'));
  });

  afterEach(async () => {
    await rm(workspaceA, { recursive: true, force: true });
    await rm(workspaceB, { recursive: true, force: true });
  });

  it('returns one candidate per workspace folder when none are configured', () => {
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: () => false,
    });
    expect(candidates).toHaveLength(2);
    expect(candidates.every((c) => c.status === 'not-configured')).toBe(true);
  });

  it('marks a configured folder as relay-missing when probe says no relay running', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: () => false,
    });
    const a = candidates.find((c) => c.fsPath === workspaceA);
    expect(a?.status).toBe('relay-missing');
  });

  it('marks a configured folder as ready when relay lock is valid and pid is alive', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceA, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4400, pid: 1 }),
    );
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: (pid) => pid === 1,
    });
    const a = candidates.find((c) => c.fsPath === workspaceA);
    expect(a?.status).toBe('ready');
  });

  it('marks isActive on the folder picked by getBestPinFlowWorkspaceStatus', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await mkdir(path.join(workspaceB, '.pinflow'), { recursive: true });
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: () => false,
    });
    const active = candidates.filter((c) => c.isActive);
    expect(active).toHaveLength(1);
    expect(active[0]?.fsPath).toBe(workspaceA);
  });

  it('honors a preferredFolder override when computing isActive', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await mkdir(path.join(workspaceB, '.pinflow'), { recursive: true });
    const candidates = buildFolderCandidates([workspaceA, workspaceB], {
      processProbe: () => false,
      preferredFolder: workspaceB,
    });
    const active = candidates.filter((c) => c.isActive);
    expect(active).toHaveLength(1);
    expect(active[0]?.fsPath).toBe(workspaceB);
  });

  it('returns an empty array when no workspace folders are open', () => {
    const candidates = buildFolderCandidates([], {});
    expect(candidates).toEqual([]);
  });
});
```

Run: `corepack pnpm nx test pinflow-vscode -- folder-picker`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 2: Implement the module**

`packages/pinflow-vscode/src/core/folder-picker.ts`:

```ts
import path from 'node:path';

import {
  getBestPinFlowWorkspaceStatus,
  getPinFlowWorkspaceStatus,
  getWorkspaceCandidateFolders,
  type ProcessProbe,
} from './workspace.js';

export interface FolderCandidate {
  readonly fsPath: string;
  readonly displayName: string;
  readonly status: 'ready' | 'relay-missing' | 'not-configured';
  readonly isActive: boolean;
}

export interface BuildFolderCandidatesOptions {
  readonly processProbe?: ProcessProbe;
  readonly preferredFolder?: string;
}

export function buildFolderCandidates(
  workspaceFolders: readonly string[],
  options: BuildFolderCandidatesOptions = {},
): readonly FolderCandidate[] {
  if (workspaceFolders.length === 0) return [];

  const expanded = workspaceFolders.flatMap((folder) =>
    getWorkspaceCandidateFolders(folder),
  );
  const active = getBestPinFlowWorkspaceStatus(workspaceFolders, options);
  const activeRoot = active?.workspaceRoot;

  return expanded.map((folder) => {
    const status = getPinFlowWorkspaceStatus(folder, options);
    return {
      fsPath: folder,
      displayName: path.basename(folder),
      status: status.status,
      isActive: folder === activeRoot,
    };
  });
}
```

- [ ] **Step 3: Run tests to verify pass**

Run: `corepack pnpm nx test pinflow-vscode -- folder-picker`
Expected: PASS — 6 new tests.

- [ ] **Step 4: Run full vscode test suite + lint**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx lint pinflow-vscode
```

Expected: 109 tests (103 + 6).

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/folder-picker.ts \
        packages/pinflow-vscode/src/core/folder-picker.spec.ts
git commit -m "feat(vscode): add folder-picker pure-logic module with status mapping"
```

---

## Phase 4 — `pinflow.switchFolder` Command

### Task 4: Register the command in `extension.ts`

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

- [ ] **Step 1: Add import + helper functions**

At the top of `extension.ts`, add the import:

```ts
import { buildFolderCandidates } from './core/folder-picker.js';
```

Add two pure helper functions near other module-level helpers:

```ts
function statusIcon(status: 'ready' | 'relay-missing' | 'not-configured'): string {
  if (status === 'ready') return '$(check)';
  if (status === 'relay-missing') return '$(circle-outline)';
  return '$(circle-slash)';
}

function statusLabel(status: 'ready' | 'relay-missing' | 'not-configured'): string {
  if (status === 'ready') return 'configured + relay running';
  if (status === 'relay-missing') return 'configured';
  return 'not configured';
}
```

- [ ] **Step 2: Register `pinflow.switchFolder` command in `activate`**

Inside the existing `context.subscriptions.push(...)` block where commands are registered, near `pinflow.openSettings`, add:

```ts
vscode.commands.registerCommand('pinflow.switchFolder', async () => {
  const folders = getWorkspaceFolders();
  if (folders.length === 0) {
    void vscode.window.showInformationMessage(
      'Open a workspace folder first.',
    );
    return;
  }
  const config = vscode.workspace.getConfiguration('pinflow');
  const preferredFolder = config.get<string>('workspace.preferredFolder', '');
  const candidates = buildFolderCandidates(folders, {
    preferredFolder: preferredFolder.trim() || undefined,
  });
  if (candidates.length === 0) {
    void vscode.window.showInformationMessage(
      'No workspace folder candidates available.',
    );
    return;
  }
  const items = candidates.map((c) => ({
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
  if (picked.candidate.isActive) return;
  await config.update(
    'workspace.preferredFolder',
    picked.candidate.fsPath,
    vscode.ConfigurationTarget.Workspace,
  );
  refreshStatus();
}),
```

- [ ] **Step 3: Verify build + tests**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx build pinflow-vscode
corepack pnpm nx lint pinflow-vscode
```

All green. Test count unchanged (no new unit tests for command registration; covered by manual smoke).

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): register pinflow.switchFolder command with QuickPick UI"
```

---

## Phase 5 — Status-Row Command Bindings

### Task 5: Wire `command` field on Relay/Workspace/Runner rows + enrich tooltips

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.ts`
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`

- [ ] **Step 1: Write failing tests first (TDD)**

In `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`, append new `it(...)` blocks inside the existing `describe('buildStatusViewItems', ...)`:

```ts
it('makes the Workspace row clickable to trigger pinflow.switchFolder', () => {
  const items = buildStatusViewItems(readyStatus(), null);
  const workspace = items.find((item) => item.id === 'workspace');
  expect(workspace?.command).toEqual({
    command: 'pinflow.switchFolder',
    arguments: [],
  });
  expect(workspace?.tooltip).toContain('Click to switch folder');
});

it('makes the Runner row clickable to open settings', () => {
  const items = buildStatusViewItems(readyStatus(), null);
  const runner = items.find((item) => item.id === 'runner');
  expect(runner?.command).toEqual({
    command: 'workbench.action.openSettings',
    arguments: ['pinflow.externalHandoff.defaultProvider'],
  });
  expect(runner?.tooltip).toContain('Click to change');
});

it('makes the Relay row clickable only when status is relay-missing', () => {
  const relayMissingItems = buildStatusViewItems(relayMissingStatus(), null);
  const relayMissing = relayMissingItems.find((item) => item.id === 'relay');
  expect(relayMissing?.command).toEqual({
    command: 'pinflow.startWorkflow',
    arguments: [],
  });
  expect(relayMissing?.tooltip).toContain('Click to start the workflow');

  const readyItems = buildStatusViewItems(readyStatus(), null);
  const relayReady = readyItems.find((item) => item.id === 'relay');
  expect(relayReady?.command).toBeUndefined();
});
```

(`relayMissingStatus()` is a new test helper alongside the existing `readyStatus()`. Add it at the top of the test file:)

```ts
function relayMissingStatus(): PinFlowWorkspaceResult {
  return {
    status: 'relay-missing',
    workspaceFolder: '/repo',
    workspaceRoot: '/repo/app',
    appRoot: '/repo/app',
    configPath: '/repo/app/.pinflow/config.json',
    message: 'PinFlow relay is not running',
  };
}
```

Run: `corepack pnpm nx test pinflow-vscode -- status-view-model`
Expected: FAIL — Workspace/Runner rows don't have `command` yet, Relay-missing doesn't have `command` yet.

- [ ] **Step 2: Implement the changes**

In `packages/pinflow-vscode/src/core/views/status-view-model.ts`, modify `buildRelayItem`, `buildWorkspaceItem`, `buildRunnerItem` to add the `command` field and enrich tooltips:

```ts
function buildRelayItem(status: PinFlowWorkspaceResult): StatusViewItem {
  // ... existing fields ...
  const isMissing = status.status === 'relay-missing';
  return {
    id: 'relay',
    label: 'Relay',
    description: relayDescription(status),
    tooltip: isMissing
      ? `${relayBaseTooltip(status)}\nClick to start the workflow (relay + dev + agent)`
      : relayBaseTooltip(status),
    themeIcon: relayIcon(status),
    themeIconColor: relayColor(status),
    command: isMissing
      ? { command: 'pinflow.startWorkflow', arguments: [] }
      : undefined,
  };
}

function buildWorkspaceItem(
  status: PinFlowWorkspaceResult,
  options: BuildStatusViewItemsOptions,
): StatusViewItem {
  // ... existing fields ...
  return {
    // ... existing return ...
    tooltip: `${workspaceBaseTooltip(appRoot, options)}\nClick to switch folder`,
    command: { command: 'pinflow.switchFolder', arguments: [] },
  };
}

function buildRunnerItem(latestRun: PinFlowRunEvidence | null): StatusViewItem {
  // ... existing fields ...
  return {
    // ... existing return ...
    tooltip: `${runnerBaseTooltip(latestRun)}\nClick to change the default provider in settings`,
    command: {
      command: 'workbench.action.openSettings',
      arguments: ['pinflow.externalHandoff.defaultProvider'],
    },
  };
}
```

(The exact existing structure of these helpers should be preserved; only the additions to the return objects are new. Refactor `*BaseTooltip` private helpers if the existing code has them inlined.)

- [ ] **Step 3: Run tests to verify pass**

Run: `corepack pnpm nx test pinflow-vscode -- status-view-model`
Expected: PASS — all tests green including the 3 new.

- [ ] **Step 4: Run full vscode test suite + build + lint**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx run pinflow-vscode:build:webview
corepack pnpm nx build pinflow-vscode
corepack pnpm nx lint pinflow-vscode
```

All green. Test count: 112 (109 + 3 new).

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/status-view-model.ts \
        packages/pinflow-vscode/src/core/views/status-view-model.spec.ts
git commit -m "feat(vscode): make Relay/Workspace/Runner status rows clickable"
```

---

## Phase 6 — Auto-Browser at `pinflow dev`

### Task 6: Implement auto-open of localhost URL in `extension.ts`'s `refreshAll`

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

- [ ] **Step 1: Add module-level state for per-session URL tracking**

At the top of `extension.ts`, near other module-level constants:

```ts
const openedDevUrls = new Set<string>();
let lastSeenDevUrl: string | undefined = undefined;
```

- [ ] **Step 2: Add the auto-open logic in `refreshAll`**

Inside `refreshAll()`, after `latestRunEvidence = runEvidence;` and before the failed-run notification block, add:

```ts
const currentDevUrl = workspaceStatus.devServer?.url;

// Reset our debouncer when pinflow dev exits — so a fresh restart re-triggers.
if (lastSeenDevUrl && lastSeenDevUrl !== currentDevUrl) {
  openedDevUrls.delete(lastSeenDevUrl);
}
lastSeenDevUrl = currentDevUrl;

if (currentDevUrl) {
  const autoOpen = config.get<boolean>('preview.autoOpen', true);
  if (autoOpen && !openedDevUrls.has(currentDevUrl)) {
    openedDevUrls.add(currentDevUrl);
    void vscode.env.openExternal(vscode.Uri.parse(currentDevUrl));
  }
}
```

(`config` is already declared earlier in `refreshAll` per Phase 6c of the 3A plan. If the variable isn't in scope, reuse the existing `vscode.workspace.getConfiguration('pinflow')` call.)

- [ ] **Step 3: Verify build + tests**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx build pinflow-vscode
corepack pnpm nx lint pinflow-vscode
```

All green. Test count unchanged (no new unit tests for auto-browser; covered by manual smoke per existing pattern).

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): auto-open localhost URL on pinflow dev detection"
```

---

## Phase 7 — End-to-End Verification

### Task 7: Build VSIX and walk through the manual smoke test

**Files:** none

- [ ] **Step 1: Rebuild the VSIX**

```bash
corepack pnpm --filter pinflow-vscode package:vsix
```

Expected: `tmp/pinflow-vscode.vsix` overwritten. Verify the package now includes `walkthroughs/01-welcome.md` through `04-first-workflow.md`.

- [ ] **Step 2: Install the VSIX in a fresh VS Code window**

In a separate VS Code window: Command Palette → "Extensions: Install from VSIX..." → pick `tmp/pinflow-vscode.vsix`. Reload window when prompted.

- [ ] **Step 3: Smoke 1 — Walkthrough auto-shows on first install**

VS Code opens "Get Started" tab automatically when a new walkthrough is contributed. Confirm: "Get Started with PinFlow" walkthrough listed. Click it. All 4 steps render with correct titles + markdown content.

- [ ] **Step 4: Smoke 2 — Folder-Picker via Workspace-row click**

Open a multi-root workspace with 2-3 folders, at least one with `.pinflow/` already configured. Click PinFlow Activity-Bar icon. Click on the **Workspace [name]** row in the Status section. Confirm:
- QuickPick titled "Switch PinFlow Workspace Folder" appears
- Each folder listed with status icon ($(check) / $(circle-outline) / $(circle-slash))
- Active folder marked "· current"

Pick a different folder. Confirm Status updates within 3 seconds (next refresh tick).

- [ ] **Step 5: Smoke 3 — Folder-Picker also from Command Palette**

Command Palette → "PinFlow: Switch Workspace Folder". Same QuickPick appears.

- [ ] **Step 6: Smoke 4 — Status-row clicks**

In a folder where PinFlow is configured but relay is not running:
- Click **Relay missing** row → confirm "Start Workflow" terminal opens
- Click **Workspace** row → confirm folder-picker QuickPick opens
- Click **Runner** row → confirm Settings UI opens filtered to `pinflow.externalHandoff.defaultProvider`

Hover each row → confirm tooltips include "Click to..." action hints.

- [ ] **Step 7: Smoke 5 — Auto-browser at `pinflow dev`**

With `pinflow.preview.autoOpen` at default `true`, click "Start Workflow" (Actions row). Wait for the dev server to start. Confirm: browser tab opens automatically with the localhost URL.

Close the browser tab. Wait 5+ refresh ticks (~15s). Confirm: auto-open does NOT fire again.

Stop `pinflow dev` (Ctrl+C in dev terminal). Wait. Restart `pinflow dev`. Confirm: auto-open fires again.

- [ ] **Step 8: Smoke 6 — Auto-browser opt-out**

Toggle `pinflow.preview.autoOpen` to `false` in Settings. Restart `pinflow dev`. Confirm: browser does NOT auto-open. Click the Preview row manually → browser opens (existing 3B-1 behavior preserved).

- [ ] **Step 9: Smoke 7 — Walkthrough completion tracking**

From "Get Started" tab → "Get Started with PinFlow" walkthrough → click "Pick a workspace folder" step. Click the action button → folder-picker QuickPick opens. Pick a folder. Return to walkthrough. Confirm: step 2 marked complete.

Repeat for steps 3 and 4 (run init, start workflow). Confirm completion ticks render.

- [ ] **Step 10: Smoke 8 — No regression**

Confirm:
- Status, Runs, Actions views all render correctly
- 3A's `viewsWelcome` cards still appear for unconfigured folders
- 3B-1's run cards still render with gold-sweep on processed transitions
- First-Run-Toast (3A Task 6d) still fires correctly

- [ ] **Step 11: Final clean-state check**

```bash
git -C /home/domi/eventbaer/dev/pinflow status --porcelain
# expected: empty
git -C /home/domi/eventbaer/dev/pinflow log --oneline f0811fd..HEAD
# expected: 5-6 commits matching the phases
```

- [ ] **Step 12: No push, no marketplace publish**

Per project convention: branch stays local until explicit user approval.

---

## Quality Gate (run any time, mandatory before reporting completion)

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

All eight must be green. Then run the manual smoke. Manual smoke is the final gate before merging Phase A and starting Phase C.

---

## Expected end-state summary

- **pinflow-vscode tests:** 103 → 112 (+9 net new across folder-picker (6) and status-view-model (3); manifest test additions don't change count because same describe block)
- **pinflow-relay:** unchanged (421)
- **VSIX bundle:** ~200 KB (slight increase from 4 walkthrough markdown files, ~3-4 KB total)
- **New commands:** `pinflow.switchFolder`
- **New settings:** `pinflow.preview.autoOpen`
- **New UX:** walkthrough auto-shown on install, folder-picker QuickPick, clickable status rows, auto-browser at dev start
- **No breaking changes** to 3A or 3B-1 surfaces
