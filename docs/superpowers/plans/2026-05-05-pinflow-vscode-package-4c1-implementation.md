# PinFlow VS Code Extension — Package 4 Phase C.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the extension from single-folder to multi-folder simultaneous tracking. All views (Status, Runs, Actions) gain folder-grouping. Commands accept optional `folderPath`. Auto-browser tracks per-folder URLs.

**Spec source:** `docs/superpowers/specs/2026-05-05-pinflow-vscode-package-4c1-design.md`.

**Tech Stack:** TypeScript 5 (ESM, `nodenext`), Lit 3, VS Code Extension API ≥ 1.90, Vitest + happy-dom, Nx, pnpm. Zero new runtime dependencies.

---

## Phase 0 — Pre-flight

### Task 0: Confirm baseline is green

**Files:** none

- [ ] **Step 1: Confirm branch + clean tree**

```bash
git -C /home/domi/eventbaer/dev/pinflow rev-parse --abbrev-ref HEAD
# expected: main
git -C /home/domi/eventbaer/dev/pinflow log --oneline -1
# expected: starts with 5fddac3 docs: add package 4 phase C.1 ...design spec
git -C /home/domi/eventbaer/dev/pinflow status --porcelain
# expected: empty
```

- [ ] **Step 2: Run baseline quality gate**

```bash
corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode,pinflow-relay
```

Record current test counts: pinflow-vscode 118, pinflow-relay 421.

---

## Phase 1 — Message Protocol Refactor

### Task 1: Update `runs-webview-messages.ts` for `runsByFolder`

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-messages.ts`
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts`

The message payload changes from `runs: PinFlowRunEvidence[]` to `runsByFolder: Record<string, readonly PinFlowRunEvidence[]>` plus an `activeFolder` hint.

- [ ] **Step 1: Update existing failing-tests-first style**

Modify the existing tests in `runs-webview-messages.spec.ts`:

For `isExtToWebviewMessage`:
- Update `'accepts a valid runs:update'` to use `{ type: 'runs:update', runsByFolder: {} }` instead of `runs: []`.
- Update `'accepts a valid webview:init-ack with settings'` to use `{ type: 'webview:init-ack', runsByFolder: {}, settings: { timeFormat: '24h' } }`. `activeFolder` is OPTIONAL.
- Add new test: `'accepts a valid webview:init-ack with activeFolder'` checking `{ ..., activeFolder: '/folder/path' }`.
- Add new test: `'rejects runs:update with old runs array shape'` — confirms clean break, no backward-compat: `{ type: 'runs:update', runs: [] }` must return `false` from the guard.

For round-trip:
- Update `'preserves all fields of init-ack'` to use the new payload.

Run: `corepack pnpm nx test pinflow-vscode -- runs-webview-messages`
Expected: FAIL — guard not yet updated.

- [ ] **Step 2: Implement the new message types**

Edit `runs-webview-messages.ts`:

```ts
export type ExtToWebviewMessage =
  | {
      readonly type: 'webview:init-ack';
      readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
      readonly activeFolder?: string;
      readonly settings: RunsWebviewSettings;
    }
  | {
      readonly type: 'runs:update';
      readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
      readonly activeFolder?: string;
    }
  | {
      readonly type: 'settings:update';
      readonly settings: RunsWebviewSettings;
    };
```

Update the type guards:

```ts
function isRunsByFolder(value: unknown): value is Record<string, unknown[]> {
  if (!isObject(value)) return false;
  return Object.values(value).every((v) => Array.isArray(v));
}

export function isExtToWebviewMessage(value: unknown): value is ExtToWebviewMessage {
  if (!isObject(value)) return false;
  const type = value['type'];
  if (type === 'runs:update') {
    return isRunsByFolder(value['runsByFolder']);
  }
  if (type === 'webview:init-ack') {
    return (
      isRunsByFolder(value['runsByFolder']) && isSettings(value['settings'])
    );
  }
  if (type === 'settings:update') {
    return isSettings(value['settings']);
  }
  return false;
}
```

- [ ] **Step 3: Run tests to verify pass**

```bash
corepack pnpm nx test pinflow-vscode -- runs-webview-messages
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/runs-webview-messages.ts \
        packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts
git commit -m "refactor(vscode): change webview message protocol to per-folder runs"
```

---

## Phase 2 — `multi-folder-state.ts` Pure Logic

### Task 2: Create pure-logic module + 8 TDD tests

**Files:**
- Create: `packages/pinflow-vscode/src/core/multi-folder-state.ts`
- Create: `packages/pinflow-vscode/src/core/multi-folder-state.spec.ts`

- [ ] **Step 1: Write failing tests**

`multi-folder-state.spec.ts`:

