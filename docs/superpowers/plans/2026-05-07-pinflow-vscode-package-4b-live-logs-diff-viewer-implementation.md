# PinFlow VS Code Extension — 4B Live Logs + Diff Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "open three file tabs" pattern with editor-native run visibility — expand a run card in the sidebar to see the live agent transcript, click a changed file to open VS Code's native diff editor.

**Architecture:** Add a `LiveTranscriptWatcher` (single instance per provider) that wraps a `FileSystemWatcher` for the expanded run's `transcript.log` and `diff.patch`. Webview-side, port the folder-section accordion pattern to `pinflow-runs-app` so a single `activeRunId` drives expand/collapse across all folders, with the active run's data prop-drilled into the corresponding card. New `pinflow-run-detail` Lit component renders the transcript pane and changed-files list inline. Diff opens via `vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title)` using the built-in git extension's `git:` URI scheme as the "before" side; falls back to `showTextDocument` if git is unavailable.

**Tech Stack:** TypeScript / Lit web components / vitest + happy-dom / VS Code Extension API (`FileSystemWatcher`, `commands.executeCommand`, `Uri.parse`).

**Spec:** `docs/superpowers/specs/2026-05-07-pinflow-vscode-package-4b-design.md`

**Branch:** `feat/4b-live-logs-diff-viewer` (already created)

---

## Execution Notes

- All tasks are scoped to `packages/pinflow-vscode/` — no other packages change.
- The branch was branched from `main` after PRs #13/#14/#15 merged, so `dist/extension.cjs` is the bundle output (esbuild) and tests run via vitest with workspace-source `@pinflow/core` aliasing.
- Run `corepack pnpm nx test pinflow-vscode` for unit tests; `corepack pnpm nx lint pinflow-vscode` for lint; `corepack pnpm nx build pinflow-vscode` for the bundle.
- After every task, the corresponding test command must pass before committing.
- Commit message style matches recent commits: lowercase imperative, `feat(vscode): ...` or `test(vscode): ...` scope prefix.

## File Map (final state)

### Created

| File | Purpose |
|---|---|
| `packages/pinflow-vscode/src/core/live-transcript-watcher.ts` | Wraps `FileSystemWatcher` for one run's transcript + diff; emits typed events |
| `packages/pinflow-vscode/src/core/live-transcript-watcher.spec.ts` | Unit tests for the watcher |
| `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-detail.ts` | Lit component: transcript `<pre>` + changed-files list + prompt button |
| `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-detail.spec.ts` | Unit tests for the detail component |

### Modified

| File | Change |
|---|---|
| `packages/pinflow-vscode/src/core/run-evidence.ts` | Export `parseDiff` so the watcher can re-parse on `diff.patch` change |
| `packages/pinflow-vscode/src/core/views/runs-webview-messages.ts` | Three new `ExtToWebview` + three new `WebviewToExt` message types + type-guard updates |
| `packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts` | Tests for new type guards |
| `packages/pinflow-vscode/src/core/views/runs-webview-provider.ts` | Watcher slot + handle `run:expand` / `run:collapse` / `run:open-diff` |
| `packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts` | Tests for the new message handlers |
| `packages/pinflow-vscode/src/extension.ts` | Pass output channel into provider deps (already created in 4F) |
| `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.ts` | New `isExpanded` / `liveTranscript` / `liveChangedFiles` props; conditional `<pinflow-run-detail>` render |
| `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.spec.ts` | Tests for expanded rendering |
| `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.ts` | Forward `activeRunId` / `liveTranscript` / `liveChangedFiles` into each run card |
| `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.spec.ts` | Tests for forwarding |
| `packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.ts` | Accordion authority — `activeRunId` state + persistence + transition events |
| `packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.spec.ts` | Tests for accordion behaviour |
| `packages/pinflow-vscode/src/runs-webview/main.ts` | Dispatch new message types from extension; forward new component events to extension |

---

## Task 1: Extend webview message protocol

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-messages.ts`
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts`

The new messages thread three concerns:
1. Webview asks ext to "watch this run" (`run:expand`) or "stop watching" (`run:collapse`).
2. Webview asks ext to open a diff for one changed file (`run:open-diff`).
3. Ext sends transcript bytes (`transcript:initial`, `transcript:append`) and re-parsed diff metadata (`diff:update`) back.

- [ ] **Step 1: Read the existing file to confirm current shape**

```bash
cat packages/pinflow-vscode/src/core/views/runs-webview-messages.ts
```

Confirm `ExtToWebviewMessage` is a discriminated union with three current variants and `WebviewToExtMessage` has four; both have type-guard functions `isExtToWebviewMessage` and `isWebviewToExtMessage`.

- [ ] **Step 2: Add the three new `WebviewToExtMessage` types**

In `runs-webview-messages.ts`, replace the `WebviewToExtMessage` union with:

```ts
export type WebviewToExtMessage =
  | { readonly type: 'webview:ready' }
  | { readonly type: 'webview:run-init'; readonly folder: string }
  | { readonly type: 'run:open-prompt'; readonly runId: string }
  | { readonly type: 'run:open-evidence-file'; readonly filePath: string }
  | { readonly type: 'run:expand'; readonly runId: string }
  | { readonly type: 'run:collapse'; readonly runId: string }
  | { readonly type: 'run:open-diff'; readonly runId: string; readonly filePath: string };
```

- [ ] **Step 3: Add the three new `ExtToWebviewMessage` types**

Replace the `ExtToWebviewMessage` union with:

```ts
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
    }
  | {
      readonly type: 'settings:update';
      readonly settings: RunsWebviewSettings;
    }
  | {
      readonly type: 'transcript:initial';
      readonly runId: string;
      readonly text: string;
      readonly isLive: boolean;
    }
  | {
      readonly type: 'transcript:append';
      readonly runId: string;
      readonly delta: string;
    }
  | {
      readonly type: 'diff:update';
      readonly runId: string;
      readonly changedFiles: readonly PinFlowChangedFile[];
    };
```

Also add the import for `PinFlowChangedFile` at the top:

```ts
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../run-evidence.js';
```

- [ ] **Step 4: Extend `isExtToWebviewMessage` to validate the new variants**

Add three branches to the function (after the existing `settings:update` branch, before the final `return false`):

```ts
  if (type === 'transcript:initial') {
    return (
      typeof value['runId'] === 'string' &&
      typeof value['text'] === 'string' &&
      typeof value['isLive'] === 'boolean'
    );
  }
  if (type === 'transcript:append') {
    return (
      typeof value['runId'] === 'string' &&
      typeof value['delta'] === 'string'
    );
  }
  if (type === 'diff:update') {
    return (
      typeof value['runId'] === 'string' &&
      Array.isArray(value['changedFiles'])
    );
  }
```

- [ ] **Step 5: Extend `isWebviewToExtMessage` to validate the new variants**

Add three branches before the final `return false`:

```ts
  if (type === 'run:expand') return typeof value['runId'] === 'string';
  if (type === 'run:collapse') return typeof value['runId'] === 'string';
  if (type === 'run:open-diff') {
    return (
      typeof value['runId'] === 'string' &&
      typeof value['filePath'] === 'string'
    );
  }
```

- [ ] **Step 6: Add tests for the new variants in `runs-webview-messages.spec.ts`**

Append to the file:

```ts
describe('isExtToWebviewMessage — 4B additions', () => {
  it('accepts transcript:initial with runId, text, isLive', () => {
    expect(
      isExtToWebviewMessage({
        type: 'transcript:initial',
        runId: 'r_1',
        text: 'hello',
        isLive: true,
      }),
    ).toBe(true);
  });

  it('rejects transcript:initial without isLive flag', () => {
    expect(
      isExtToWebviewMessage({
        type: 'transcript:initial',
        runId: 'r_1',
        text: 'hello',
      }),
    ).toBe(false);
  });

  it('accepts transcript:append with runId and delta', () => {
    expect(
      isExtToWebviewMessage({ type: 'transcript:append', runId: 'r_1', delta: 'next' }),
    ).toBe(true);
  });

  it('accepts diff:update with array changedFiles', () => {
    expect(
      isExtToWebviewMessage({ type: 'diff:update', runId: 'r_1', changedFiles: [] }),
    ).toBe(true);
  });

  it('rejects diff:update with non-array changedFiles', () => {
    expect(
      isExtToWebviewMessage({ type: 'diff:update', runId: 'r_1', changedFiles: {} }),
    ).toBe(false);
  });
});

describe('isWebviewToExtMessage — 4B additions', () => {
  it('accepts run:expand with runId', () => {
    expect(isWebviewToExtMessage({ type: 'run:expand', runId: 'r_1' })).toBe(true);
  });

  it('accepts run:collapse with runId', () => {
    expect(isWebviewToExtMessage({ type: 'run:collapse', runId: 'r_1' })).toBe(true);
  });

  it('accepts run:open-diff with runId and filePath', () => {
    expect(
      isWebviewToExtMessage({
        type: 'run:open-diff',
        runId: 'r_1',
        filePath: 'src/foo.ts',
      }),
    ).toBe(true);
  });

  it('rejects run:open-diff without filePath', () => {
    expect(
      isWebviewToExtMessage({ type: 'run:open-diff', runId: 'r_1' }),
    ).toBe(false);
  });
});
```

