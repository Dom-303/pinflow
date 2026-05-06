# PinFlow VS Code Extension — Package 4 Phase C.1.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface every workspace folder in Status / Actions / Runs views — configured ones with the existing C.1 accordion, unconfigured ones with a single "Setup PinFlow" action that runs `pinflow init` for the exact folder. `pinflow.runInit` becomes folder-aware.

**Spec source:** `docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c15-mixed-state-onboarding-design.md`.

**Tech Stack:** TypeScript 5 (ESM, `nodenext`), Lit 3, VS Code Extension API ≥ 1.90, Vitest + happy-dom, Nx 22, pnpm via corepack. Zero new runtime dependencies.

---

## Phase 0 — Pre-flight

### Task 0: Confirm baseline is green

**Files:** none

- [ ] **Step 1: Create feature branch and stage spec/plan**

```bash
git -C /home/domi/eventbaer/dev/pinflow checkout -b feature/c15-mixed-state-onboarding
git -C /home/domi/eventbaer/dev/pinflow add docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c15-mixed-state-onboarding-design.md docs/superpowers/plans/2026-05-06-pinflow-vscode-package-4c15-mixed-state-onboarding-implementation.md
git -C /home/domi/eventbaer/dev/pinflow commit -m "docs: add Phase C.1.5 mixed-state onboarding spec + plan"
```

- [ ] **Step 2: Confirm clean tree**

```bash
git -C /home/domi/eventbaer/dev/pinflow rev-parse --abbrev-ref HEAD
# expected: feature/c15-mixed-state-onboarding
git -C /home/domi/eventbaer/dev/pinflow status --porcelain
# expected: empty
```

- [ ] **Step 3: Run baseline quality gate**

```bash
corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode,pinflow-relay
```

Record current test counts: pinflow-vscode 145, pinflow-relay 421.

---

## Phase 1 — `multi-folder-state.ts` All-Folders Expander

### Task 1: Add `expandToAllWorkspaceFolders` + tests

**Files:**
- Modify: `packages/pinflow-vscode/src/core/multi-folder-state.ts`
- Modify: `packages/pinflow-vscode/src/core/multi-folder-state.spec.ts`

- [ ] **Step 1: Write failing tests first**

Add 5 new tests to `multi-folder-state.spec.ts`:

```ts
describe('expandToAllWorkspaceFolders', () => {
  it('returns all workspace folders when none are configured', () => {
    // Arrange
    const folders = [tempUnconfiguredA, tempUnconfiguredB];

    // Act
    const result = expandToAllWorkspaceFolders(folders);

    // Assert
    expect(result).toEqual(folders);
  });

  it('returns nested configured candidates plus unconfigured roots', () => {
    // Arrange — one root has nested .pinflow/, other is bare
    const root1 = tempRootWithNestedPinflow;     // contains <root1>/app/.pinflow/
    const root2 = tempUnconfiguredB;

    // Act
    const result = expandToAllWorkspaceFolders([root1, root2]);

    // Assert
    expect(result).toEqual([path.join(root1, 'app'), root2]);
  });

  it('matches expandToCandidateFolders when all configured', () => {
    // Arrange
    const folders = [tempConfiguredA, tempConfiguredB];

    // Act
    const all = expandToAllWorkspaceFolders(folders);
    const configured = expandToCandidateFolders(folders);

    // Assert
    expect(all).toEqual(configured);
  });

  it('dedupes when same path arrives via multiple inputs', () => {
    // Arrange
    const folders = [tempConfiguredA, tempConfiguredA];

    // Act
    const result = expandToAllWorkspaceFolders(folders);

    // Assert
    expect(result).toEqual([tempConfiguredA]);
  });

  it('preserves input order', () => {
    // Arrange
    const folders = [tempUnconfiguredB, tempConfiguredA, tempUnconfiguredA];

    // Act
    const result = expandToAllWorkspaceFolders(folders);

    // Assert
    expect(result[0]).toBe(tempUnconfiguredB);
    expect(result[1]).toBe(tempConfiguredA);
    expect(result[2]).toBe(tempUnconfiguredA);
  });
});
```