```ts
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  expandToCandidateFolders,
  buildPerFolderState,
  pickActiveFolder,
} from './multi-folder-state.js';

describe('expandToCandidateFolders', () => {
  let workspaceA: string;
  let workspaceB: string;

  beforeEach(async () => {
    workspaceA = await mkdtemp(path.join(tmpdir(), 'pinflow-mfs-a-'));
    workspaceB = await mkdtemp(path.join(tmpdir(), 'pinflow-mfs-b-'));
  });

  afterEach(async () => {
    await rm(workspaceA, { recursive: true, force: true });
    await rm(workspaceB, { recursive: true, force: true });
  });

  it('returns only configured folders, filtering out not-configured', async () => {
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    // workspaceB has no .pinflow/
    const result = expandToCandidateFolders([workspaceA, workspaceB]);
    expect(result).toContain(workspaceA);
    expect(result).not.toContain(workspaceB);
  });

  it('expands nested .pinflow/ via getWorkspaceCandidateFolders', async () => {
    const nested = path.join(workspaceA, 'sub-app');
    await mkdir(path.join(nested, '.pinflow'), { recursive: true });
    const result = expandToCandidateFolders([workspaceA]);
    expect(result).toContain(nested);
  });

  it('returns empty array when no folders are configured', () => {
    const result = expandToCandidateFolders([workspaceA, workspaceB]);
    expect(result).toEqual([]);
  });
});

describe('buildPerFolderState', () => {
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(path.join(tmpdir(), 'pinflow-pfs-'));
    await mkdir(path.join(folder, '.pinflow'), { recursive: true });
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('returns folder + status + empty runs when no runs exist', async () => {
    const state = await buildPerFolderState(folder, { processProbe: () => false });
    expect(state.folder).toBe(folder);
    expect(state.status.status).toBe('relay-missing');
    expect(state.runs).toEqual([]);
  });
});

describe('pickActiveFolder', () => {
  it('returns undefined for empty folder list', () => {
    expect(pickActiveFolder([], '')).toBeUndefined();
  });

  it('honors the preferredFolder when matching one of the candidates', () => {
    const folders = [
      { folder: '/a', status: { status: 'ready' as const, workspaceFolder: '/a', message: '' }, runs: [] },
      { folder: '/b', status: { status: 'ready' as const, workspaceFolder: '/b', message: '' }, runs: [] },
    ];
    const active = pickActiveFolder(folders, '/b');
    expect(active).toBe('/b');
  });

  it('falls back to first ready folder when preferredFolder does not match', () => {
    const folders = [
      { folder: '/a', status: { status: 'relay-missing' as const, workspaceFolder: '/a', message: '' }, runs: [] },
      { folder: '/b', status: { status: 'ready' as const, workspaceFolder: '/b', message: '' }, runs: [] },
    ];
    const active = pickActiveFolder(folders, '');
    expect(active).toBe('/b');
  });

  it('falls back to first folder when none is ready', () => {
    const folders = [
      { folder: '/a', status: { status: 'relay-missing' as const, workspaceFolder: '/a', message: '' }, runs: [] },
      { folder: '/b', status: { status: 'relay-missing' as const, workspaceFolder: '/b', message: '' }, runs: [] },
    ];
    const active = pickActiveFolder(folders, '');
    expect(active).toBe('/a');
  });
});
```

Run: `corepack pnpm nx test pinflow-vscode -- multi-folder-state`. Expected: FAIL.

- [ ] **Step 2: Implement the module**

`multi-folder-state.ts`:

```ts
import {
  findRunEvidence,
  type PinFlowRunEvidence,
} from './run-evidence.js';
import {
  getPinFlowWorkspaceStatus,
  getWorkspaceCandidateFolders,
  type PinFlowWorkspaceOptions,
  type PinFlowWorkspaceResult,
} from './workspace.js';

const RUN_EVIDENCE_LIMIT = 80;

export interface PerFolderState {
  readonly folder: string;
  readonly status: PinFlowWorkspaceResult;
  readonly runs: readonly PinFlowRunEvidence[];
}

export function expandToCandidateFolders(
  workspaceFolders: readonly string[],
): readonly string[] {
  const expanded = workspaceFolders.flatMap((folder) =>
    getWorkspaceCandidateFolders(folder),
  );
  return expanded.filter((folder) => {
    const status = getPinFlowWorkspaceStatus(folder);
    return status.status !== 'not-configured';
  });
}

export async function buildPerFolderState(
  folder: string,
  options: PinFlowWorkspaceOptions = {},
): Promise<PerFolderState> {
  const status = getPinFlowWorkspaceStatus(folder, options);
  const runs = status.workspaceRoot
    ? await findRunEvidence(status.workspaceRoot, { limit: RUN_EVIDENCE_LIMIT })
    : [];
  return { folder, status, runs };
}

export function pickActiveFolder(
  states: readonly PerFolderState[],
  preferredFolder: string,
): string | undefined {
  if (states.length === 0) return undefined;

  if (preferredFolder) {
    const match = states.find((s) => s.folder === preferredFolder);
    if (match) return match.folder;
  }

  const ready = states.find((s) => s.status.status === 'ready');
  if (ready) return ready.folder;

  return states[0]?.folder;
}
```