- [ ] **Step 7: Run tests and confirm all pass**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=runs-webview-messages
```

Expected: 5 + 4 = 9 new tests pass; existing passes unchanged.

- [ ] **Step 8: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/runs-webview-messages.ts packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts
git commit -m "feat(vscode): extend webview protocol with run:expand/collapse/open-diff + transcript+diff updates"
```

---

## Task 2: Export `parseDiff` from `run-evidence.ts`

**Files:**
- Modify: `packages/pinflow-vscode/src/core/run-evidence.ts`

The watcher needs to re-parse `diff.patch` when it changes. The existing `parseDiff` is already correct — just not exported.

- [ ] **Step 1: Change `function parseDiff` to `export function parseDiff`**

In `run-evidence.ts`, find the line:

```ts
function parseDiff(diff: string): {
```

Replace with:

```ts
export function parseDiff(diff: string): {
```

(Same body, just adding `export`.)

- [ ] **Step 2: Run all run-evidence tests to confirm no regressions**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=run-evidence
```

Expected: All existing tests continue to pass.

- [ ] **Step 3: Commit**

```bash
git add packages/pinflow-vscode/src/core/run-evidence.ts
git commit -m "refactor(vscode): export parseDiff for reuse by live transcript watcher"
```

---

## Task 3: `LiveTranscriptWatcher` class

**Files:**
- Create: `packages/pinflow-vscode/src/core/live-transcript-watcher.ts`
- Create: `packages/pinflow-vscode/src/core/live-transcript-watcher.spec.ts`

This class is the single seam between "a run's files on disk" and "events the webview can render". No knowledge of webview message types — emits internal events; the provider translates.

- [ ] **Step 1: Write the failing test (initial read emits transcript:initial)**

Create `packages/pinflow-vscode/src/core/live-transcript-watcher.spec.ts`:

```ts
import { mkdir, mkdtemp, rm, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

import {
  createFileSystemWatcher,
  workspace as workspaceStub,
} from '../__test-utils__/vscode-stub.js';

vi.mock('vscode', async () => import('../__test-utils__/vscode-stub.js'));

import { LiveTranscriptWatcher, type TranscriptEvent } from './live-transcript-watcher.js';
import type { PinFlowRunEvidence } from './run-evidence.js';

async function tmpRun(): Promise<{ dir: string; transcript: string; diff: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'pinflow-watcher-'));
  return {
    dir,
    transcript: path.join(dir, 'transcript.log'),
    diff: path.join(dir, 'diff.patch'),
  };
}

function makeEvidence(transcript: string, diff: string): PinFlowRunEvidence {
  return {
    annotationId: 'ann_1',
    runId: 'r_1',
    summary: { status: 'processed' },
    summaryPath: '/repo/.pinflow/runs/r_1/summary.json',
    promptPath: null,
    transcriptPath: transcript,
    diffPath: diff,
    hasDiff: false,
    changedFiles: [],
    additions: 0,
    deletions: 0,
  };
}