Run: `corepack pnpm nx test pinflow-vscode -- multi-folder-state`
Expected: FAIL — function not yet exported.

- [ ] **Step 2: Implement `expandToAllWorkspaceFolders`**

Add to `multi-folder-state.ts`:

```ts
export function expandToAllWorkspaceFolders(
  workspaceFolders: readonly string[],
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const root of workspaceFolders) {
    const configured = expandToCandidateFolders([root]);
    if (configured.length > 0) {
      for (const folder of configured) {
        if (!seen.has(folder)) {
          seen.add(folder);
          result.push(folder);
        }
      }
    } else {
      const resolved = path.resolve(root);
      if (!seen.has(resolved)) {
        seen.add(resolved);
        result.push(resolved);
      }
    }
  }

  return result;
}
```

Re-run: tests should pass.

- [ ] **Step 3: Re-run full multi-folder-state suite + lint**

```bash
corepack pnpm nx test pinflow-vscode -- multi-folder-state
corepack pnpm nx lint pinflow-vscode
```

Expected: green.

---

## Phase 2 — View-Models for Unconfigured Folders

### Task 2: `status-view-model.ts` Setup state

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.ts`
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`

- [ ] **Step 1: Write failing tests first**

Add to `status-view-model.spec.ts`:

```ts
describe('buildStatusFolderGroups with not-configured folder', () => {
  it('renders a single Setup leaf for not-configured state', () => {
    // Arrange
    const state: PerFolderState = {
      folder: '/path/to/repo',
      status: { status: 'not-configured', workspaceFolder: '/path/to/repo', message: 'PinFlow app not configured' },
      runs: [],
    };

    // Act
    const groups = buildStatusFolderGroups([state]);

    // Assert
    expect(groups).toHaveLength(1);
    expect(groups[0].children).toHaveLength(1);
    expect(groups[0].children[0]).toMatchObject({
      id: 'setup',
      label: 'Setup PinFlow',
      themeIcon: 'rocket',
      command: { command: 'pinflow.runInit', arguments: ['/path/to/repo'] },
    });
  });

  it('renders mixed groups: configured full, unconfigured Setup-only', () => {
    // Arrange
    const states = [readyState('/repo/a'), notConfiguredState('/repo/b')];

    // Act
    const groups = buildStatusFolderGroups(states);

    // Assert
    expect(groups[0].children.length).toBeGreaterThan(1); // Relay/Runner/Workspace/Preview
    expect(groups[1].children).toHaveLength(1);
    expect(groups[1].children[0].id).toBe('setup');
  });

  it('Setup leaf has correct description and tooltip', () => {
    // Arrange
    const state = notConfiguredState('/x');

    // Act
    const setup = buildStatusFolderGroups([state])[0].children[0];

    // Assert
    expect(setup.description).toBe('run pinflow init');
    expect(setup.tooltip).toContain('Click to scaffold');
  });

  it('runCount is 0 for not-configured group', () => {
    // Arrange
    const state = notConfiguredState('/x');

    // Act
    const group = buildStatusFolderGroups([state])[0];

    // Assert
    expect(group.runCount).toBe(0);
  });
});
```

Helper functions defined at the top of the spec file:

```ts
function readyState(folder: string): PerFolderState {
  return {
    folder,
    status: {
      status: 'ready',
      workspaceFolder: folder,
      workspaceRoot: folder,
      appRoot: folder,
      relay: { host: '127.0.0.1', port: 12345, pid: 999 },
      devServer: undefined,
      message: 'PinFlow ready',
    },
    runs: [],
  };
}

function notConfiguredState(folder: string): PerFolderState {
  return {
    folder,
    status: {
      status: 'not-configured',
      workspaceFolder: folder,
      message: 'PinFlow app not configured',
    },
    runs: [],
  };
}
```