- [ ] **Step 3: Run tests + lint**

```bash
corepack pnpm nx test pinflow-vscode -- multi-folder-state
corepack pnpm nx lint pinflow-vscode
```

Expected: PASS, ~8 new tests.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/core/multi-folder-state.ts \
        packages/pinflow-vscode/src/core/multi-folder-state.spec.ts
git commit -m "feat(vscode): add multi-folder-state module with parallel folder expansion"
```

---

## Phase 3 — `RunsWebviewProvider` API Change

### Task 3: Update provider for new payload + tests

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-provider.ts`
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts`

- [ ] **Step 1: Update tests first**

Modify the existing provider tests:
- Replace test inputs to use `runsByFolder` (an object keyed by folder paths) instead of `runs` arrays.
- Update assertions to expect `postRuns({ runsByFolder, activeFolder })`-shaped payload via `webview.postMessage`.

Add new test: `'postRuns sends activeFolder hint when provided'` — verifies `activeFolder` field round-trips.

Run: `corepack pnpm nx test pinflow-vscode -- runs-webview-provider`. Expected: FAIL.

- [ ] **Step 2: Update the provider**

In `runs-webview-provider.ts`, change:

```ts
// Old constructor deps:
readonly getCurrentRuns: () => readonly PinFlowRunEvidence[];

// New:
readonly getCurrentSnapshot: () => {
  readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
  readonly activeFolder?: string;
};
```

Replace `postRuns(runs)` method:

```ts
postRuns(snapshot: {
  readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
  readonly activeFolder?: string;
}): void {
  if (!this.webviewView) return;
  const update: ExtToWebviewMessage = {
    type: 'runs:update',
    runsByFolder: snapshot.runsByFolder,
    activeFolder: snapshot.activeFolder,
  };
  void this.webviewView.webview.postMessage(update);
}
```

Update the `webview:ready` handshake response to use the new payload.

Update `run:open-prompt` handler to look up the run across all folder's runs in the snapshot:

```ts
if (message.type === 'run:open-prompt') {
  const snapshot = this.deps.getCurrentSnapshot();
  for (const runs of Object.values(snapshot.runsByFolder)) {
    const match = runs.find((r) => r.runId === message.runId);
    if (match) {
      this.deps.onOpenPrompt(match);
      return;
    }
  }
}
```

- [ ] **Step 3: Run tests + lint**

```bash
corepack pnpm nx test pinflow-vscode -- runs-webview-provider
corepack pnpm nx lint pinflow-vscode
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/runs-webview-provider.ts \
        packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts
git commit -m "refactor(vscode): RunsWebviewProvider takes per-folder snapshot"
```

---

## Phase 4 — Lit Components

### Task 4: New `<pinflow-folder-section>` + refactor `<pinflow-runs-app>`

**Files:**
- Create: `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.ts`
- Create: `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.spec.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.spec.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/main.ts`

- [ ] **Step 1: Implement `pinflow-folder-section.ts`**

```ts
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './pinflow-run-card.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

@customElement('pinflow-folder-section')
export class PinflowFolderSection extends LitElement {
  @property({ attribute: false }) folderPath = '';
  @property({ attribute: false }) displayName = '';
  @property({ attribute: false }) runs: readonly PinFlowRunEvidence[] = [];
  @property({ attribute: false }) timeFormat: RunsWebviewSettings['timeFormat'] = '24h';
  @property({ type: Boolean }) defaultExpanded = false;
  @property({ type: Boolean }) isActive = false;

  @state() private expanded = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.expanded = this.defaultExpanded;
  }

  static styles = css`
    :host {
      display: block;
      border-bottom: 1px solid var(--pf-border);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      user-select: none;
    }
    .header:hover {
      background: var(--pf-bg-elevated);
    }
    .chevron {
      font-family: codicon;
      font-size: 14px;
      color: var(--pf-text-muted);
      transition: transform 200ms ease;
    }
    :host([expanded]) .chevron {
      transform: rotate(90deg);
    }
    .name {
      flex: 1;
      color: var(--pf-text);
      font-weight: 500;
    }
    .active-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--pf-accent);
    }
    .count {
      color: var(--pf-text-muted);
      font-size: 11px;
    }
    .body {
      padding: 4px 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .empty {
      padding: 16px 8px;
      text-align: center;
      color: var(--pf-text-muted);
      font-family: var(--vscode-font-family);
      font-size: 11px;
    }
  `;

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('expanded')) {
      this.toggleAttribute('expanded', this.expanded);
    }
  }

  render() {
    return html`
      <div class="header" @click=${this.toggle}>
        <i class="codicon codicon-chevron-right chevron" aria-hidden="true"></i>
        <span class="name">${this.displayName}</span>
        ${this.isActive ? html`<span class="active-dot" aria-label="active folder"></span>` : null}
        <span class="count">${this.runs.length} run${this.runs.length === 1 ? '' : 's'}</span>
      </div>
      ${this.expanded
        ? this.runs.length > 0
          ? html`<div class="body">
              ${repeat(
                this.runs,
                (run) => run.runId ?? run.summaryPath,
                (run, index) => html`
                  <pinflow-run-card
                    .run=${run}
                    .timeFormat=${this.timeFormat}
                    .index=${index}
                  ></pinflow-run-card>
                `,
              )}
            </div>`
          : html`<div class="empty">No runs yet for this folder.</div>`
        : null}
    `;
  }

  private toggle = (): void => {
    this.expanded = !this.expanded;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-folder-section': PinflowFolderSection;
  }
}
```

- [ ] **Step 2: Add tests for `pinflow-folder-section`**

`pinflow-folder-section.spec.ts`:

```ts
import './pinflow-folder-section.js';
import { PinflowFolderSection } from './pinflow-folder-section.js';