describe('LiveTranscriptWatcher', () => {
  it('emits transcript:initial on construction with full file content', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, 'first line\nsecond line\n');
    await writeFile(diff, '');
    const events: TranscriptEvent[] = [];

    // Act
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;

    // Assert
    expect(events.find((e) => e.type === 'transcript:initial')).toMatchObject({
      type: 'transcript:initial',
      runId: 'r_1',
      text: 'first line\nsecond line\n',
      isLive: false,
    });

    // Cleanup
    watcher.dispose();
    await rm(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run the test — verify it fails with "module not found"**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=live-transcript-watcher
```

Expected: Failure with "Cannot find module './live-transcript-watcher.js'".

- [ ] **Step 3: Create the watcher with minimum logic to pass the first test**

Create `packages/pinflow-vscode/src/core/live-transcript-watcher.ts`:

```ts
import { readFile, stat } from 'node:fs/promises';
import * as vscode from 'vscode';

import { parseDiff, type PinFlowChangedFile, type PinFlowRunEvidence } from './run-evidence.js';

export type TranscriptEvent =
  | { readonly type: 'transcript:initial'; readonly runId: string; readonly text: string; readonly isLive: boolean }
  | { readonly type: 'transcript:append'; readonly runId: string; readonly delta: string }
  | { readonly type: 'diff:update'; readonly runId: string; readonly changedFiles: readonly PinFlowChangedFile[] };

export class LiveTranscriptWatcher {
  private disposed = false;
  private lastReadByteOffset = 0;
  private readonly watchers: vscode.Disposable[] = [];

  /** Resolves once the initial read + watcher setup is complete. */
  readonly ready: Promise<void>;

  constructor(
    private readonly evidence: PinFlowRunEvidence,
    private readonly emit: (event: TranscriptEvent) => void,
  ) {
    this.ready = this.start();
  }

  private get runId(): string {
    return this.evidence.runId ?? this.evidence.summaryPath;
  }

  private get isLive(): boolean {
    return this.evidence.summary?.status === 'processing';
  }

  private async start(): Promise<void> {
    if (this.evidence.transcriptPath) {
      await this.emitInitialTranscript();
      this.attachTranscriptWatcher(this.evidence.transcriptPath);
    } else {
      // No transcript path yet — emit empty initial so webview clears any stale state.
      this.emit({ type: 'transcript:initial', runId: this.runId, text: '', isLive: this.isLive });
    }
    if (this.evidence.diffPath) {
      this.attachDiffWatcher(this.evidence.diffPath);
    }
  }

  private async emitInitialTranscript(): Promise<void> {
    const filePath = this.evidence.transcriptPath;
    if (!filePath) return;
    let text = '';
    try {
      text = await readFile(filePath, 'utf8');
    } catch {
      // File does not exist yet — emit empty and let the watcher pick up creation.
    }
    this.lastReadByteOffset = Buffer.byteLength(text, 'utf8');
    if (this.disposed) return;
    this.emit({ type: 'transcript:initial', runId: this.runId, text, isLive: this.isLive });
  }

  private attachTranscriptWatcher(filePath: string): void {
    const watcher = vscode.workspace.createFileSystemWatcher(filePath);
    const onChange = () => void this.handleTranscriptChange(filePath);
    this.watchers.push(
      watcher.onDidChange(onChange),
      watcher.onDidCreate(onChange),
      watcher,
    );
  }

  private attachDiffWatcher(filePath: string): void {
    const watcher = vscode.workspace.createFileSystemWatcher(filePath);
    const onChange = () => void this.handleDiffChange(filePath);
    this.watchers.push(
      watcher.onDidChange(onChange),
      watcher.onDidCreate(onChange),
      watcher.onDidDelete(() => {
        if (this.disposed) return;
        this.emit({ type: 'diff:update', runId: this.runId, changedFiles: [] });
      }),
      watcher,
    );
  }

  private async handleTranscriptChange(filePath: string): Promise<void> {
    if (this.disposed) return;
    let size: number;
    try {
      size = (await stat(filePath)).size;
    } catch {
      return;
    }
    if (size < this.lastReadByteOffset) {
      // File shrank (truncation/rewrite) — re-emit initial so webview replaces buffer.
      await this.emitInitialTranscript();
      return;
    }
    if (size === this.lastReadByteOffset) return;
    let buffer: string;
    try {
      const fullText = await readFile(filePath, 'utf8');
      buffer = fullText.slice(this.lastReadByteOffset);
    } catch {
      return;
    }
    this.lastReadByteOffset = size;
    if (this.disposed) return;
    this.emit({ type: 'transcript:append', runId: this.runId, delta: buffer });
  }

  private async handleDiffChange(filePath: string): Promise<void> {
    if (this.disposed) return;
    let diffText = '';
    try {
      diffText = await readFile(filePath, 'utf8');
    } catch {
      // Treat missing file as empty diff.
    }
    if (this.disposed) return;
    const parsed = parseDiff(diffText);
    this.emit({ type: 'diff:update', runId: this.runId, changedFiles: parsed.changedFiles });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const w of this.watchers) {
      try { w.dispose(); } catch { /* ignore */ }
    }
    this.watchers.length = 0;
  }
}
```

- [ ] **Step 4: Run the first test — verify it passes**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=live-transcript-watcher
```

Expected: 1 test passes.

- [ ] **Step 5: Add tests for append, shrink-as-fresh-initial, diff-update, dispose**

Append to `live-transcript-watcher.spec.ts`:

```ts
describe('LiveTranscriptWatcher — append behaviour', () => {
  it('emits transcript:append with delta when file grows', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, 'a\n');
    await writeFile(diff, '');
    const events: TranscriptEvent[] = [];
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;
    events.length = 0;

    // Act — grow the file and call the change handler manually via the
    // watcher's internal API (in unit tests we don't have a real VS Code
    // FileSystemWatcher firing; we drive change detection by exposing a
    // private method via a small reflection seam).
    await appendFile(transcript, 'b\n');
    // The unit-test stub of vscode.workspace.createFileSystemWatcher returns
    // a stub that exposes `triggerChange()`. Use it.
    workspaceStub.__triggerChange?.(transcript);
    // Allow async readers to drain.
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'transcript:append',
        runId: 'r_1',
        delta: 'b\n',
      }),
    );

    // Cleanup
    watcher.dispose();
    await rm(dir, { recursive: true, force: true });
  });

  it('emits a fresh transcript:initial (not append) when file shrinks', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, 'long content here\n');
    await writeFile(diff, '');
    const events: TranscriptEvent[] = [];
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;
    events.length = 0;

    // Act — replace with shorter content
    await writeFile(transcript, 'tiny\n');
    workspaceStub.__triggerChange?.(transcript);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    const initial = events.find((e) => e.type === 'transcript:initial');
    expect(initial).toMatchObject({ type: 'transcript:initial', text: 'tiny\n' });
    expect(events.find((e) => e.type === 'transcript:append')).toBeUndefined();

    // Cleanup
    watcher.dispose();
    await rm(dir, { recursive: true, force: true });
  });
});

describe('LiveTranscriptWatcher — diff updates', () => {
  it('re-parses diff and emits diff:update on diff.patch change', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, '');
    await writeFile(
      diff,
      'diff --git a/src/foo.ts b/src/foo.ts\n--- a/src/foo.ts\n+++ b/src/foo.ts\n+added\n',
    );
    const events: TranscriptEvent[] = [];
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;
    events.length = 0;

    // Act
    workspaceStub.__triggerChange?.(diff);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    const diffEvent = events.find((e) => e.type === 'diff:update');
    expect(diffEvent).toMatchObject({
      type: 'diff:update',
      runId: 'r_1',
      changedFiles: [{ path: 'src/foo.ts' }],
    });

    // Cleanup
    watcher.dispose();
    await rm(dir, { recursive: true, force: true });
  });
});

describe('LiveTranscriptWatcher — disposal', () => {
  it('ignores subsequent change events after dispose', async () => {
    // Arrange
    const { dir, transcript, diff } = await tmpRun();
    await writeFile(transcript, 'a');
    await writeFile(diff, '');
    const events: TranscriptEvent[] = [];
    const watcher = new LiveTranscriptWatcher(makeEvidence(transcript, diff), (e) =>
      events.push(e),
    );
    await watcher.ready;

    // Act
    watcher.dispose();
    events.length = 0;
    await appendFile(transcript, 'b');
    workspaceStub.__triggerChange?.(transcript);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(events).toEqual([]);

    // Cleanup
    await rm(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 6: Update the `vscode-stub.ts` to support `__triggerChange`**

In `packages/pinflow-vscode/src/__test-utils__/vscode-stub.ts`, add to the `workspace` export (or create one if not present):

```ts
type ChangeHandler = () => void;
const watcherHandlers = new Map<string, { change: ChangeHandler[]; create: ChangeHandler[]; delete: ChangeHandler[] }>();

export function createFileSystemWatcher(globPattern: string) {
  const slot = { change: [] as ChangeHandler[], create: [] as ChangeHandler[], delete: [] as ChangeHandler[] };
  watcherHandlers.set(globPattern, slot);
  return {
    onDidChange: (l: ChangeHandler) => {
      slot.change.push(l);
      return { dispose: () => { slot.change = slot.change.filter((h) => h !== l); } };
    },
    onDidCreate: (l: ChangeHandler) => {
      slot.create.push(l);
      return { dispose: () => { slot.create = slot.create.filter((h) => h !== l); } };
    },
    onDidDelete: (l: ChangeHandler) => {
      slot.delete.push(l);
      return { dispose: () => { slot.delete = slot.delete.filter((h) => h !== l); } };
    },
    dispose: () => { watcherHandlers.delete(globPattern); },
  };
}

export const workspace = {
  createFileSystemWatcher,
  __triggerChange: (filePath: string) => {
    const slot = watcherHandlers.get(filePath);
    if (!slot) return;
    for (const h of slot.change) h();
  },
  __triggerCreate: (filePath: string) => {
    const slot = watcherHandlers.get(filePath);
    if (!slot) return;
    for (const h of slot.create) h();
  },
  __triggerDelete: (filePath: string) => {
    const slot = watcherHandlers.get(filePath);
    if (!slot) return;
    for (const h of slot.delete) h();
  },
};
```

If `workspace` already exists in `vscode-stub.ts`, merge the new fields into it instead of redeclaring.

- [ ] **Step 7: Run all watcher tests — verify all 4 pass**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=live-transcript-watcher
```

Expected: 4 tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/pinflow-vscode/src/core/live-transcript-watcher.ts packages/pinflow-vscode/src/core/live-transcript-watcher.spec.ts packages/pinflow-vscode/src/__test-utils__/vscode-stub.ts
git commit -m "feat(vscode): add LiveTranscriptWatcher for run transcript+diff streaming"
```

---

## Task 4: Wire the watcher into `RunsWebviewProvider`

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-provider.ts`
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts`

The provider holds at most one watcher; `run:expand` constructs it, `run:collapse` disposes it, switching runs disposes the old before constructing the new.

- [ ] **Step 1: Add a watcher slot field and a helper `findRun(runId)` to the provider**

In `runs-webview-provider.ts`, add the import at the top (alongside the existing imports):

```ts
import { LiveTranscriptWatcher, type TranscriptEvent } from '../live-transcript-watcher.js';
```

Inside the `RunsWebviewProvider` class body, add after the existing `private webviewView` field:

```ts
  private activeWatcher: LiveTranscriptWatcher | null = null;
  private activeRunId: string | null = null;
```

And add a private helper method (place near the bottom of the class, before `buildHtml`):

```ts
  private findRun(runId: string): PinFlowRunEvidence | undefined {
    const snapshot = this.deps.getCurrentSnapshot();
    for (const runs of Object.values(snapshot.runsByFolder)) {
      const match = runs.find((r) => r.runId === runId);
      if (match) return match;
    }
    return undefined;
  }

  private disposeActiveWatcher(): void {
    this.activeWatcher?.dispose();
    this.activeWatcher = null;
    this.activeRunId = null;
  }

  private startWatcher(evidence: PinFlowRunEvidence): void {
    this.disposeActiveWatcher();
    this.activeRunId = evidence.runId ?? null;
    this.activeWatcher = new LiveTranscriptWatcher(evidence, (event) => {
      this.forwardEvent(event);
    });
  }

  private forwardEvent(event: TranscriptEvent): void {
    if (!this.webviewView) return;
    void this.webviewView.webview.postMessage(event);
  }
```

- [ ] **Step 2: Handle the new message types in `onDidReceiveMessage`**

Inside the existing `webviewView.webview.onDidReceiveMessage` callback, after the `run:open-prompt` block, add:

```ts
      if (message.type === 'run:expand') {
        const evidence = this.findRun(message.runId);
        if (!evidence) return;
        this.startWatcher(evidence);
        return;
      }
      if (message.type === 'run:collapse') {
        if (this.activeRunId === message.runId) {
          this.disposeActiveWatcher();
        }
        return;
      }
      if (message.type === 'run:open-diff') {
        // Wired in Task 5 — for now, no-op to keep the protocol valid.
        return;
      }
```

- [ ] **Step 3: Dispose watcher on view disposal**

Find the existing `webviewView.onDidDispose` handler and extend it:

```ts
    webviewView.onDidDispose(() => {
      this.disposeActiveWatcher();
      this.webviewView = null;
    });
```

- [ ] **Step 4: Add tests for expand/collapse/switch**

In `runs-webview-provider.spec.ts`, append:

```ts
import { LiveTranscriptWatcher } from '../live-transcript-watcher.js';

describe('RunsWebviewProvider — 4B run:expand/collapse', () => {
  it('creates a watcher when run:expand arrives for a known run', () => {
    // Arrange
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({
        runsByFolder: { '/repo': [sampleRun] },
        folderStatuses: { '/repo': 'configured' },
      }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined }, { isCancellationRequested: false });

    // Act
    wb.sendFromWebview({ type: 'run:expand', runId: 'r_1' });

    // Assert — provider should have an active watcher and the webview should
    // have received transcript:initial (after the watcher's async ready
    // resolves on the next microtask).
    expect((provider as unknown as { activeRunId: string | null }).activeRunId).toBe('r_1');
  });

  it('disposes the watcher on run:collapse', async () => {
    // Arrange
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({
        runsByFolder: { '/repo': [sampleRun] },
        folderStatuses: { '/repo': 'configured' },
      }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined }, { isCancellationRequested: false });
    wb.sendFromWebview({ type: 'run:expand', runId: 'r_1' });
    expect((provider as unknown as { activeRunId: string | null }).activeRunId).toBe('r_1');

    // Act
    wb.sendFromWebview({ type: 'run:collapse', runId: 'r_1' });

    // Assert
    expect((provider as unknown as { activeRunId: string | null }).activeRunId).toBeNull();
  });

  it('disposes the old watcher when switching to a different run', () => {
    // Arrange
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({
        runsByFolder: { '/repo': [sampleRun, sampleRun2] },
        folderStatuses: { '/repo': 'configured' },
      }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined }, { isCancellationRequested: false });

    // Act
    wb.sendFromWebview({ type: 'run:expand', runId: 'r_1' });
    const firstWatcher = (provider as unknown as { activeWatcher: LiveTranscriptWatcher | null }).activeWatcher;
    wb.sendFromWebview({ type: 'run:expand', runId: 'r_2' });
    const secondWatcher = (provider as unknown as { activeWatcher: LiveTranscriptWatcher | null }).activeWatcher;

    // Assert
    expect(firstWatcher).not.toBeNull();
    expect(secondWatcher).not.toBeNull();
    expect(firstWatcher).not.toBe(secondWatcher);
    expect((provider as unknown as { activeRunId: string | null }).activeRunId).toBe('r_2');
  });
});
```

- [ ] **Step 5: Run provider tests — verify 3 new tests pass**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=runs-webview-provider
```