Implementer agent should grep the existing `status-view-model.spec.ts` for similar fixtures already in use and reuse them — only add new helpers if none exist.

Run: `corepack pnpm nx test pinflow-vscode -- status-view-model`
Expected: FAIL.

- [ ] **Step 2: Implement Setup-state branch in `buildStatusFolderGroups`**

```ts
const SETUP_ITEM_BASE = {
  id: 'setup',
  label: 'Setup PinFlow',
  description: 'run pinflow init',
  tooltip: 'Click to scaffold .pinflow/ in this folder',
  themeIcon: 'rocket',
} as const;

export function buildStatusFolderGroups(
  folders: readonly PerFolderState[],
  options: BuildStatusFolderGroupsOptions = {},
): readonly StatusFolderGroup[] {
  return folders.map((state) => {
    const isConfigured = state.status.status !== 'not-configured';
    const children: readonly StatusViewItem[] = isConfigured
      ? buildStatusViewItems(
          state.status,
          options.externalClaim ?? null,
          state.runs[0] ?? null,
        )
      : [
          {
            ...SETUP_ITEM_BASE,
            command: {
              command: 'pinflow.runInit',
              arguments: [state.folder],
            },
          },
        ];
    return {
      id: state.folder,
      displayName: path.basename(state.folder),
      runCount: isConfigured ? state.runs.length : 0,
      isActive: state.folder === options.activeFolder,
      children,
    };
  });
}
```

Re-run: tests pass.

- [ ] **Step 3: Re-run full status-view-model suite + lint**

```bash
corepack pnpm nx test pinflow-vscode -- status-view-model
corepack pnpm nx lint pinflow-vscode
```

### Task 3: `actions-view-model.ts` Setup state

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/actions-view-model.ts`
- Modify: `packages/pinflow-vscode/src/core/views/actions-view-model.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('buildActionFolderGroups with not-configured folder', () => {
  it('renders a single Setup action for not-configured state', () => {
    // Arrange
    const state = notConfiguredState('/repo');

    // Act
    const groups = buildActionFolderGroups([state], null, undefined);

    // Assert
    expect(groups).toHaveLength(1);
    expect(groups[0].children).toHaveLength(1);
    expect(groups[0].children[0]).toMatchObject({
      id: 'setup',
      label: 'Setup PinFlow',
      themeIcon: 'rocket',
      command: 'pinflow.runInit',
      commandArguments: ['/repo'],
    });
  });

  it('renders normal action set for configured + setup-only for unconfigured (mixed)', () => {
    // Arrange
    const states = [readyState('/repo/a'), notConfiguredState('/repo/b')];

    // Act
    const groups = buildActionFolderGroups(states, null, '/repo/a');

    // Assert
    expect(groups[0].children.length).toBeGreaterThanOrEqual(3);
    expect(groups[1].children).toHaveLength(1);
    expect(groups[1].children[0].id).toBe('setup');
  });

  it('not-configured group ignores externalClaim', () => {
    // Arrange
    const state = notConfiguredState('/repo');
    const claim: ExternalHandoffClaim = { /* fixture */ };

    // Act
    const groups = buildActionFolderGroups([state], claim, '/repo');

    // Assert
    expect(groups[0].children).toHaveLength(1);
    expect(groups[0].children[0].id).toBe('setup');
  });
});
```

Run: FAIL.

- [ ] **Step 2: Implement Setup branch in `buildActionFolderGroups`**

```ts
const SETUP_ACTION_BASE: Omit<ActionsViewItem, 'commandArguments'> = {
  id: 'setup' as ActionsViewItemId,
  label: 'Setup PinFlow',
  themeIcon: 'rocket',
  command: 'pinflow.runInit',
} as const;