describe('<pinflow-folder-section>', () => {
  it('renders the displayName and run count in the header', async () => {
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.displayName = 'my-app';
    el.runs = [
      { runId: 'r1', summary: { status: 'processed' }, summaryPath: '/p1' } as never,
      { runId: 'r2', summary: { status: 'processed' }, summaryPath: '/p2' } as never,
    ];
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('my-app');
    expect(el.shadowRoot!.textContent).toContain('2 runs');
    el.remove();
  });

  it('uses singular "run" for run count of 1', async () => {
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.runs = [{ runId: 'r1', summary: { status: 'processed' }, summaryPath: '/p1' } as never];
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('1 run');
    expect(el.shadowRoot!.textContent).not.toContain('1 runs');
    el.remove();
  });

  it('initializes expanded state from defaultExpanded property', async () => {
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.hasAttribute('expanded')).toBe(true);
    el.remove();
  });

  it('toggles expanded state when header is clicked', async () => {
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.defaultExpanded = false;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.hasAttribute('expanded')).toBe(false);

    const header = el.shadowRoot!.querySelector<HTMLElement>('.header')!;
    header.click();
    await el.updateComplete;
    expect(el.hasAttribute('expanded')).toBe(true);
    el.remove();
  });

  it('renders pinflow-run-card per run when expanded', async () => {
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.runs = Array.from({ length: 3 }, (_, i) => ({
      runId: `r${i}`,
      summary: { status: 'processed' },
      summaryPath: `/p${i}`,
    })) as never[];
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('pinflow-run-card').length).toBe(3);
    el.remove();
  });

  it('shows inline empty-state when no runs', async () => {
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.runs = [];
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No runs yet');
    el.remove();
  });

  it('shows active dot when isActive', async () => {
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.isActive = true;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.active-dot')).not.toBeNull();
    el.remove();
  });
});
```

Run: `corepack pnpm nx test pinflow-vscode -- pinflow-folder-section`. Expected: PASS, 7 tests.

- [ ] **Step 3: Refactor `pinflow-runs-app.ts`**

```ts
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import path from 'node:path';  // NOTE: this only works at build-time via Vite; for browser runtime use a string fallback
import './pinflow-runs-header.js';
import './pinflow-empty-state.js';
import './pinflow-folder-section.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

// In-browser path-basename helper since node:path isn't available at runtime:
function basename(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx >= 0 ? p.slice(idx + 1) : p;
}

@customElement('pinflow-runs-app')
export class PinflowRunsApp extends LitElement {
  @property({ attribute: false }) runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>> = {};
  @property({ attribute: false }) activeFolder?: string;
  @property({ attribute: false }) settings: RunsWebviewSettings = { timeFormat: '24h' };

  static styles = css`
    :host {
      display: block;
      padding: 0 0 16px;
    }
  `;