Expected: 3 new tests pass; existing tests unchanged.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/runs-webview-provider.ts packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts
git commit -m "feat(vscode): wire LiveTranscriptWatcher into RunsWebviewProvider for run:expand/collapse"
```

---

## Task 5: Wire `vscode.diff` for `run:open-diff` with fallback

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-provider.ts`
- Modify: `packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts`
- Modify: `packages/pinflow-vscode/src/extension.ts`

The provider receives `run:open-diff`, resolves the run's `appRoot` from evidence, builds the workspace + git URIs, calls `vscode.diff()`. On failure, falls back to `showTextDocument` and logs to the output channel created in 4F.

- [ ] **Step 1: Extend `RunsWebviewProviderDeps` with the output channel**

In `runs-webview-provider.ts`, modify the `RunsWebviewProviderDeps` interface:

```ts
export interface RunsWebviewProviderDeps {
  readonly extensionUri: vscode.Uri;
  readonly onOpenPrompt: (run: PinFlowRunEvidence) => void;
  readonly getCurrentSnapshot: () => RunsSnapshot;
  readonly getCurrentSettings: () => RunsWebviewSettings;
  readonly outputChannel: vscode.OutputChannel;
}
```

- [ ] **Step 2: Replace the no-op `run:open-diff` handler with the diff command**

Replace the `run:open-diff` block from Task 4 with:

```ts
      if (message.type === 'run:open-diff') {
        void this.openDiff(message.runId, message.filePath);
        return;
      }
```

And add the new private method (next to the other private helpers):

```ts
  private async openDiff(runId: string, filePath: string): Promise<void> {
    const evidence = this.findRun(runId);
    if (!evidence) return;
    const appRoot = evidence.summary.runDir
      ? // appRoot is available on the workspace status, but for diff we
        // resolve relative to the run's recorded summary directory.
        evidence.summary.runDir
      : null;

    // Resolve absolute file path against the run's app root if it was
    // recorded as relative; otherwise treat the diff path as workspace-
    // relative and let VS Code resolve from the workspace.
    const snapshot = this.deps.getCurrentSnapshot();
    const folderRoot = Object.entries(snapshot.runsByFolder).find(([, runs]) =>
      runs.some((r) => r.runId === runId),
    )?.[0];
    if (!folderRoot) return;
    const path = await import('node:path');
    const absoluteFile = path.isAbsolute(filePath)
      ? filePath
      : path.join(folderRoot, filePath);
    const fileUri = vscode.Uri.file(absoluteFile);
    const gitUri = vscode.Uri.parse(
      'git:' +
        absoluteFile +
        '?' +
        encodeURIComponent(JSON.stringify({ path: absoluteFile, ref: 'HEAD' })),
    );
    const title = `${path.basename(absoluteFile)} (HEAD ↔ working tree) — ${runId}`;
    try {
      await vscode.commands.executeCommand('vscode.diff', gitUri, fileUri, title);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.deps.outputChannel.appendLine(
        `[run:open-diff] vscode.diff failed for ${absoluteFile}: ${message}`,
      );
      this.deps.outputChannel.appendLine(
        '[run:open-diff] Falling back to showTextDocument.',
      );
      try {
        await vscode.window.showTextDocument(fileUri);
        await vscode.window.showInformationMessage(
          `Opened ${path.basename(absoluteFile)} (diff view unavailable in this workspace).`,
        );
      } catch (fallbackError) {
        const fbMessage =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        this.deps.outputChannel.appendLine(
          `[run:open-diff] Fallback showTextDocument also failed: ${fbMessage}`,
        );
      }
    }
  }
```

- [ ] **Step 3: Update `extension.ts` to pass the output channel into provider deps**

In `packages/pinflow-vscode/src/extension.ts`, locate the `new RunsWebviewProvider({ ... })` call. Add `outputChannel,` to the deps object — the variable is already in scope from the 4F wiring at the top of `activateInternal`.

Replace the existing object-literal:

```ts
  const runsWebviewProvider = new RunsWebviewProvider({
    extensionUri: context.extensionUri,
    getCurrentSnapshot: () => ({ ... }),
    getCurrentSettings: readRunsWebviewSettings,
    onOpenPrompt: (run) => { ... },
  });
```

With (preserving the body of `getCurrentSnapshot` and `onOpenPrompt`):

```ts
  const runsWebviewProvider = new RunsWebviewProvider({
    extensionUri: context.extensionUri,
    outputChannel,
    getCurrentSnapshot: () => ({
      runsByFolder: Object.fromEntries(
        trackedFolders.map((s) => [s.folder, s.runs] as const),
      ),
      folderStatuses: Object.fromEntries(
        trackedFolders.map((s) => [
          s.folder,
          (s.status.status === 'not-configured' ? 'not-configured' : 'configured') satisfies FolderStatus,
        ] as const),
      ),
      activeFolder,
    }),
    getCurrentSettings: readRunsWebviewSettings,
    onOpenPrompt: (run) => {
      if (run.promptPath) {
        void vscode.commands.executeCommand(
          'pinflow.openEvidenceFile',
          run.promptPath,
        );
      }
    },
  });
```

- [ ] **Step 4: Add a test that `run:open-diff` calls `vscode.commands.executeCommand('vscode.diff', ...)`**

In `runs-webview-provider.spec.ts`, append:

```ts
describe('RunsWebviewProvider — 4B run:open-diff', () => {
  it('calls vscode.diff with git: left, file: right URIs', async () => {
    // Arrange
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const outputChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    };
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      outputChannel: outputChannel as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({
        runsByFolder: { '/repo': [sampleRun] },
        folderStatuses: { '/repo': 'configured' },
      }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined }, { isCancellationRequested: false });

    // Reset the executeCommand mock.
    vsCodeCommands.executeCommand.mockClear();

    // Act
    wb.sendFromWebview({
      type: 'run:open-diff',
      runId: 'r_1',
      filePath: 'src/foo.ts',
    });

    // Allow the promise chain to drain.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(vsCodeCommands.executeCommand).toHaveBeenCalledWith(
      'vscode.diff',
      expect.objectContaining({ toString: expect.any(Function) }),
      expect.objectContaining({ toString: expect.any(Function) }),
      expect.stringContaining('foo.ts'),
    );
  });

  it('falls back to showTextDocument and logs when vscode.diff throws', async () => {
    // Arrange
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const outputChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    };
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      outputChannel: outputChannel as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({
        runsByFolder: { '/repo': [sampleRun] },
        folderStatuses: { '/repo': 'configured' },
      }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined }, { isCancellationRequested: false });

    vsCodeCommands.executeCommand.mockRejectedValueOnce(new Error('git provider unavailable'));

    // Act
    wb.sendFromWebview({
      type: 'run:open-diff',
      runId: 'r_1',
      filePath: 'src/foo.ts',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(outputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('vscode.diff failed'),
    );
  });
});
```

- [ ] **Step 5: Run provider tests — verify the new tests pass**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=runs-webview-provider
```

Expected: 2 new tests pass; existing tests unchanged.

- [ ] **Step 6: Run the manifest spec to verify no regression from extension.ts changes**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=extension-manifest
```

Expected: All existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/runs-webview-provider.ts packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): open native diff editor on run:open-diff with showTextDocument fallback"
```

---

## Task 6: `pinflow-run-detail` Lit component

**Files:**
- Create: `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-detail.ts`
- Create: `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-detail.spec.ts`

The detail component is presentation-only: receives data via props, emits user-action events as custom events. Sticky-bottom-autoscroll lives here.

- [ ] **Step 1: Write the first failing test (renders transcript text)**

Create `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-detail.spec.ts`:

```ts
import './pinflow-run-detail.js';
import { PinflowRunDetail } from './pinflow-run-detail.js';
import type { PinFlowChangedFile } from '../../core/run-evidence.js';

function makeChangedFiles(): PinFlowChangedFile[] {
  return [
    { path: 'src/foo.ts' },
    { path: 'src/bar.ts' },
  ];
}