// Note: ActionsViewItemId union must include 'setup'
```

Update `ActionsViewItemId` to include `'setup'`. Then:

```ts
export function buildActionFolderGroups(
  folders: readonly PerFolderState[],
  externalClaim: ExternalHandoffClaim | null,
  activeFolder: string | undefined,
): readonly ActionFolderGroup[] {
  return folders.map((state) => {
    const isConfigured = state.status.status !== 'not-configured';
    if (!isConfigured) {
      return {
        id: state.folder,
        displayName: path.basename(state.folder),
        isActive: state.folder === activeFolder,
        children: [
          {
            ...SETUP_ACTION_BASE,
            commandArguments: [state.folder],
          },
        ],
      };
    }
    // existing configured-folder logic unchanged
    const isActive = state.folder === activeFolder;
    const claimForFolder = isActive ? externalClaim : null;
    const items = buildActionsViewItems(claimForFolder).filter(/* existing */);
    // ... existing per-folder command-arg injection logic
    return { /* configured group as today */ };
  });
}
```

Re-run: pass.

- [ ] **Step 3: Verify lint + suite**

```bash
corepack pnpm nx test pinflow-vscode -- actions-view-model
corepack pnpm nx lint pinflow-vscode
```

---

## Phase 3 — Webview Message Protocol Update

### Task 4: `runs-webview-messages.ts` adds folderStatuses + run-init

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-messages.ts`
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('isExtToWebviewMessage with folderStatuses', () => {
  it('accepts runs:update with folderStatuses', () => {
    // Arrange
    const msg = {
      type: 'runs:update',
      runsByFolder: { '/a': [] },
      folderStatuses: { '/a': 'configured' },
    };

    // Act + Assert
    expect(isExtToWebviewMessage(msg)).toBe(true);
  });

  it('rejects runs:update without folderStatuses', () => {
    expect(isExtToWebviewMessage({
      type: 'runs:update',
      runsByFolder: { '/a': [] },
    })).toBe(false);
  });

  it('rejects folderStatuses with invalid status value', () => {
    expect(isExtToWebviewMessage({
      type: 'runs:update',
      runsByFolder: { '/a': [] },
      folderStatuses: { '/a': 'wrong' },
    })).toBe(false);
  });
});

describe('isWebviewToExtMessage with run-init', () => {
  it('accepts webview:run-init with folder', () => {
    expect(isWebviewToExtMessage({ type: 'webview:run-init', folder: '/a' })).toBe(true);
  });

  it('rejects webview:run-init without folder', () => {
    expect(isWebviewToExtMessage({ type: 'webview:run-init' })).toBe(false);
  });
});
```

Run: FAIL.

- [ ] **Step 2: Update message types + guards**

```ts
export type FolderStatus = 'configured' | 'not-configured';

export type ExtToWebviewMessage =
  | {
      readonly type: 'webview:init-ack';
      readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
      readonly folderStatuses: Readonly<Record<string, FolderStatus>>;
      readonly activeFolder?: string;
      readonly settings: RunsWebviewSettings;
    }
  | {
      readonly type: 'runs:update';
      readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
      readonly folderStatuses: Readonly<Record<string, FolderStatus>>;
      readonly activeFolder?: string;
    };

export type WebviewToExtMessage =
  | { readonly type: 'webview:init' }
  | { readonly type: 'webview:run-init'; readonly folder: string }
  | /* existing entries */;
```

Update `isExtToWebviewMessage` and `isWebviewToExtMessage` guards to check the new fields. Update existing test fixtures to include `folderStatuses` where they used `runsByFolder`.

Re-run: pass.

- [ ] **Step 3: Update existing tests with the new required field**

Walk every existing test in `runs-webview-messages.spec.ts` that constructs `runs:update` or `webview:init-ack` payloads — add `folderStatuses` to fixtures.

```bash
corepack pnpm nx test pinflow-vscode -- runs-webview-messages
```

Expected: all green (existing + new).

---

## Phase 4 — `RunsWebviewProvider` posts folderStatuses

### Task 5: Provider includes folderStatuses + handles `webview:run-init`

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-provider.ts`
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts`

- [ ] **Step 1: Update `RunsSnapshot` interface**

```ts
export interface RunsSnapshot {
  readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
  readonly folderStatuses: Readonly<Record<string, FolderStatus>>;
  readonly activeFolder?: string;
}
```

- [ ] **Step 2: Forward `webview:run-init` to command**

In the existing `webview.onDidReceiveMessage` handler, add:

```ts
if (msg.type === 'webview:run-init') {
  void vscode.commands.executeCommand('pinflow.runInit', msg.folder);
  return;
}
```

- [ ] **Step 3: Update existing provider tests**

Provider tests already mock posted messages — ensure new `folderStatuses` field is asserted on the outgoing init-ack and runs-update.

```bash
corepack pnpm nx test pinflow-vscode -- runs-webview-provider
```

Expected: green.

---

## Phase 5 — `<pinflow-folder-section>` Setup state

### Task 6: Webview component renders Setup empty-state

**Files:**
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.spec.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.spec.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/main.ts` (if it bridges component events to vscode.postMessage)