  render() {
    const folderPaths = Object.keys(this.runsByFolder);
    if (folderPaths.length === 0) {
      return html`<pinflow-empty-state></pinflow-empty-state>`;
    }
    const totalRuns = Object.values(this.runsByFolder).reduce(
      (sum, runs) => sum + runs.length,
      0,
    );
    return html`
      <pinflow-runs-header .count=${totalRuns}></pinflow-runs-header>
      ${repeat(
        folderPaths,
        (folder) => folder,
        (folder) => html`
          <pinflow-folder-section
            .folderPath=${folder}
            .displayName=${basename(folder)}
            .runs=${this.runsByFolder[folder] ?? []}
            .timeFormat=${this.settings.timeFormat}
            .defaultExpanded=${folder === this.activeFolder}
            .isActive=${folder === this.activeFolder}
          ></pinflow-folder-section>
        `,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-runs-app': PinflowRunsApp;
  }
}
```

- [ ] **Step 4: Update `pinflow-runs-app.spec.ts` tests**

Modify the existing tests to use the new `runsByFolder` shape:

```ts
it('renders empty-state when runsByFolder is empty', async () => {
  const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
  el.runsByFolder = {};
  document.body.appendChild(el);
  await el.updateComplete;
  expect(el.shadowRoot!.querySelector('pinflow-empty-state')).not.toBeNull();
  el.remove();
});

it('renders one folder-section per folder', async () => {
  const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
  el.runsByFolder = {
    '/folder/a': [{ runId: 'r1', summary: { status: 'processed' }, summaryPath: '/p1' } as never],
    '/folder/b': [{ runId: 'r2', summary: { status: 'failed' }, summaryPath: '/p2' } as never],
  };
  el.activeFolder = '/folder/a';
  document.body.appendChild(el);
  await el.updateComplete;
  const sections = el.shadowRoot!.querySelectorAll('pinflow-folder-section');
  expect(sections.length).toBe(2);
  el.remove();
});

it('marks the activeFolder section as default-expanded and isActive', async () => {
  const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
  el.runsByFolder = {
    '/folder/a': [],
    '/folder/b': [],
  };
  el.activeFolder = '/folder/b';
  document.body.appendChild(el);
  await el.updateComplete;
  const sections = el.shadowRoot!.querySelectorAll('pinflow-folder-section');
  const activeSection = Array.from(sections).find(
    (s) => (s as PinflowFolderSection).folderPath === '/folder/b',
  ) as PinflowFolderSection;
  expect(activeSection.isActive).toBe(true);
  expect(activeSection.defaultExpanded).toBe(true);
  el.remove();
});

it('renders 5 folders × 80 runs each without throwing (stress test)', async () => {
  const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
  const runsByFolder: Record<string, readonly PinFlowRunEvidence[]> = {};
  for (let f = 0; f < 5; f++) {
    runsByFolder[`/folder/${f}`] = Array.from({ length: 80 }, (_, i) => ({
      runId: `f${f}-r${i}`,
      summary: { status: 'processed' },
      summaryPath: `/folder/${f}/p${i}`,
    })) as never[];
  }
  el.runsByFolder = runsByFolder;
  document.body.appendChild(el);
  await el.updateComplete;
  expect(el.shadowRoot!.querySelectorAll('pinflow-folder-section').length).toBe(5);
  el.remove();
});
```

- [ ] **Step 5: Update `main.ts` to handle new payload shape**

In `runs-webview/main.ts`:

```ts
window.addEventListener('message', (event) => {
  if (!isExtToWebviewMessage(event.data)) return;
  const data = event.data;
  if (data.type === 'webview:init-ack') {
    (app as any).runsByFolder = data.runsByFolder;
    (app as any).activeFolder = data.activeFolder;
    (app as any).settings = data.settings;
  } else if (data.type === 'runs:update') {
    (app as any).runsByFolder = data.runsByFolder;
    (app as any).activeFolder = data.activeFolder;
  } else if (data.type === 'settings:update') {
    (app as any).settings = data.settings;
  }
});
```

- [ ] **Step 6: Run tests + build**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx run pinflow-vscode:build:webview
corepack pnpm nx lint pinflow-vscode
```

Expected: 132 tests passing (118 + 7 folder-section + 4 runs-app modifications net), bundle still under 150 KB.

- [ ] **Step 7: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/
git commit -m "feat(vscode): refactor runs-webview into per-folder sections"
```

---

## Phase 5 — Status-View Folder Grouping

### Task 5: `status-view-model.ts` + `StatusTreeDataProvider` refactor

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.ts`
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`
- Modify: `packages/pinflow-vscode/src/extension.ts`

- [ ] **Step 1: Add `buildStatusFolderGroups` + tests**

In `status-view-model.spec.ts`, add new tests for the folder-group builder:

```ts
describe('buildStatusFolderGroups', () => {
  it('returns empty array for no folders', () => {
    expect(buildStatusFolderGroups([], { activeFolder: undefined })).toEqual([]);
  });

  it('returns one group per folder with the existing 4 status rows', () => {
    const groups = buildStatusFolderGroups(
      [{ folder: '/a', status: readyStatus(), runs: [] }],
      { activeFolder: '/a' },
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].children.map((c) => c.id)).toEqual([
      'relay', 'runner', 'workspace', 'preview',
    ]);
  });

  it('marks isActive=true only for the active folder', () => {
    const groups = buildStatusFolderGroups(
      [
        { folder: '/a', status: readyStatus(), runs: [] },
        { folder: '/b', status: readyStatus(), runs: [] },
      ],
      { activeFolder: '/b' },
    );
    expect(groups.find((g) => g.id === '/a')?.isActive).toBe(false);
    expect(groups.find((g) => g.id === '/b')?.isActive).toBe(true);
  });

  it('reflects runCount in the group header', () => {
    const groups = buildStatusFolderGroups(
      [{ folder: '/a', status: readyStatus(), runs: [{} as never, {} as never, {} as never] }],
      { activeFolder: '/a' },
    );
    expect(groups[0].runCount).toBe(3);
  });
});
```

- [ ] **Step 2: Implement `buildStatusFolderGroups`**

Add to `status-view-model.ts`:

```ts
import type { PerFolderState } from '../multi-folder-state.js';
import path from 'node:path';

export interface StatusFolderGroup {
  readonly id: string;
  readonly displayName: string;
  readonly runCount: number;
  readonly isActive: boolean;
  readonly children: readonly StatusViewItem[];
}

export interface BuildStatusFolderGroupsOptions {
  readonly activeFolder?: string;
  readonly externalClaim?: ExternalHandoffClaim | null;
}

export function buildStatusFolderGroups(
  folders: readonly PerFolderState[],
  options: BuildStatusFolderGroupsOptions = {},
): readonly StatusFolderGroup[] {
  return folders.map((state) => ({
    id: state.folder,
    displayName: path.basename(state.folder),
    runCount: state.runs.length,
    isActive: state.folder === options.activeFolder,
    children: buildStatusViewItems(
      state.status,
      options.externalClaim ?? null,
      state.runs[0] ?? null,
    ),
  }));
}
```

- [ ] **Step 3: Refactor `StatusTreeDataProvider` in `extension.ts`**

```ts
type StatusTreeNode = StatusFolderGroup | StatusViewItem;

class StatusTreeDataProvider implements vscode.TreeDataProvider<StatusTreeNode> {
  private readonly emitter = new vscode.EventEmitter<StatusTreeNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private groups: readonly StatusFolderGroup[] = [];
  private lastSignature: string = '';

  setFolderGroups(groups: readonly StatusFolderGroup[]): void {
    const signature = computeStatusSignature(groups);
    if (signature === this.lastSignature) return;  // no-op refresh: preserve user expansion state
    this.lastSignature = signature;
    this.groups = groups;
    this.emitter.fire(undefined);
  }

  getTreeItem(element: StatusTreeNode): vscode.TreeItem {
    if ('children' in element) {
      // Folder group
      const item = new vscode.TreeItem(
        element.displayName,
        element.isActive
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = `folder:${element.id}`;
      item.description = `${element.runCount} run${element.runCount === 1 ? '' : 's'}`;
      item.iconPath = new vscode.ThemeIcon('folder');
      return item;
    }
    // Existing leaf-status-row logic from 3B-1
    // ... (preserve existing TreeItem-creation code from 3B-1)
  }

  getChildren(element?: StatusTreeNode): readonly StatusTreeNode[] {
    if (!element) return this.groups;
    if ('children' in element) return element.children;
    return [];
  }
}

function computeStatusSignature(groups: readonly StatusFolderGroup[]): string {
  return groups
    .map((g) => `${g.id}:${g.runCount}:${g.isActive ? '1' : '0'}:${g.children.map((c) => `${c.id}:${c.description ?? ''}`).join(',')}`)
    .join('|');
}
```

- [ ] **Step 4: Run tests + build**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx build pinflow-vscode
corepack pnpm nx lint pinflow-vscode
```

Existing single-folder tests in `status-view-model.spec.ts` still pass because `buildStatusViewItems` keeps its original signature. New folder-group tests are additive.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/status-view-model.ts \
        packages/pinflow-vscode/src/core/views/status-view-model.spec.ts \
        packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): group status-view rows by folder with collapsible Akkordeon"
```

---

## Phase 6 — Actions-View Folder Grouping

### Task 6: `actions-view-model.ts` + per-folder commands

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/actions-view-model.ts`
- Modify: `packages/pinflow-vscode/src/core/views/actions-view-model.spec.ts`
- Modify: `packages/pinflow-vscode/src/extension.ts`

- [ ] **Step 1: Add `buildActionFolderGroups` + tests**

Tests in `actions-view-model.spec.ts`:

```ts
describe('buildActionFolderGroups', () => {
  it('returns one group per folder with the existing actions', () => {
    const groups = buildActionFolderGroups(
      [{ folder: '/a', status: readyStatus(), runs: [] }],
      null,
      '/a',
    );
    expect(groups).toHaveLength(1);
    const ids = groups[0].children.map((c) => c.id);
    expect(ids).toContain('start-workflow');
    expect(ids).toContain('follow-runs');
    expect(ids).toContain('open-latest-run');
  });

  it('action commands include the folderPath argument', () => {
    const groups = buildActionFolderGroups(
      [{ folder: '/a', status: readyStatus(), runs: [] }],
      null,
      '/a',
    );
    const startWorkflow = groups[0].children.find((c) => c.id === 'start-workflow');
    expect(startWorkflow?.commandArguments).toEqual(['/a']);
  });

  it('includes the global externalClaim row only on the active folder group when claim is set', () => {
    const claim: ExternalHandoffClaim = {
      annotationId: 'ann_x',
      promptPath: '/tmp/p',
      runDir: '/tmp',
      provider: 'codex',
    };
    const groups = buildActionFolderGroups(
      [
        { folder: '/a', status: readyStatus(), runs: [] },
        { folder: '/b', status: readyStatus(), runs: [] },
      ],
      claim,
      '/a',
    );
    const aClaimRow = groups.find((g) => g.id === '/a')!.children.find((c) => c.id === 'external-claim');
    const bClaimRow = groups.find((g) => g.id === '/b')!.children.find((c) => c.id === 'external-claim');
    expect(aClaimRow).toBeDefined();
    expect(bClaimRow).toBeUndefined();
  });
});
```

- [ ] **Step 2: Implement `buildActionFolderGroups` + extend `ActionsViewItem`**

Extend `ActionsViewItem` to carry optional `commandArguments`. Add `buildActionFolderGroups` that wraps `buildActionsViewItems` per folder, populating `commandArguments` with the folder path for per-folder commands.

- [ ] **Step 3: Refactor command handlers in `extension.ts`**

```ts
vscode.commands.registerCommand('pinflow.startWorkflow', (folderPath?: string) => {
  const targetFolder = folderPath ?? getCurrentWorkspace()?.commandRoot;
  if (!targetFolder) {
    void vscode.window.showInformationMessage('Open a configured PinFlow workspace first.');
    return;
  }
  startStandardWorkflow(
    targetFolder,
    (name, cwd) => vscode.window.createTerminal({ name, cwd }),
    targetFolder,  // appRoot
  );
}),

vscode.commands.registerCommand('pinflow.followRuns', (folderPath?: string) => {
  // similar pattern
}),

vscode.commands.registerCommand('pinflow.openLatestRun', async (folderPath?: string) => {
  // similar pattern
}),
```

The Tree-View Action items pass their folder via `arguments` field on the `command` object, picked up by VS Code's `executeCommand(...args)`.

- [ ] **Step 4: Refactor `ActionsTreeDataProvider` to be 2-level**

Same pattern as `StatusTreeDataProvider`: top-level returns folder-groups, children return action items.

- [ ] **Step 5: Run tests + build + commit**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx build pinflow-vscode
git add packages/pinflow-vscode/src/core/views/actions-view-model.ts \
        packages/pinflow-vscode/src/core/views/actions-view-model.spec.ts \
        packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): group actions by folder with per-folder command routing"
```

---

## Phase 7 — `extension.ts` `refreshAll` Refactor + Auto-Browser

### Task 7: Wire everything together in `refreshAll`

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

- [ ] **Step 1: Replace state declarations**

Replace `let latestRunEvidence: readonly PinFlowRunEvidence[] = []` with `let trackedFolders: readonly PerFolderState[] = []`.

Add `const openedDevUrls = new Map<string, Set<string>>();` and `const lastSeenDevUrls = new Map<string, string>();` at module level (replacing the old single-folder Set/string from Phase A).

- [ ] **Step 2: Refactor `refreshAll`**

Replace existing logic with the orchestration described in the spec section "extension.ts.refreshAll refactor":

```ts
async function refreshAll(): Promise<void> {
  const workspaceFolders = getWorkspaceFolders();
  // ... empty-folders early return unchanged ...

  const config = vscode.workspace.getConfiguration('pinflow');
  const preferredFolder = config.get<string>('workspace.preferredFolder', '');

  const candidates = expandToCandidateFolders(workspaceFolders);
  if (candidates.length === 0) {
    void vscode.commands.executeCommand('setContext', 'pinflow.notConfigured', true);
    statusProvider.setFolderGroups([]);
    runsWebviewProvider.postRuns({ runsByFolder: {}, activeFolder: undefined });
    actionsProvider.setFolderGroups([]);
    return;
  }
  void vscode.commands.executeCommand('setContext', 'pinflow.notConfigured', false);

  const folderStates = await Promise.all(
    candidates.map((folder) => buildPerFolderState(folder, { preferredFolder })),
  );
  trackedFolders = folderStates;

  const activeFolder = pickActiveFolder(folderStates, preferredFolder);

  const runsByFolder: Record<string, readonly PinFlowRunEvidence[]> = {};
  for (const state of folderStates) {
    runsByFolder[state.folder] = state.runs;
  }

  statusProvider.setFolderGroups(
    buildStatusFolderGroups(folderStates, { activeFolder, externalClaim }),
  );
  runsWebviewProvider.postRuns({ runsByFolder, activeFolder });
  actionsProvider.setFolderGroups(
    buildActionFolderGroups(folderStates, externalClaim, activeFolder),
  );

  // Status bar (single-line summary) — show active folder's status:
  const activeState = folderStates.find((s) => s.folder === activeFolder);
  if (activeState) {
    statusItem.text = formatStatusText(activeState.status.status);
    statusItem.tooltip = activeState.status.message;
    statusItem.show();
  }

  // Failed-run notifications + first-run toast — per folder:
  for (const state of folderStates) {
    notifyFailedRunsForFolder(state, config);
    maybeFireFirstRunToast(state, context);
  }

  // Auto-browser — per folder:
  for (const state of folderStates) {
    handleAutoBrowserForFolder(state, config);
  }
}
```

- [ ] **Step 3: Extract per-folder helpers**

Extract `notifyFailedRunsForFolder`, `maybeFireFirstRunToast`, `handleAutoBrowserForFolder` as helper functions inside `activate` (closure over context) or as top-level functions taking explicit dependencies.

The auto-browser helper:

```ts
function handleAutoBrowserForFolder(
  state: PerFolderState,
  config: vscode.WorkspaceConfiguration,
): void {
  const currentUrl = state.status.devServer?.url;
  const lastSeen = lastSeenDevUrls.get(state.folder);

  if (lastSeen && lastSeen !== currentUrl) {
    openedDevUrls.get(state.folder)?.delete(lastSeen);
  }
  if (currentUrl) {
    lastSeenDevUrls.set(state.folder, currentUrl);
  } else {
    lastSeenDevUrls.delete(state.folder);
    return;
  }

  const autoOpen = config.get<boolean>('preview.autoOpen', true);
  if (!autoOpen) return;

  const folderUrls = openedDevUrls.get(state.folder) ?? new Set<string>();
  if (folderUrls.has(currentUrl)) return;
  folderUrls.add(currentUrl);
  openedDevUrls.set(state.folder, folderUrls);

  try {
    void vscode.env.openExternal(vscode.Uri.parse(currentUrl));
  } catch {
    // Malformed URL — silent
  }
}
```

- [ ] **Step 4: Wire workspace-folder-removal cleanup**

Modify the existing `vscode.workspace.onDidChangeWorkspaceFolders` listener:

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

- [ ] **Step 5: Run full quality gate**

```bash
corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode,pinflow-relay
corepack pnpm nx run pinflow-vscode:build:webview
```

All green. Test count: ~132.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): refactor refreshAll for parallel multi-folder tracking"
```

---

## Phase 8 — End-to-End Verification

### Task 8: Build VSIX + manual smoke test

**Files:** none

- [ ] **Step 1: Rebuild VSIX**

```bash
corepack pnpm --filter pinflow-vscode package:vsix
```

- [ ] **Step 2: Install in fresh VS Code window**

Reload after install.

- [ ] **Step 3: Smoke test 1 — Multi-folder Akkordeon**

Open multi-root workspace with 2-3 folders, ≥2 with `.pinflow/`. Click PinFlow Activity-Bar icon. Verify:
- Status section shows folder-groups, active expanded, others collapsed with run-count
- Runs section (Webview) shows folder-sections, active expanded
- Actions section shows folder-groups with per-folder action items

- [ ] **Step 4: Smoke test 2 — Per-folder Start Workflow**

Click "Start Workflow" inside Folder-A's group → terminal opens at A's path. Click same action in Folder-B → separate terminal at B. Both run concurrently.

- [ ] **Step 5: Smoke test 3 — Auto-browser per folder**

With both `pinflow dev` running for A and B, confirm two browser tabs open (different localhost ports).

- [ ] **Step 6: Smoke test 4 — User-expansion preserved across refresh**

Manually expand a collapsed folder. Wait 2-3 refresh ticks (~6-9s). Confirm the folder stays expanded.

- [ ] **Step 7: Smoke test 5 — Folder removal cleans state**

Right-click a folder in Explorer → "Remove from Workspace". Confirm the folder's group disappears from PinFlow within 3 seconds.

- [ ] **Step 8: Smoke test 6 — Failed-run + first-run-toast per folder**

Trigger a failed run in A. Confirm toast for A. Trigger one in B. Confirm separate toast for B.

- [ ] **Step 9: Smoke test 7 — Stress (5 folders × 50 runs)**

Set up workspace with 5 PinFlow folders, each with ~50 runs. Verify:
- All 5 folder-groups appear
- Active folder is expanded with cards visible
- Other folders collapsed with run-counts
- UI stays responsive when scrolling, expanding/collapsing

- [ ] **Step 10: Smoke test 8 — No regression**

Confirm 3A's `viewsWelcome` still appears for completely empty workspace. Confirm Phase A's walkthrough still appears on first install. Confirm Phase A's `pinflow.switchFolder` still works as a focus-changer.

- [ ] **Step 11: Final clean-state check**

```bash
git -C /home/domi/eventbaer/dev/pinflow status --porcelain
# expected: empty
git -C /home/domi/eventbaer/dev/pinflow log --oneline 5fddac3..HEAD
# expected: ~7 implementation commits
```

- [ ] **Step 12: No push, no marketplace publish until user approval**

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

All eight green. Then run manual smoke test.

---

## Expected end-state summary

- **pinflow-vscode tests:** 118 → ~132 (+14 net new across multi-folder-state (8), folder-section (7), provider/spec/runs-app (-1 modifications net))
- **pinflow-relay:** unchanged (421)
- **VSIX bundle:** ~205 KB (slight increase from new Lit component + multi-folder logic, ~2 KB)
- **No new commands** (existing `pinflow.startWorkflow` etc. now optionally accept `folderPath`)
- **No new settings**
- **No breaking changes** to user-facing manifest contributions
- **Webview message protocol BROKEN-CHANGE** (`runs` → `runsByFolder`) — both ends ship together, no compat shim needed