describe('<pinflow-run-detail>', () => {
  it('renders transcript text in a monospace <pre>', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.runId = 'r_1';
    el.transcriptText = 'line 1\nline 2\n';
    el.changedFiles = [];
    el.promptPath = '/repo/.pinflow/runs/r_1/prompt.md';
    el.isLive = false;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const pre = el.shadowRoot!.querySelector('pre.transcript');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toContain('line 1');
    expect(pre!.textContent).toContain('line 2');

    el.remove();
  });
});
```

- [ ] **Step 2: Run — verify failure (module not found)**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=pinflow-run-detail
```

Expected: Failure with "Cannot find module './pinflow-run-detail.js'".

- [ ] **Step 3: Implement the minimum component**

Create `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-detail.ts`:

```ts
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { PinFlowChangedFile } from '../../core/run-evidence.js';

const STICKY_BOTTOM_THRESHOLD_PX = 32;

@customElement('pinflow-run-detail')
export class PinflowRunDetail extends LitElement {
  @property({ attribute: false }) runId = '';
  @property({ attribute: false }) transcriptText = '';
  @property({ attribute: false }) changedFiles: readonly PinFlowChangedFile[] = [];
  @property({ attribute: false }) promptPath: string | null = null;
  @property({ type: Boolean }) isLive = false;

  private wasAtBottom = true;

  static styles = css`
    :host {
      display: block;
      padding: 8px 12px 12px;
      border-top: 1px solid var(--pf-border);
      background: var(--pf-bg-elevated, transparent);
      font-family: var(--vscode-font-family);
      font-size: 12px;
    }
    .transcript {
      max-height: 240px;
      overflow-y: auto;
      margin: 0 0 12px;
      padding: 8px 10px;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #d4d4d4);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      border-radius: 2px;
    }
    .transcript:empty::before {
      content: 'Waiting for transcript output…';
      color: var(--pf-text-muted);
      font-style: italic;
    }
    .files-header {
      font-size: 11px;
      color: var(--pf-text-muted);
      margin-bottom: 4px;
    }
    ul.files {
      list-style: none;
      padding: 0;
      margin: 0 0 12px;
    }
    li.file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 6px;
      cursor: pointer;
      border-radius: 2px;
    }
    li.file:hover {
      background: var(--pf-bg-elevated);
    }
    li.file .icon {
      font-family: codicon;
      color: var(--pf-text-muted);
    }
    li.file .path {
      flex: 1;
      color: var(--pf-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .action {
      padding: 3px 10px;
      background: transparent;
      color: var(--pf-text);
      border: 1px solid var(--pf-border);
      border-radius: 2px;
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
    }
    .action:hover {
      background: var(--pf-bg-elevated);
    }
  `;

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('transcriptText')) {
      const pre = this.shadowRoot?.querySelector<HTMLPreElement>('pre.transcript');
      if (!pre) return;
      // Apply sticky-bottom: only autoscroll if the user was within
      // STICKY_BOTTOM_THRESHOLD_PX of the bottom before the update.
      if (this.wasAtBottom) {
        pre.scrollTop = pre.scrollHeight;
      }
    }
  }

  private handleScroll = (event: Event): void => {
    const pre = event.target as HTMLPreElement;
    const distanceFromBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight;
    this.wasAtBottom = distanceFromBottom <= STICKY_BOTTOM_THRESHOLD_PX;
  };

  private handleFileClick(filePath: string): void {
    this.dispatchEvent(
      new CustomEvent('pinflow-detail:open-diff', {
        detail: { runId: this.runId, filePath },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handlePromptClick = (): void => {
    this.dispatchEvent(
      new CustomEvent('pinflow-detail:open-prompt', {
        detail: { runId: this.runId },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private handleTranscriptClick = (): void => {
    this.dispatchEvent(
      new CustomEvent('pinflow-detail:open-transcript', {
        detail: { runId: this.runId },
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    return html`
      <pre class="transcript" @scroll=${this.handleScroll}>${this.transcriptText}</pre>
      <div class="files-header">
        Changed files (${this.changedFiles.length})${this.isLive ? ' · live' : ''}
      </div>
      <ul class="files">
        ${repeat(
          this.changedFiles,
          (f) => f.path,
          (f) => html`
            <li class="file" @click=${() => this.handleFileClick(f.path)}>
              <i class="codicon codicon-diff" aria-hidden="true"></i>
              <span class="path">${f.path}</span>
            </li>
          `,
        )}
      </ul>
      <div class="actions">
        ${this.promptPath
          ? html`<button class="action" @click=${this.handlePromptClick} type="button">Open prompt</button>`
          : null}
        <button class="action" @click=${this.handleTranscriptClick} type="button">Open transcript in editor</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-run-detail': PinflowRunDetail;
  }
}
```

- [ ] **Step 4: Run the first test — verify it passes**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=pinflow-run-detail
```

Expected: 1 test passes.

- [ ] **Step 5: Add tests for sticky-bottom + event emission**

Append to `pinflow-run-detail.spec.ts`:

```ts
describe('<pinflow-run-detail> — sticky-bottom autoscroll', () => {
  it('autoscrolls to bottom on first transcript update', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.runId = 'r_1';
    el.transcriptText = '';
    el.changedFiles = [];
    el.promptPath = null;
    document.body.appendChild(el);
    await el.updateComplete;

    // Act
    el.transcriptText = 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nl\n';
    await el.updateComplete;

    // Assert — pre's scrollTop should be > 0 OR scrollHeight === clientHeight
    // (when content fits, no scrolling needed; either is "at bottom")
    const pre = el.shadowRoot!.querySelector<HTMLPreElement>('pre.transcript')!;
    const atBottom =
      pre.scrollHeight - pre.scrollTop - pre.clientHeight <= 32;
    expect(atBottom).toBe(true);

    el.remove();
  });

  it('does NOT autoscroll when user has scrolled up', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.runId = 'r_1';
    el.transcriptText = 'long\n'.repeat(100);
    el.changedFiles = [];
    el.promptPath = null;
    document.body.appendChild(el);
    await el.updateComplete;

    const pre = el.shadowRoot!.querySelector<HTMLPreElement>('pre.transcript')!;

    // Simulate user scrolling up: set scrollTop and dispatch scroll event.
    pre.scrollTop = 0;
    pre.dispatchEvent(new Event('scroll'));

    // Act — append more transcript
    el.transcriptText += 'more\n'.repeat(50);
    await el.updateComplete;

    // Assert — scrollTop remains at 0 (user's choice respected)
    expect(pre.scrollTop).toBe(0);

    el.remove();
  });
});

describe('<pinflow-run-detail> — events', () => {
  it('emits pinflow-detail:open-diff when a file row is clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.runId = 'r_1';
    el.transcriptText = '';
    el.changedFiles = makeChangedFiles();
    el.promptPath = null;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: Array<CustomEvent<{ runId: string; filePath: string }>> = [];
    el.addEventListener('pinflow-detail:open-diff', (e) =>
      events.push(e as CustomEvent<{ runId: string; filePath: string }>),
    );

    // Act
    const firstRow = el.shadowRoot!.querySelector<HTMLLIElement>('li.file')!;
    firstRow.click();

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ runId: 'r_1', filePath: 'src/foo.ts' });

    el.remove();
  });

  it('emits pinflow-detail:open-prompt when prompt button is clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.runId = 'r_1';
    el.transcriptText = '';
    el.changedFiles = [];
    el.promptPath = '/repo/prompt.md';
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('pinflow-detail:open-prompt', (e) =>
      events.push(e as CustomEvent),
    );

    // Act
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>(
      'button.action',
    )!;
    button.click();

    // Assert
    expect(events).toHaveLength(1);
    expect((events[0].detail as { runId: string }).runId).toBe('r_1');

    el.remove();
  });
});
```

- [ ] **Step 6: Run all detail-component tests — verify all pass**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=pinflow-run-detail
```

Expected: 5 tests pass.

- [ ] **Step 7: Register the new component in the webview entrypoint**

In `packages/pinflow-vscode/src/runs-webview/main.ts`, add a side-effect import near the existing component imports at the top:

```ts
import './components/pinflow-run-detail.js';
```

(Place alongside the other component imports — no other change needed in main.ts yet; the dispatch wiring lands in Task 9.)

- [ ] **Step 8: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/components/pinflow-run-detail.ts packages/pinflow-vscode/src/runs-webview/components/pinflow-run-detail.spec.ts packages/pinflow-vscode/src/runs-webview/main.ts
git commit -m "feat(vscode): add pinflow-run-detail Lit component for inline transcript + diff list"
```

---

## Task 7: `pinflow-run-card` — `isExpanded` prop + conditional detail render