- [ ] **Step 1: Add `folderStatus` property to `<pinflow-folder-section>`**

The component already exposes `folderPath` — reuse it. Add the status flag (avoiding the name `status` since lit/web-components reserve some names):

```ts
@property({ attribute: false }) folderStatus: 'configured' | 'not-configured' = 'configured';
```

Add render branch for `not-configured` body. Reuse the existing `.empty` style; the click target is a button inside it:

```ts
private renderSetupBody() {
  return html`
    <div class="empty">
      <p>Run <code>pinflow init</code> to start tracking this folder.</p>
      <button
        class="setup-button"
        @click=${this.onSetupClick}
        type="button"
      >
        Setup PinFlow
      </button>
    </div>
  `;
}

private onSetupClick = (event: Event): void => {
  event.stopPropagation();
  this.dispatchEvent(
    new CustomEvent('setup-clicked', {
      detail: { folderPath: this.folderPath },
      bubbles: true,
      composed: true,
    }),
  );
};
```

Add minimal CSS for the button (extend the existing styles block):

```css
.setup-button {
  margin-top: 8px;
  padding: 4px 12px;
  background: var(--pf-accent);
  color: var(--vscode-button-foreground, #fff);
  border: none;
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--vscode-font-family);
  font-size: 11px;
}
.setup-button:hover {
  filter: brightness(1.1);
}
```

Wire the existing `render()` to use `renderSetupBody()` instead of the runs/empty branch when `folderStatus === 'not-configured'`. The header (chevron, name, count) remains; only the expanded body changes. The runs-count for unconfigured states is always 0 (extension side guarantees this), so the header reads "0 runs" — acceptable and accurate.

- [ ] **Step 2: Failing tests for Setup state**

Use the same testing pattern as the existing `pinflow-folder-section.spec.ts` (look at the file for fixture-bootstrap conventions — it likely uses `document.createElement` + `await el.updateComplete`, not `@open-wc/testing` `fixture`). Mirror that pattern:

```ts
describe('pinflow-folder-section unconfigured state', () => {
  it('renders Setup button when folderStatus is not-configured', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.folderPath = '/repo';
    el.displayName = 'repo';
    el.folderStatus = 'not-configured';
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;

    // Act
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('.setup-button');

    // Assert
    expect(button).toBeTruthy();
    expect(button!.textContent).toContain('Setup PinFlow');

    el.remove();
  });

  it('emits setup-clicked event with folderPath when button clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.folderPath = '/repo';
    el.folderStatus = 'not-configured';
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;
    let received: CustomEvent | undefined;
    el.addEventListener('setup-clicked', (e) => { received = e as CustomEvent; });

    // Act
    el.shadowRoot!.querySelector<HTMLButtonElement>('.setup-button')!.click();

    // Assert
    expect(received).toBeDefined();
    expect(received!.detail).toEqual({ folderPath: '/repo' });

    el.remove();
  });

  it('does not render run cards when not-configured', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.folderPath = '/repo';
    el.folderStatus = 'not-configured';
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('pinflow-run-card')).toBeNull();

    el.remove();
  });
});
```