**Files:**
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.spec.ts`

The card stays a presentation component. New props are pass-through.

- [ ] **Step 1: Add the new properties + import the detail component**

In `pinflow-run-card.ts`, add the import near the top:

```ts
import './pinflow-run-detail.js';
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../../core/run-evidence.js';
```

(Replace the existing single-name import — `PinFlowRunEvidence` — with the multi-name import above.)

Add new property declarations inside the class, after the existing `index` property:

```ts
  @property({ type: Boolean, attribute: false }) isExpanded = false;
  @property({ attribute: false }) liveTranscript = '';
  @property({ attribute: false }) liveChangedFiles: readonly PinFlowChangedFile[] | null = null;
```

- [ ] **Step 2: Render the detail component conditionally**

Replace the existing `render()` method body's return value with:

```ts
  render() {
    const label = this.run?.annotationId ?? this.run?.runId ?? 'unknown';
    const summary = this.run?.summary?.label ?? '';
    const pillState = mapStatusToPillState(this.run?.summary?.status);
    const changedFiles = this.liveChangedFiles ?? this.run?.changedFiles ?? [];
    const isLive = this.run?.summary?.status === 'processing';
    return html`
      <div
        class="card"
        @click=${this.handleClick}
      >
        <div class="header">
          <span class="annotation-id">${label}</span>
          <span class="header-divider"></span>
          <span class="time">${this.formatTime()}</span>
        </div>
        ${summary
          ? html`<div class="summary">${summary}</div>`
          : html`<div class="summary">&nbsp;</div>`}
        <div class="footer">
          <pinflow-lifecycle-pill .state=${pillState}></pinflow-lifecycle-pill>
        </div>
        ${this.isExpanded
          ? html`<pinflow-run-detail
              @click=${(e: Event) => e.stopPropagation()}
              .runId=${this.run?.runId ?? ''}
              .transcriptText=${this.liveTranscript}
              .changedFiles=${changedFiles}
              .promptPath=${this.run?.promptPath ?? null}
              .isLive=${isLive}
            ></pinflow-run-detail>`
          : null}
      </div>
    `;
  }
```

The `@click=${(e: Event) => e.stopPropagation()}` on the detail element prevents clicks inside the detail from bubbling up and re-triggering the card's collapse.

- [ ] **Step 3: Add tests for expanded rendering**

Append to `pinflow-run-card.spec.ts`:

```ts
describe('<pinflow-run-card> — 4B expanded state', () => {
  it('does not render <pinflow-run-detail> when isExpanded is false (default)', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun();

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('pinflow-run-detail')).toBeNull();
    el.remove();
  });

  it('renders <pinflow-run-detail> when isExpanded is true and forwards props', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({
      runId: 'r_42',
      changedFiles: [{ path: 'src/foo.ts' }],
      promptPath: '/repo/prompt.md',
    });
    el.isExpanded = true;
    el.liveTranscript = 'streaming...';
    el.liveChangedFiles = [{ path: 'src/bar.ts' }];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const detail = el.shadowRoot!.querySelector(
      'pinflow-run-detail',
    ) as (HTMLElement & {
      runId: string;
      transcriptText: string;
      changedFiles: readonly { path: string }[];
      promptPath: string | null;
    }) | null;
    expect(detail).not.toBeNull();
    expect(detail!.runId).toBe('r_42');
    expect(detail!.transcriptText).toBe('streaming...');
    // Live changed-files override the run's static list.
    expect(detail!.changedFiles).toEqual([{ path: 'src/bar.ts' }]);
    expect(detail!.promptPath).toBe('/repo/prompt.md');
    el.remove();
  });

  it('falls back to run.changedFiles when liveChangedFiles is null', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({
      changedFiles: [{ path: 'src/static.ts' }],
    });
    el.isExpanded = true;
    el.liveChangedFiles = null;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const detail = el.shadowRoot!.querySelector(
      'pinflow-run-detail',
    ) as (HTMLElement & { changedFiles: readonly { path: string }[] }) | null;
    expect(detail!.changedFiles).toEqual([{ path: 'src/static.ts' }]);
    el.remove();
  });

  it('still emits pinflow-card:click on outer card click when expanded', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ runId: 'r_clicked' });
    el.isExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: Array<CustomEvent<{ runId: string }>> = [];
    el.addEventListener('pinflow-card:click', (e) =>
      events.push(e as CustomEvent<{ runId: string }>),
    );

    // Act
    el.shadowRoot!
      .querySelector<HTMLElement>('.card')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail.runId).toBe('r_clicked');
    el.remove();
  });
});
```

- [ ] **Step 4: Run run-card tests — verify all pass**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=pinflow-run-card
```

Expected: existing + 4 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.ts packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.spec.ts
git commit -m "feat(vscode): pinflow-run-card renders pinflow-run-detail when isExpanded"
```

---

## Task 8: `pinflow-folder-section` — forward accordion data to cards

**Files:**
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.spec.ts`

The folder-section receives the active-run data and forwards it. Cards that aren't the active run get neutral defaults.

- [ ] **Step 1: Add new properties to the class**

In `pinflow-folder-section.ts`, add the import:

```ts
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../../core/run-evidence.js';
```

Add the new properties to the class (after the existing `isActive` property):

```ts
  @property({ attribute: false }) activeRunId: string | null = null;
  @property({ attribute: false }) liveTranscript = '';
  @property({ attribute: false }) liveChangedFiles: readonly PinFlowChangedFile[] | null = null;
```

- [ ] **Step 2: Pass the new props down to each `<pinflow-run-card>` it renders**

In the `render()` method, replace the existing `<pinflow-run-card .run= ... .timeFormat= ... .index= ...>` block with:

```ts
                    (run, index) => html`
                      <pinflow-run-card
                        .run=${run}
                        .timeFormat=${this.timeFormat}
                        .index=${index}
                        .isExpanded=${run.runId === this.activeRunId}
                        .liveTranscript=${run.runId === this.activeRunId ? this.liveTranscript : ''}
                        .liveChangedFiles=${run.runId === this.activeRunId ? this.liveChangedFiles : null}
                      ></pinflow-run-card>
                    `,
```

- [ ] **Step 3: Add tests for the new forwarding**

In `pinflow-folder-section.spec.ts`, append:

```ts
describe('<pinflow-folder-section> — 4B accordion forwarding', () => {
  it('marks only the matching card as expanded and forwards live data', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.folderPath = '/repo';
    el.displayName = 'repo';
    el.runs = [
      { runId: 'r_1', summaryPath: '/p1', summary: { status: 'processed' }, changedFiles: [] } as never,
      { runId: 'r_2', summaryPath: '/p2', summary: { status: 'processing' }, changedFiles: [] } as never,
    ];
    el.folderStatus = 'configured';
    el.defaultExpanded = true;
    el.activeRunId = 'r_2';
    el.liveTranscript = 'live!';
    el.liveChangedFiles = [{ path: 'src/x.ts' }];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const cards = Array.from(
      el.shadowRoot!.querySelectorAll('pinflow-run-card'),
    ) as Array<HTMLElement & {
      isExpanded: boolean;
      liveTranscript: string;
      liveChangedFiles: readonly { path: string }[] | null;
    }>;
    expect(cards.length).toBe(2);
    expect(cards[0].isExpanded).toBe(false);
    expect(cards[0].liveTranscript).toBe('');
    expect(cards[0].liveChangedFiles).toBeNull();
    expect(cards[1].isExpanded).toBe(true);
    expect(cards[1].liveTranscript).toBe('live!');
    expect(cards[1].liveChangedFiles).toEqual([{ path: 'src/x.ts' }]);
    el.remove();
  });
});
```

- [ ] **Step 4: Run folder-section tests — verify pass**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=pinflow-folder-section
```

Expected: existing + 1 new test pass.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.ts packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.spec.ts
git commit -m "feat(vscode): forward activeRunId + live transcript/diff data to run cards"
```

---

## Task 9: `pinflow-runs-app` — accordion authority + persistence + transition events

**Files:**
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.ts`
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.spec.ts`

The app component owns the single source of truth for which run is active. It listens for card clicks bubbling up, decides expand/collapse, persists the choice, and emits transition events that `main.ts` translates to `postMessage`.

- [ ] **Step 1: Add state fields and new lifecycle**

In `pinflow-runs-app.ts`, add the import:

```ts
import { state } from 'lit/decorators.js';
import type { PinFlowChangedFile } from '../../core/run-evidence.js';
```

(Merge `state` import into the existing `lit/decorators.js` import line.)

Add the new state fields and a constructor for localStorage init (place after existing `@property` declarations):

```ts
  @state() private activeRunId: string | null = null;
  @state() private liveTranscript = '';
  @state() private liveChangedFiles: readonly PinFlowChangedFile[] | null = null;

  private static readonly ACTIVE_RUN_STORAGE_KEY = 'pinflow.runs.activeRunId';

  connectedCallback(): void {
    super.connectedCallback();
    try {
      const stored = window.localStorage.getItem(PinflowRunsApp.ACTIVE_RUN_STORAGE_KEY);
      if (stored) this.activeRunId = stored;
    } catch {
      // localStorage may be unavailable; ignore.
    }
    this.addEventListener('pinflow-card:click', this.handleCardClick as EventListener);
  }

  disconnectedCallback(): void {
    this.removeEventListener('pinflow-card:click', this.handleCardClick as EventListener);
    super.disconnectedCallback();
  }
```

Add the new `handleCardClick` private method (place near the bottom of the class, before `render()`):

```ts
  private handleCardClick = (event: CustomEvent<{ runId: string }>): void => {
    const clickedRunId = event.detail.runId;
    const previous = this.activeRunId;
    if (previous === clickedRunId) {
      this.activeRunId = null;
      this.liveTranscript = '';
      this.liveChangedFiles = null;
      this.persistActiveRunId(null);
      this.emitTransition({ type: 'collapse', runId: clickedRunId });
      return;
    }
    this.activeRunId = clickedRunId;
    this.liveTranscript = '';
    this.liveChangedFiles = null;
    this.persistActiveRunId(clickedRunId);
    if (previous) {
      this.emitTransition({ type: 'collapse', runId: previous });
    }
    this.emitTransition({ type: 'expand', runId: clickedRunId });
  };

  private persistActiveRunId(runId: string | null): void {
    try {
      if (runId) {
        window.localStorage.setItem(PinflowRunsApp.ACTIVE_RUN_STORAGE_KEY, runId);
      } else {
        window.localStorage.removeItem(PinflowRunsApp.ACTIVE_RUN_STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable; ignore.
    }
  }

  private emitTransition(detail: { type: 'expand' | 'collapse'; runId: string }): void {
    this.dispatchEvent(
      new CustomEvent('pinflow-runs:active-change', {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Public method called by main.ts when a transcript:initial / append arrives. */
  applyTranscriptInitial(runId: string, text: string): void {
    if (this.activeRunId !== runId) return;
    this.liveTranscript = text;
  }

  applyTranscriptAppend(runId: string, delta: string): void {
    if (this.activeRunId !== runId) return;
    this.liveTranscript = this.liveTranscript + delta;
  }

  applyDiffUpdate(runId: string, files: readonly PinFlowChangedFile[]): void {
    if (this.activeRunId !== runId) return;
    this.liveChangedFiles = files;
  }
```

- [ ] **Step 2: Forward the active state into each `<pinflow-folder-section>`**

In the `render()` method, replace the existing folder-section block to add the three new bindings:

```ts
            <pinflow-folder-section
              .folderPath=${folder}
              .displayName=${basename(folder)}
              .runs=${this.runsByFolder[folder] ?? []}
              .folderStatus=${this.folderStatuses[folder] ?? 'configured'}
              .timeFormat=${this.settings.timeFormat}
              .defaultExpanded=${folder === this.activeFolder}
              .isActive=${folder === this.activeFolder}
              .activeRunId=${this.activeRunId}
              .liveTranscript=${this.liveTranscript}
              .liveChangedFiles=${this.liveChangedFiles}
            ></pinflow-folder-section>
```

- [ ] **Step 3: Add tests for accordion behaviour**

Append to `pinflow-runs-app.spec.ts`:

```ts
describe('<pinflow-runs-app> — 4B accordion authority', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('emits pinflow-runs:active-change with type=expand on first card click', async () => {
    // Arrange
    const app = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    app.runsByFolder = { '/repo': [{ runId: 'r_1', summaryPath: '/p1' } as never] };
    document.body.appendChild(app);
    await app.updateComplete;

    const events: Array<CustomEvent<{ type: string; runId: string }>> = [];
    app.addEventListener('pinflow-runs:active-change', (e) =>
      events.push(e as CustomEvent<{ type: string; runId: string }>),
    );

    // Act
    app.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_1' },
        bubbles: true,
        composed: true,
      }),
    );
    await app.updateComplete;

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ type: 'expand', runId: 'r_1' });
    app.remove();
  });

  it('emits expand-then-collapse when switching active runs', async () => {
    // Arrange
    const app = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    app.runsByFolder = {
      '/repo': [
        { runId: 'r_1', summaryPath: '/p1' } as never,
        { runId: 'r_2', summaryPath: '/p2' } as never,
      ],
    };
    document.body.appendChild(app);
    await app.updateComplete;

    const events: Array<CustomEvent<{ type: string; runId: string }>> = [];
    app.addEventListener('pinflow-runs:active-change', (e) =>
      events.push(e as CustomEvent<{ type: string; runId: string }>),
    );

    // Act — first click expands r_1
    app.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_1' },
        bubbles: true,
        composed: true,
      }),
    );
    await app.updateComplete;
    // Then click r_2
    app.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_2' },
        bubbles: true,
        composed: true,
      }),
    );
    await app.updateComplete;

    // Assert
    expect(events.map((e) => e.detail)).toEqual([
      { type: 'expand', runId: 'r_1' },
      { type: 'collapse', runId: 'r_1' },
      { type: 'expand', runId: 'r_2' },
    ]);
    app.remove();
  });

  it('collapses to null when the active run is clicked again', async () => {
    // Arrange
    const app = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    app.runsByFolder = { '/repo': [{ runId: 'r_1', summaryPath: '/p1' } as never] };
    document.body.appendChild(app);
    await app.updateComplete;

    app.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_1' },
        bubbles: true,
        composed: true,
      }),
    );
    await app.updateComplete;

    const events: Array<CustomEvent<{ type: string; runId: string }>> = [];
    app.addEventListener('pinflow-runs:active-change', (e) =>
      events.push(e as CustomEvent<{ type: string; runId: string }>),
    );

    // Act
    app.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_1' },
        bubbles: true,
        composed: true,
      }),
    );
    await app.updateComplete;

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ type: 'collapse', runId: 'r_1' });
    app.remove();
  });

  it('persists activeRunId in localStorage and restores it on next mount', async () => {
    // Arrange — first instance writes
    const first = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    first.runsByFolder = { '/repo': [{ runId: 'r_persist', summaryPath: '/p' } as never] };
    document.body.appendChild(first);
    await first.updateComplete;
    first.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_persist' },
        bubbles: true,
        composed: true,
      }),
    );
    await first.updateComplete;
    first.remove();

    // Act — second instance reads
    const second = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    second.runsByFolder = { '/repo': [{ runId: 'r_persist', summaryPath: '/p' } as never] };
    document.body.appendChild(second);
    await second.updateComplete;

    // Assert — folder-section receives the restored activeRunId
    const folderSection = second.shadowRoot!.querySelector(
      'pinflow-folder-section',
    ) as (HTMLElement & { activeRunId: string | null }) | null;
    expect(folderSection?.activeRunId).toBe('r_persist');
    second.remove();
  });

  it('applies transcript:initial / append / diff:update via the public methods', async () => {
    // Arrange
    const app = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    app.runsByFolder = { '/repo': [{ runId: 'r_1', summaryPath: '/p1' } as never] };
    document.body.appendChild(app);
    await app.updateComplete;
    app.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_1' },
        bubbles: true,
        composed: true,
      }),
    );
    await app.updateComplete;

    // Act
    app.applyTranscriptInitial('r_1', 'first\n');
    app.applyTranscriptAppend('r_1', 'second\n');
    app.applyDiffUpdate('r_1', [{ path: 'src/x.ts' }]);
    await app.updateComplete;

    // Assert — folder-section receives the data
    const folderSection = app.shadowRoot!.querySelector(
      'pinflow-folder-section',
    ) as (HTMLElement & {
      liveTranscript: string;
      liveChangedFiles: readonly { path: string }[] | null;
    }) | null;
    expect(folderSection?.liveTranscript).toBe('first\nsecond\n');
    expect(folderSection?.liveChangedFiles).toEqual([{ path: 'src/x.ts' }]);
    app.remove();
  });

  it('ignores transcript/diff updates targeted at a different runId', async () => {
    // Arrange
    const app = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    app.runsByFolder = { '/repo': [{ runId: 'r_1', summaryPath: '/p1' } as never] };
    document.body.appendChild(app);
    await app.updateComplete;
    app.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_1' },
        bubbles: true,
        composed: true,
      }),
    );
    await app.updateComplete;

    // Act
    app.applyTranscriptInitial('r_2', 'should be ignored');
    await app.updateComplete;

    // Assert
    const folderSection = app.shadowRoot!.querySelector(
      'pinflow-folder-section',
    ) as (HTMLElement & { liveTranscript: string }) | null;
    expect(folderSection?.liveTranscript).toBe('');
    app.remove();
  });
});
```

- [ ] **Step 4: Run app tests — verify all pass**

```bash
corepack pnpm nx test pinflow-vscode -- --testPathPattern=pinflow-runs-app
```