The exact test bootstrap might differ — implementer agent must read the existing spec file first and mirror its pattern. Run: FAIL until step 1 lands.

- [ ] **Step 3: Wire `<pinflow-runs-app>` to pass `folderStatuses` and forward setup-clicked**

a) Add `folderStatuses` property to `pinflow-runs-app.ts`:

```ts
@property({ attribute: false })
folderStatuses: Readonly<Record<string, 'configured' | 'not-configured'>> = {};
```

b) In its template loop, pass `.folderStatus=${this.folderStatuses[folder] ?? 'configured'}` to each `<pinflow-folder-section>`:

```ts
<pinflow-folder-section
  .folderPath=${folder}
  .displayName=${basename(folder)}
  .runs=${this.runsByFolder[folder] ?? []}
  .folderStatus=${this.folderStatuses[folder] ?? 'configured'}
  .timeFormat=${this.settings.timeFormat}
  .defaultExpanded=${folder === this.activeFolder}
  .isActive=${folder === this.activeFolder}
></pinflow-folder-section>
```

c) `pinflow-runs-app` does NOT need to forward the event itself — `setup-clicked` bubbles + composed:true reach `runs-webview/main.ts`, which is the bridge to `vscode.postMessage`. Add a listener there:

```ts
// runs-webview/main.ts
window.addEventListener('setup-clicked', (event: Event) => {
  const detail = (event as CustomEvent<{ folderPath: string }>).detail;
  vscode.postMessage({ type: 'webview:run-init', folder: detail.folderPath });
});
```

Implementer agent must inspect `runs-webview/main.ts` first to find where `vscode = acquireVsCodeApi()` is bound, then add the listener in the same scope.

d) Update `pinflow-runs-app.spec.ts`: extend any test fixture that constructs the component to include a `folderStatuses` map. Add a regression test ensuring the prop is forwarded:

```ts
it('forwards folderStatus="not-configured" to the matching folder-section', async () => {
  // Arrange
  const app = document.createElement('pinflow-runs-app') as PinflowRunsApp;
  app.runsByFolder = { '/a': [], '/b': [] };
  app.folderStatuses = { '/a': 'configured', '/b': 'not-configured' };
  document.body.appendChild(app);
  await app.updateComplete;

  // Act
  const sections = Array.from(
    app.shadowRoot!.querySelectorAll<PinflowFolderSection>('pinflow-folder-section'),
  );

  // Assert
  expect(sections[0].folderStatus).toBe('configured');
  expect(sections[1].folderStatus).toBe('not-configured');

  app.remove();
});
```

Run:

```bash
corepack pnpm nx test pinflow-vscode -- pinflow-folder-section pinflow-runs-app
corepack pnpm nx run pinflow-vscode:build:webview
```

Expected: green builds and tests.

---

## Phase 6 — `extension.ts` Wiring

### Task 7: refreshAll uses all-folders expander + folder-aware runInit

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

- [ ] **Step 1: Import + use `expandToAllWorkspaceFolders`**

```ts
import {
  buildPerFolderState,
  expandToAllWorkspaceFolders,
  pickActiveFolder,
  type PerFolderState,
} from './core/multi-folder-state.js';
```

In `refreshAll`:

```ts
const candidates = expandToAllWorkspaceFolders(workspaceFolders);
if (candidates.length === 0) {
  // unchanged: empty workspace
  return;
}

const folderStates = await Promise.all(
  candidates.map((folder) => buildPerFolderState(folder)),
);

const allUnconfigured = folderStates.every(
  (s) => s.status.status === 'not-configured',
);
void vscode.commands.executeCommand(
  'setContext',
  'pinflow.notConfigured',
  allUnconfigured,
);
```

Drop the old `expandToCandidateFolders(workspaceFolders).length === 0` branch — no longer needed because `expandToAllWorkspaceFolders` returns the workspace folder itself when nothing is configured under it.

- [ ] **Step 2: Build folderStatuses map for the webview**