Expected: existing + 6 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.ts packages/pinflow-vscode/src/runs-webview/components/pinflow-runs-app.spec.ts
git commit -m "feat(vscode): pinflow-runs-app accordion authority + localStorage persistence"
```

---

## Task 10: `main.ts` — wire incoming messages + outgoing transitions

**Files:**
- Modify: `packages/pinflow-vscode/src/runs-webview/main.ts`

This is the boundary between Lit components and the VS Code postMessage protocol. Translates `pinflow-runs:active-change` events to `run:expand` / `run:collapse` postMessages, and applies incoming `transcript:*` / `diff:update` messages by calling the app's public methods.

- [ ] **Step 1: Replace the entire `main.ts` body with the new wiring**

Replace `packages/pinflow-vscode/src/runs-webview/main.ts` with:

```ts
import './components/pinflow-lifecycle-pill.js';
import './components/pinflow-run-card.js';
import './components/pinflow-run-detail.js';
import './components/pinflow-runs-app.js';
import './components/pinflow-runs-header.js';
import './components/pinflow-empty-state.js';
import type { PinflowRunsApp } from './components/pinflow-runs-app.js';
import type { PinFlowRunEvidence } from '../core/run-evidence.js';
import {
  isExtToWebviewMessage,
  type RunsWebviewSettings,
  type WebviewToExtMessage,
} from '../core/views/runs-webview-messages.js';

interface PinflowRunsAppProps {
  runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
  folderStatuses: Readonly<Record<string, 'configured' | 'not-configured'>>;
  activeFolder: string | undefined;
  settings: RunsWebviewSettings;
}

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

function postToHost(message: WebviewToExtMessage): void {
  vscode.postMessage(message);
}

const app = document.querySelector('pinflow-runs-app') as
  | (Element & PinflowRunsAppProps & PinflowRunsApp)
  | null;
if (!app) {
  console.warn('pinflow-runs-app element not found in webview DOM');
} else {
  window.addEventListener('message', (event) => {
    if (!isExtToWebviewMessage(event.data)) return;
    const data = event.data;
    if (data.type === 'webview:init-ack') {
      app.runsByFolder = data.runsByFolder;
      app.folderStatuses = data.folderStatuses;
      app.activeFolder = data.activeFolder;
      app.settings = data.settings;
    } else if (data.type === 'runs:update') {
      app.runsByFolder = data.runsByFolder;
      app.folderStatuses = data.folderStatuses;
      app.activeFolder = data.activeFolder;
    } else if (data.type === 'settings:update') {
      app.settings = data.settings;
    } else if (data.type === 'transcript:initial') {
      app.applyTranscriptInitial(data.runId, data.text);
    } else if (data.type === 'transcript:append') {
      app.applyTranscriptAppend(data.runId, data.delta);
    } else if (data.type === 'diff:update') {
      app.applyDiffUpdate(data.runId, data.changedFiles);
    }
  });

  app.addEventListener('pinflow-runs:active-change', (event) => {
    const detail = (event as CustomEvent<{ type: 'expand' | 'collapse'; runId: string }>).detail;
    if (!detail?.runId) return;
    if (detail.type === 'expand') {
      postToHost({ type: 'run:expand', runId: detail.runId });
    } else {
      postToHost({ type: 'run:collapse', runId: detail.runId });
    }
  });

  app.addEventListener('pinflow-detail:open-diff', (event) => {
    const detail = (event as CustomEvent<{ runId: string; filePath: string }>).detail;
    if (!detail?.runId || !detail?.filePath) return;
    postToHost({
      type: 'run:open-diff',
      runId: detail.runId,
      filePath: detail.filePath,
    });
  });

  app.addEventListener('pinflow-detail:open-prompt', (event) => {
    const detail = (event as CustomEvent<{ runId: string }>).detail;
    if (!detail?.runId) return;
    postToHost({ type: 'run:open-prompt', runId: detail.runId });
  });

  app.addEventListener('pinflow-detail:open-transcript', (event) => {
    const detail = (event as CustomEvent<{ runId: string }>).detail;
    if (!detail?.runId) return;
    // Look up the transcript path from the current props.
    const matched = Object.values(app.runsByFolder)
      .flatMap((runs) => Array.from(runs))
      .find((r: PinFlowRunEvidence) => r.runId === detail.runId);
    const transcriptPath = matched?.transcriptPath;
    if (transcriptPath) {
      postToHost({ type: 'run:open-evidence-file', filePath: transcriptPath });
    }
  });

  window.addEventListener('setup-clicked', (event) => {
    const detail = (event as CustomEvent<{ folderPath: string }>).detail;
    postToHost({ type: 'webview:run-init', folder: detail.folderPath });
  });
}

postToHost({ type: 'webview:ready' });
```

The only behavioural change from the previous version is:
1. The old `pinflow-card:click` listener (which sent `run:open-prompt`) is gone — that interaction is now mediated by the app's accordion.
2. `pinflow-runs:active-change` listener translates expand/collapse to postMessages.
3. `pinflow-detail:*` listeners forward the three detail-component events.
4. The incoming `transcript:*` / `diff:update` branches call the app's public `apply*` methods.

- [ ] **Step 2: Build the webview to confirm no compile errors**

```bash
corepack pnpm nx build pinflow-vscode
```

Expected: `dist/extension.cjs` rebuilt; `dist/runs-webview/main.js` rebuilt; no errors.

- [ ] **Step 3: Run the entire test suite to confirm no regressions**

```bash
corepack pnpm nx test pinflow-vscode
```

Expected: All tests pass (existing + every new test from Tasks 1-9).

- [ ] **Step 4: Run lint**

```bash
corepack pnpm nx lint pinflow-vscode
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/main.ts
git commit -m "feat(vscode): wire accordion transitions + detail events through main.ts postMessage bridge"
```

---

## Task 11: Build VSIX, push, open PR

**Files:** No source changes — verification + ship.

- [ ] **Step 1: Run the full test suite + lint + build (final sanity)**

```bash
corepack pnpm nx test pinflow-vscode 2>&1 | tail -3
corepack pnpm nx lint pinflow-vscode 2>&1 | tail -3
corepack pnpm nx build pinflow-vscode 2>&1 | tail -5
```

Expected: tests pass, lint 0 errors, build succeeds.

- [ ] **Step 2: Build a fresh VSIX**

```bash
cd packages/pinflow-vscode && corepack pnpm package:vsix 2>&1 | tail -5 && cd ../..
```

Expected: `tmp/pinflow-vscode.vsix` updated, ~290 KB.

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/4b-live-logs-diff-viewer
```

- [ ] **Step 4: Open the PR**

```bash
gh pr create \
  --title "feat(vscode): 4B live logs + native diff viewer" \
  --body "$(cat <<'EOF'
## Summary

Replaces the "open three file tabs" pattern with editor-native run visibility:
- Click a run card → it expands inline showing a live transcript pane and a list of changed files.
- Click a changed file → VS Code's native side-by-side diff opens.
- Single-run accordion: only one run expanded at a time, persisted across F5 reloads.

## Architecture

- New `LiveTranscriptWatcher` class wraps a `FileSystemWatcher` for the expanded run's \`transcript.log\` and \`diff.patch\`. Single instance per provider — disposed on collapse or run-switch.
- New \`pinflow-run-detail\` Lit component for the inline transcript + changed-files list.
- \`pinflow-runs-app\` is now the single accordion authority — owns \`activeRunId\`, persists in localStorage, emits \`pinflow-runs:active-change\` events on transitions.
- Native \`vscode.diff()\` with \`git:HEAD\` URI as "before"; falls back to \`showTextDocument\` if the git extension isn't available, with a logged trace in the PinFlow output channel.

## Spec & plan

- Spec: \`docs/superpowers/specs/2026-05-07-pinflow-vscode-package-4b-design.md\`
- Plan: \`docs/superpowers/plans/2026-05-07-pinflow-vscode-package-4b-live-logs-diff-viewer-implementation.md\`

## Test plan

- [x] \`nx test pinflow-vscode\` — all tests pass (305 baseline + ~25 new)
- [x] \`nx lint pinflow-vscode\` — 0 errors
- [x] \`nx build pinflow-vscode\` — esbuild bundle clean
- [x] \`pnpm package:vsix\` — produces installable VSIX

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Confirm PR opened**

```bash
gh pr view --web
```

Expected: GitHub opens the new PR.

---

## Self-Review Notes (run before kicking off subagent execution)

1. **Spec coverage check:**
   - ✅ Inline run-card expansion → Tasks 7, 8, 9
   - ✅ FileSystemWatcher on `transcript.log` + `diff.patch` → Task 3
   - ✅ Native `vscode.diff()` with git URI + fallback → Task 5
   - ✅ Accordion (single run expanded) → Task 9
   - ✅ Sticky-bottom autoscroll → Task 6
   - ✅ localStorage persistence → Task 9
   - ✅ Three-message protocol additions → Tasks 1, 4, 10
   - ✅ Multi-folder respect (single accordion across folders) → Tasks 8, 9

2. **Type-name consistency:**
   - `LiveTranscriptWatcher`, `TranscriptEvent` — Tasks 3, 4 (consistent)
   - `PinflowRunDetail`, `pinflow-run-detail`, `pinflow-detail:open-*` — Task 6 (consistent)
   - `activeRunId`, `liveTranscript`, `liveChangedFiles` — Tasks 7, 8, 9 (consistent)
   - `pinflow-runs:active-change` event — Tasks 9, 10 (consistent)

3. **No placeholders:** every code block contains complete, runnable code. No "TBD", "TODO", "implement later", "similar to Task N", or "add appropriate error handling" without specifics.