```ts
const folderStatuses: Record<string, FolderStatus> = {};
for (const state of folderStates) {
  folderStatuses[state.folder] =
    state.status.status === 'not-configured' ? 'not-configured' : 'configured';
}

const runsByFolder: Record<string, readonly PinFlowRunEvidence[]> = {};
for (const state of folderStates) {
  runsByFolder[state.folder] = state.runs;
}

runsWebviewProvider.postRuns({ runsByFolder, folderStatuses, activeFolder });
```

- [ ] **Step 3: Skip per-folder side-effects on unconfigured states**

```ts
for (const state of folderStates) {
  if (state.status.status === 'not-configured') continue;
  notifyFailedRunsForFolder(state, config);
  maybeFireFirstRunToast(state);
  handleAutoBrowserForFolder(state, config);
}
```

- [ ] **Step 4: Refactor `pinflow.runInit` handler to be folder-aware**

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
    const cwd = resolveRunInitCwd(folderPath, folders, activeFolder);
    const terminal = vscode.window.createTerminal({ name: 'PinFlow Init', cwd });
    terminal.sendText(formatPinFlowCliCommand(cwd, ['init']));
    terminal.show();
  },
),

function resolveRunInitCwd(
  folderPath: unknown,
  workspaceFolders: readonly vscode.WorkspaceFolder[],
  active: string | undefined,
): string {
  if (typeof folderPath === 'string' && folderPath.trim()) {
    return folderPath;
  }
  if (active) return active;
  return workspaceFolders[0].uri.fsPath;
}
```

- [ ] **Step 5: Re-run all tests + lint + build**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx lint pinflow-vscode
corepack pnpm nx build pinflow-vscode
```

Expected: green. Test count ~165.

---

## Phase 7 — End-to-End Verification

### Task 8: Full quality gate + VSIX rebuild

**Files:** none

- [ ] **Step 1: Quality gate**

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

All eight green.

- [ ] **Step 2: Rebuild VSIX**

```bash
corepack pnpm --filter pinflow-vscode run package:vsix
```

Expected output: `tmp/pinflow-vscode.vsix`.

- [ ] **Step 3: Hand off to user for manual smoke test**

User performs the 12-step smoke test from the spec. Implementation agent reports ready and stops.

### Task 9: User-driven manual smoke test (handed off)

**Files:** none

- [ ] **Step 1: User installs VSIX**

`Cmd/Ctrl+Shift+P → "Extensions: Install from VSIX..." → tmp/pinflow-vscode.vsix`

- [ ] **Step 2: User runs the 12-step smoke from spec**

See `docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c15-mixed-state-onboarding-design.md` § Manual Smoke Test.

- [ ] **Step 3: User reports findings**

Pass → push branch and merge. Fail → file findings, agent fixes, re-smoke.

---

## Quality Gate (mandatory before reporting completion)

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

All eight green. Then user runs manual smoke test before push.

---

## Expected end-state summary

- **pinflow-vscode tests:** 145 → ~165 (+20 net new across multi-folder-state (5), status-view-model (4), actions-view-model (3), runs-webview-messages (5), pinflow-folder-section (3))
- **pinflow-relay:** unchanged (421)
- **VSIX bundle:** ~207 KB (≤2 KB increase from new lit render branch + map field)
- **No new commands**
- **No new settings**
- **No new walkthrough steps**
- **Webview message protocol BROKEN-CHANGE** (`runs:update` and `webview:init-ack` now require `folderStatuses`; new `webview:run-init` message). Both ends ship together; clean break, no compat shim — matches C.1 precedent.
- **Behavior changes:**
  - Status / Actions / Runs sidebar shows accordion rows for every workspace folder, not only configured ones.
  - Each unconfigured row has a "Setup PinFlow" affordance that runs `pinflow init` for that exact folder.
  - `pinflow.runInit` accepts an optional folder path argument.
  - `pinflow.notConfigured` context becomes `false` as soon as any candidate is configured (matches C.1) but unconfigured siblings now have UI.
