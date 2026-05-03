# PinFlow VS Code Extension — Package 3A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship onboarding & active-bootstrap features (welcome state, sidecar dev-lock, Preview row, First-Run toast, workspace transparency) on top of Package 2 + 2.5, closing the smoke-test UX gaps without introducing a Webview.

**Architecture:** Extend the existing pinflow-relay `dev` command to write `.pinflow/dev.lock` whenever it detects the localhost URL (it already does this detection for the `--open` flag). The pinflow-vscode extension reads that lockfile via the same pattern as `relay.lock`, surfaces it as a clickable "Preview" row in the Status view, contributes `viewsWelcome` blocks for the not-configured / no-folder cases, fires a one-time First-Run toast via `globalState`, and threads a new `pinflow.workspace.preferredFolder` setting + workspace-folder transparency through the existing `getBestPinFlowWorkspaceStatus` + `buildStatusViewItems` pipeline.

**Tech Stack:** TypeScript 5 (ESM, `nodenext`), VS Code Extension API ≥ 1.90, Vitest, Nx, pnpm. No new runtime dependencies. Spec source: `docs/superpowers/specs/2026-05-04-pinflow-vscode-package-3a-design.md`.

---

## Phase 0 — Pre-flight

### Task 0: Confirm baseline is green

**Files:** none

- [ ] **Step 1: Confirm we are on the correct branch**

Run: `git -C /home/domi/eventbaer/dev/pinflow rev-parse --abbrev-ref HEAD`
Expected: `codex/inline-picker-comment`

- [ ] **Step 2: Confirm HEAD is at the spec commit**

Run: `git -C /home/domi/eventbaer/dev/pinflow log --oneline -1`
Expected: starts with `47b7dcd docs: add vscode extension package 3a design`

- [ ] **Step 3: Confirm working tree clean**

Run: `git -C /home/domi/eventbaer/dev/pinflow status --porcelain`
Expected: empty output

- [ ] **Step 4: Run baseline quality gate on both affected packages**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx test pinflow-relay && corepack pnpm nx build pinflow-vscode && corepack pnpm nx build pinflow-relay && corepack pnpm nx lint pinflow-vscode && corepack pnpm nx lint pinflow-relay`
Expected: all green. Record vitest counts (last known: pinflow-vscode 68 tests / 13 files; pinflow-relay see actual output) so post-task counts can be compared.

---

## Phase 1 — CLI sidecar lockfile (pinflow-relay)

### Task 1: `pinflow dev` writes / removes `.pinflow/dev.lock`

**Files:**
- Modify: `packages/pinflow-relay/src/cli/dev/dev-session.ts`
- Modify: `packages/pinflow-relay/src/cli/dev/dev-session.spec.ts`

The existing implementation already detects the localhost URL via `findLocalhostUrl(text)` for the `--open` flag (lines 206–209 of `dev-session.ts`). We add two injectable dependencies (`writeDevLock` / `removeDevLock`) so the same detection path also writes the sidecar file, and the `finally` block removes it on exit. Defaults are file-system based; tests inject mocks.

- [ ] **Step 1: Write the failing test**

In `packages/pinflow-relay/src/cli/dev/dev-session.spec.ts`, append two new `it(...)` tests inside the existing `describe('runPinflowDev', ...)` block:

```ts
  it('writes a dev.lock when the localhost URL is detected and removes it on exit', async () => {
    const runnerChild = createChild(111);
    const appChild = createChildWithOutput(222);
    const writeDevLock = vi.fn();
    const removeDevLock = vi.fn();
    const relayControl = {
      validateAndClear: vi.fn().mockResolvedValue(undefined),
      ensureRunning: vi.fn().mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const runnerControl = { spawn: vi.fn().mockReturnValue(runnerChild) };
    const spawnApp = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        appChild.stdout?.emit(
          'data',
          Buffer.from('Local: http://localhost:5173/\n'),
        );
        appChild.emit('exit', 0, null);
      });
      return appChild;
    });

    await runPinflowDev(
      {
        workspaceRoot: '/repo',
        appCommand: ['npm', 'run', 'dev'],
        runner: { provider: 'codex' },
        relay: {},
      },
      {
        relayControl,
        runnerControl,
        spawnApp,
        writeDevLock,
        removeDevLock,
        stderr: { write: vi.fn() },
      },
    );

    expect(writeDevLock).toHaveBeenCalledTimes(1);
    expect(writeDevLock).toHaveBeenCalledWith('/repo', {
      host: 'localhost',
      port: 5173,
      url: 'http://localhost:5173/',
      pid: process.pid,
    });
    expect(removeDevLock).toHaveBeenCalledTimes(1);
    expect(removeDevLock).toHaveBeenCalledWith('/repo');
  });

  it('does not write a dev.lock when no localhost URL is detected', async () => {
    const runnerChild = createChild(111);
    const appChild = createChildWithOutput(222);
    const writeDevLock = vi.fn();
    const removeDevLock = vi.fn();
    const relayControl = {
      validateAndClear: vi.fn().mockResolvedValue(undefined),
      ensureRunning: vi.fn().mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const runnerControl = { spawn: vi.fn().mockReturnValue(runnerChild) };
    const spawnApp = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        appChild.stdout?.emit('data', Buffer.from('starting up...\n'));
        appChild.emit('exit', 0, null);
      });
      return appChild;
    });

    await runPinflowDev(
      {
        workspaceRoot: '/repo',
        appCommand: ['npm', 'run', 'dev'],
        runner: { provider: 'codex' },
        relay: {},
      },
      {
        relayControl,
        runnerControl,
        spawnApp,
        writeDevLock,
        removeDevLock,
        stderr: { write: vi.fn() },
      },
    );

    expect(writeDevLock).not.toHaveBeenCalled();
    expect(removeDevLock).toHaveBeenCalledTimes(1);
    expect(removeDevLock).toHaveBeenCalledWith('/repo');
  });
```

The `removeDevLock` is expected to fire even when no URL was detected — clean-up is unconditional. This handles the case where a previous crashed run left a stale file behind.

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm nx test pinflow-relay -- dev-session`
Expected: FAIL — `writeDevLock`/`removeDevLock` are not yet recognized properties on `PinflowDevDependencies`.

- [ ] **Step 3: Extend the dependency type and the URL-detection callback**

Edit `packages/pinflow-relay/src/cli/dev/dev-session.ts`. At the top of the file (after the existing imports), add:

```ts
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
```

Extend the `PinflowDevDependencies` interface:

```ts
export interface PinflowDevDependencies {
  relayControl?: RelayControlLike;
  runnerControl?: RunnerControlLike;
  spawnApp?: AppSpawner;
  openUrl?: (url: string) => void;
  writeDevLock?: (workspaceRoot: string, lock: PinflowDevLock) => void | Promise<void>;
  removeDevLock?: (workspaceRoot: string) => void | Promise<void>;
  stderr?: Pick<Writable, 'write'>;
}
```

Add the lock-file value type as an exported interface, near the other exports:

```ts
export interface PinflowDevLock {
  readonly host: string;
  readonly port: number;
  readonly url: string;
  readonly pid: number;
}
```

Add private default implementations near the other helpers at the bottom of the file:

```ts
async function defaultWriteDevLock(
  workspaceRoot: string,
  lock: PinflowDevLock,
): Promise<void> {
  const dir = path.join(workspaceRoot, '.pinflow');
  const file = path.join(dir, 'dev.lock');
  const tmp = `${file}.${process.pid}.tmp`;
  await mkdir(dir, { recursive: true });
  await writeFile(tmp, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  // Atomic rename so partial writes never appear to readers.
  const { rename } = await import('node:fs/promises');
  await rename(tmp, file);
}

async function defaultRemoveDevLock(workspaceRoot: string): Promise<void> {
  const file = path.join(workspaceRoot, '.pinflow', 'dev.lock');
  await rm(file, { force: true });
}

function parseLocalhostUrl(url: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? Number.parseInt(parsed.port, 10) : null;
    if (port === null || Number.isNaN(port)) return null;
    return { host: parsed.hostname, port };
  } catch {
    return null;
  }
}
```

Now wire them into `runPinflowDev`. Inside the function, pull defaults out of `deps`:

```ts
const writeDevLock = deps.writeDevLock ?? defaultWriteDevLock;
const removeDevLock = deps.removeDevLock ?? defaultRemoveDevLock;
```

Modify the `attachAppOutput` signature to accept a `onLocalhostUrl` callback that fires once when the URL is first seen:

```ts
function attachAppOutput(
  child: ChildProcess,
  open: boolean | string | undefined,
  openUrl: (url: string) => void,
  onLocalhostUrl: (url: string) => void,
): void {
  if (typeof open === 'string') {
    openUrl(open);
    onLocalhostUrl(open);
  }

  let localhostUrlSeen = false;
  let openedDetectedUrl = false;
  pipeOutput(child.stdout, process.stdout, (text) => {
    const url = findLocalhostUrl(text);
    if (url && !localhostUrlSeen) {
      localhostUrlSeen = true;
      onLocalhostUrl(url);
    }
    if (url && open === true && !openedDetectedUrl) {
      openedDetectedUrl = true;
      openUrl(url);
    }
  });
  pipeOutput(child.stderr, process.stderr);
}
```

Update the call site of `attachAppOutput` in `runPinflowDev` to pass a callback that writes the lock:

```ts
attachAppOutput(appChild, options.open, openUrl, (detectedUrl) => {
  const parsed = parseLocalhostUrl(detectedUrl);
  if (!parsed) return;
  void writeDevLock(options.workspaceRoot, {
    host: parsed.host,
    port: parsed.port,
    url: detectedUrl,
    pid: process.pid,
  });
});
```

Modify the `finally` block to await lock cleanup before relay shutdown:

```ts
} finally {
  terminateChild(runnerChild);

  await removeDevLock(options.workspaceRoot).catch(() => {
    // Cleanup is best-effort.
  });

  if (ownsRelay) {
    await relayControl.stop();
  }
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `corepack pnpm nx test pinflow-relay -- dev-session`
Expected: PASS — both new tests green plus the four existing ones in the same describe block.

- [ ] **Step 5: Run build + lint for pinflow-relay**

Run: `corepack pnpm nx build pinflow-relay && corepack pnpm nx lint pinflow-relay`
Expected: build clean, lint clean.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-relay/src/cli/dev/dev-session.ts \
        packages/pinflow-relay/src/cli/dev/dev-session.spec.ts
git commit -m "feat(relay): write .pinflow/dev.lock on dev-server URL detection"
```

---

## Phase 2 — Extension lockfile reader (pinflow-vscode)

### Task 2: `readRunningDevServer` + `PinFlowWorkspaceResult.devServer`

**Files:**
- Modify: `packages/pinflow-vscode/src/core/workspace.ts`
- Modify: `packages/pinflow-vscode/src/core/workspace.spec.ts`

Mirror the existing `readRunningRelay` pattern: read `.pinflow/dev.lock`, validate JSON shape, validate PID liveness via `processProbe`, return parsed structure or `undefined`.

- [ ] **Step 1: Write failing tests**

Append to `packages/pinflow-vscode/src/core/workspace.spec.ts` four new `it(...)` blocks under a new top-level `describe('dev-lock detection', ...)`. Reuse the existing tmp-workspace pattern from this file (it already imports `mkdtemp` etc.):

```ts
import { writeFile } from 'node:fs/promises';
// (this import may already be in scope — keep it once)

describe('dev-lock detection', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pinflow-vscode-devlock-'));
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('returns no devServer when .pinflow/dev.lock is absent', async () => {
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4317, pid: 1 }),
      'utf8',
    );

    const status = getPinFlowWorkspaceStatus(workspaceRoot, {
      processProbe: () => true,
    });

    expect(status.devServer).toBeUndefined();
  });

  it('returns the parsed devServer when .pinflow/dev.lock is valid and pid is live', async () => {
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4317, pid: 1 }),
      'utf8',
    );
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'dev.lock'),
      JSON.stringify({
        host: 'localhost',
        port: 5173,
        url: 'http://localhost:5173/',
        pid: 9999,
      }),
      'utf8',
    );

    const status = getPinFlowWorkspaceStatus(workspaceRoot, {
      processProbe: (pid) => pid === 1 || pid === 9999,
    });

    expect(status.devServer).toEqual({
      host: 'localhost',
      port: 5173,
      url: 'http://localhost:5173/',
      pid: 9999,
    });
  });

  it('returns no devServer when dev.lock pid is dead', async () => {
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4317, pid: 1 }),
      'utf8',
    );
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'dev.lock'),
      JSON.stringify({
        host: 'localhost',
        port: 5173,
        url: 'http://localhost:5173/',
        pid: 9999,
      }),
      'utf8',
    );

    const status = getPinFlowWorkspaceStatus(workspaceRoot, {
      processProbe: (pid) => pid === 1, // only the relay pid is alive
    });

    expect(status.devServer).toBeUndefined();
  });

  it('returns no devServer when dev.lock JSON is malformed', async () => {
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4317, pid: 1 }),
      'utf8',
    );
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'dev.lock'),
      'this is not json',
      'utf8',
    );

    const status = getPinFlowWorkspaceStatus(workspaceRoot, {
      processProbe: () => true,
    });

    expect(status.devServer).toBeUndefined();
  });
});
```

If imports for `mkdir` / `path` / `mkdtemp` / `rm` / `tmpdir` are not already at the top of the file, add them. (The existing test file imports a subset — reuse what's there, add what's missing.)

- [ ] **Step 2: Run tests to confirm fail**

Run: `corepack pnpm nx test pinflow-vscode -- workspace`
Expected: FAIL — `status.devServer` is not in the result type.

- [ ] **Step 3: Extend the result type and implement the reader**

Edit `packages/pinflow-vscode/src/core/workspace.ts`. Add a constant near the top alongside the existing `RELAY_LOCK_FILE`:

```ts
const DEV_LOCK_FILE = 'dev.lock';
```

Add a new field on `PinFlowWorkspaceResult`:

```ts
export interface PinFlowWorkspaceResult {
  // ... existing fields
  readonly devServer?: {
    readonly host: string;
    readonly port: number;
    readonly url: string;
    readonly pid: number;
  };
}
```

Add a private helper near `readRunningRelay`:

```ts
function readRunningDevServer(
  workspaceRoot: string,
  processProbe: ProcessProbe = defaultProcessProbe,
): PinFlowWorkspaceResult['devServer'] | undefined {
  const lockPath = path.join(workspaceRoot, PINFLOW_DIR, DEV_LOCK_FILE);

  if (!existsSync(lockPath)) {
    return;
  }

  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf-8')) as {
      host?: unknown;
      port?: unknown;
      url?: unknown;
      pid?: unknown;
    };
    const host = typeof lock.host === 'string' ? lock.host : undefined;
    const port = typeof lock.port === 'number' ? lock.port : undefined;
    const url = typeof lock.url === 'string' ? lock.url : undefined;
    const pid = typeof lock.pid === 'number' ? lock.pid : undefined;

    if (!host || !port || !url || !pid || !processProbe(pid)) {
      return;
    }

    return { host, port, url, pid };
  } catch {
    return;
  }
}
```

Modify `getPinFlowWorkspaceStatus` to call `readRunningDevServer` on the resolved workspace root and include it in every return path. The `not-configured` early-return stays as-is (no devServer there). For the `relay-missing` and `ready` paths, add `devServer: readRunningDevServer(configured.workspaceRoot, options.processProbe)` to the returned object.

Concretely the `relay-missing` return becomes:

```ts
  if (!relay) {
    return {
      status: 'relay-missing',
      workspaceFolder: resolvedFolder,
      workspaceRoot: configured.workspaceRoot,
      appRoot: configured.appRoot,
      configPath: configured.configPath,
      devServer: readRunningDevServer(configured.workspaceRoot, options.processProbe),
      message: 'PinFlow relay is not running',
    };
  }
```

And the `ready` return becomes:

```ts
  return {
    status: 'ready',
    workspaceFolder: resolvedFolder,
    workspaceRoot: configured.workspaceRoot,
    appRoot: configured.appRoot,
    configPath: configured.configPath,
    relay,
    devServer: readRunningDevServer(configured.workspaceRoot, options.processProbe),
    message: 'PinFlow ready',
  };
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `corepack pnpm nx test pinflow-vscode -- workspace`
Expected: PASS — 8 existing workspace tests still green plus 4 new dev-lock tests.

- [ ] **Step 5: Run full vitest + build + lint to catch any cross-file impact**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx build pinflow-vscode && corepack pnpm nx lint pinflow-vscode`
Expected: 72 tests pass (was 68 + 4 new), build clean, lint clean.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/core/workspace.ts \
        packages/pinflow-vscode/src/core/workspace.spec.ts
git commit -m "feat(vscode): read .pinflow/dev.lock for preview detection"
```

---

## Phase 3 — Workspace transparency

### Task 3: `preferredFolder` override + folder-count tooltip

**Files:**
- Modify: `packages/pinflow-vscode/src/core/workspace.ts`
- Modify: `packages/pinflow-vscode/src/core/workspace.spec.ts`
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.ts`
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`

Two distinct concerns in one cohesive task: the workspace selection layer learns to honor a manual override, and the Status row's tooltip surfaces multi-folder context. Both are platform-free and can be tested without VS Code mocks.

- [ ] **Step 1: Write the failing tests for `preferredFolder`**

In `packages/pinflow-vscode/src/core/workspace.spec.ts`, append a new top-level describe block:

```ts
describe('getBestPinFlowWorkspaceStatus with preferredFolder', () => {
  let workspaceA: string;
  let workspaceB: string;

  beforeEach(async () => {
    workspaceA = await mkdtemp(path.join(tmpdir(), 'pinflow-prefer-a-'));
    workspaceB = await mkdtemp(path.join(tmpdir(), 'pinflow-prefer-b-'));
    // Both folders configured; B happens to come second.
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await mkdir(path.join(workspaceB, '.pinflow'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspaceA, { recursive: true, force: true });
    await rm(workspaceB, { recursive: true, force: true });
  });

  it('honors an absolute preferredFolder path that matches one of the candidates', () => {
    const status = getBestPinFlowWorkspaceStatus([workspaceA, workspaceB], {
      processProbe: () => false,
      preferredFolder: workspaceB,
    });

    expect(status?.workspaceRoot).toBe(workspaceB);
  });

  it('falls back to auto-priority when preferredFolder does not match any candidate', () => {
    const status = getBestPinFlowWorkspaceStatus([workspaceA, workspaceB], {
      processProbe: () => false,
      preferredFolder: '/no/such/path',
    });

    expect(status?.workspaceRoot).toBe(workspaceA);
  });

  it('falls back to auto-priority when preferredFolder is empty', () => {
    const status = getBestPinFlowWorkspaceStatus([workspaceA, workspaceB], {
      processProbe: () => false,
      preferredFolder: '',
    });

    expect(status?.workspaceRoot).toBe(workspaceA);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `corepack pnpm nx test pinflow-vscode -- workspace`
Expected: FAIL — `preferredFolder` not recognized in options type.

- [ ] **Step 3: Implement preferredFolder in workspace.ts**

Extend `PinFlowWorkspaceOptions`:

```ts
export interface PinFlowWorkspaceOptions {
  readonly processProbe?: ProcessProbe;
  readonly preferredFolder?: string;
}
```

Modify `getBestPinFlowWorkspaceStatus`:

```ts
export function getBestPinFlowWorkspaceStatus(
  workspaceFolders: readonly string[],
  options: PinFlowWorkspaceOptions = {},
): PinFlowWorkspaceResult | undefined {
  const candidateFolders = workspaceFolders.flatMap((workspaceFolder) =>
    getWorkspaceCandidateFolders(workspaceFolder),
  );
  const statuses = candidateFolders.map((workspaceFolder) =>
    getPinFlowWorkspaceStatus(workspaceFolder, options),
  );

  const preferred = resolvePreferredStatus(
    statuses,
    workspaceFolders,
    options.preferredFolder,
  );
  if (preferred) return preferred;

  return (
    statuses.find((status) => status.status === 'ready') ??
    statuses.find((status) => status.status === 'relay-missing') ??
    statuses[0]
  );
}

function resolvePreferredStatus(
  statuses: readonly PinFlowWorkspaceResult[],
  workspaceFolders: readonly string[],
  preferredFolder: string | undefined,
): PinFlowWorkspaceResult | undefined {
  if (!preferredFolder) return;

  const candidates = path.isAbsolute(preferredFolder)
    ? [path.resolve(preferredFolder)]
    : workspaceFolders.map((folder) =>
        path.resolve(folder, preferredFolder),
      );

  for (const candidate of candidates) {
    const match = statuses.find(
      (status) => status.workspaceRoot === candidate,
    );
    if (match && match.status !== 'not-configured') return match;
  }

  return;
}
```

- [ ] **Step 4: Run preferredFolder tests to verify pass**

Run: `corepack pnpm nx test pinflow-vscode -- workspace`
Expected: PASS — all workspace tests green (8 existing + 4 dev-lock + 3 preferredFolder).

- [ ] **Step 5: Write failing tests for the workspace tooltip transparency**

In `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`, append two new `it(...)` blocks inside the existing `describe('buildStatusViewItems', ...)`:

```ts
  it('keeps the workspace tooltip simple when only one folder is open', () => {
    const items = buildStatusViewItems(readyStatus(), null, null, {
      workspaceFolderCount: 1,
      workspaceFolderIndex: 0,
    });
    const workspace = items.find((item) => item.id === 'workspace');

    expect(workspace?.tooltip).toBe('/repo/app');
  });

  it('appends a multi-folder hint to the workspace tooltip when several are open', () => {
    const items = buildStatusViewItems(readyStatus(), null, null, {
      workspaceFolderCount: 3,
      workspaceFolderIndex: 0,
    });
    const workspace = items.find((item) => item.id === 'workspace');

    expect(workspace?.tooltip).toBe('/repo/app\n1 of 3 workspace folders');
  });
```

- [ ] **Step 6: Run tests to confirm fail**

Run: `corepack pnpm nx test pinflow-vscode -- status-view-model`
Expected: FAIL — `buildStatusViewItems` does not yet accept a 4th `options` argument.

- [ ] **Step 7: Implement the new `options` parameter on `buildStatusViewItems` + tooltip logic**

Edit `packages/pinflow-vscode/src/core/views/status-view-model.ts`. Add an exported options type:

```ts
export interface BuildStatusViewItemsOptions {
  readonly workspaceFolderCount?: number;
  readonly workspaceFolderIndex?: number;
}
```

Update the public function signature:

```ts
export function buildStatusViewItems(
  status: PinFlowWorkspaceResult,
  externalClaim: ExternalHandoffClaim | null,
  latestRun?: PinFlowRunEvidence | null,
  options: BuildStatusViewItemsOptions = {},
): readonly StatusViewItem[] {
  const items: StatusViewItem[] = [
    buildRelayItem(status),
    buildRunnerItem(latestRun ?? null),
    buildWorkspaceItem(status, options),
  ];
  if (externalClaim) items.push(buildExternalClaimItem(externalClaim));
  return items;
}
```

Update `buildWorkspaceItem`:

```ts
function buildWorkspaceItem(
  status: PinFlowWorkspaceResult,
  options: BuildStatusViewItemsOptions,
): StatusViewItem {
  const appRoot = status.appRoot ?? status.workspaceFolder;
  const isDemoFixture = appRoot.endsWith(DEMO_FIXTURE_SUFFIX);
  const description = isDemoFixture ? 'Demo Fixture' : path.basename(appRoot);

  const tooltip = buildWorkspaceTooltip(appRoot, options);

  return {
    id: 'workspace',
    label: 'Workspace',
    description,
    tooltip,
    themeIcon: 'folder',
  };
}

function buildWorkspaceTooltip(
  appRoot: string,
  options: BuildStatusViewItemsOptions,
): string {
  const count = options.workspaceFolderCount ?? 1;
  if (count <= 1) return appRoot;
  const oneBasedIndex = (options.workspaceFolderIndex ?? 0) + 1;
  return `${appRoot}\n${oneBasedIndex} of ${count} workspace folders`;
}
```

- [ ] **Step 8: Run tests to verify pass**

Run: `corepack pnpm nx test pinflow-vscode -- status-view-model`
Expected: PASS — existing 9 tests plus 2 new tooltip tests.

- [ ] **Step 9: Run full pinflow-vscode test suite + build + lint**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx build pinflow-vscode && corepack pnpm nx lint pinflow-vscode`
Expected: build clean, lint clean. Test count: 77 (68 + 4 dev-lock + 3 preferredFolder + 2 tooltip).

- [ ] **Step 10: Commit**

```bash
git add packages/pinflow-vscode/src/core/workspace.ts \
        packages/pinflow-vscode/src/core/workspace.spec.ts \
        packages/pinflow-vscode/src/core/views/status-view-model.ts \
        packages/pinflow-vscode/src/core/views/status-view-model.spec.ts
git commit -m "feat(vscode): add preferredFolder option and multi-folder tooltip"
```

---

## Phase 4 — Preview row in Status view

### Task 4: `'preview'` StatusItemId + `command` field + `buildPreviewItem`

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.ts`
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`

The new "Preview" status row shows the dev-server URL (when present) and is clickable to open the browser. The optional `command` field lets the future provider invoke any command.

- [ ] **Step 1: Write failing tests**

In `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`, append three new `it(...)` blocks inside the existing `describe('buildStatusViewItems', ...)`:

```ts
  it('inserts a preview row in position 4 between Workspace and the optional ExternalClaim', () => {
    const status: PinFlowWorkspaceResult = {
      ...readyStatus(),
      devServer: {
        host: 'localhost',
        port: 5173,
        url: 'http://localhost:5173/',
        pid: 9999,
      },
    };

    const items = buildStatusViewItems(status, null);

    expect(items.map((item) => item.id)).toEqual([
      'relay',
      'runner',
      'workspace',
      'preview',
    ]);
  });

  it('describes the preview row with host:port and a clickable command when running', () => {
    const status: PinFlowWorkspaceResult = {
      ...readyStatus(),
      devServer: {
        host: 'localhost',
        port: 5173,
        url: 'http://localhost:5173/',
        pid: 9999,
      },
    };

    const items = buildStatusViewItems(status, null);
    const preview = items.find((item) => item.id === 'preview');

    expect(preview?.description).toBe('localhost:5173');
    expect(preview?.themeIcon).toBe('circle-filled');
    expect(preview?.themeIconColor).toBe('charts.green');
    expect(preview?.tooltip).toBe('http://localhost:5173/');
    expect(preview?.command).toEqual({
      command: 'pinflow.openPreview',
      arguments: ['http://localhost:5173/'],
    });
  });

  it('renders an inert preview row when no dev server is detected', () => {
    const items = buildStatusViewItems(readyStatus(), null);
    const preview = items.find((item) => item.id === 'preview');

    expect(preview?.description).toBe('not running');
    expect(preview?.themeIcon).toBe('circle-outline');
    expect(preview?.themeIconColor).toBeUndefined();
    expect(preview?.command).toBeUndefined();
    expect(preview?.tooltip).toBe(
      'No dev server detected. Start with PinFlow: Start Workflow.',
    );
  });
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `corepack pnpm nx test pinflow-vscode -- status-view-model`
Expected: FAIL — preview branch and `command` field do not exist yet.

- [ ] **Step 3: Implement the preview row**

Edit `packages/pinflow-vscode/src/core/views/status-view-model.ts`. Extend `StatusItemId`:

```ts
export type StatusItemId =
  | 'relay'
  | 'runner'
  | 'workspace'
  | 'preview'
  | 'externalClaim';
```

Extend `StatusViewItem`:

```ts
export interface StatusViewItem {
  readonly id: StatusItemId;
  readonly label: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly themeIcon: string;
  readonly themeIconColor?: string;
  readonly command?: {
    readonly command: string;
    readonly arguments?: readonly unknown[];
  };
}
```

Add `buildPreviewItem`:

```ts
function buildPreviewItem(
  devServer: PinFlowWorkspaceResult['devServer'],
): StatusViewItem {
  if (!devServer) {
    return {
      id: 'preview',
      label: 'Preview',
      description: 'not running',
      tooltip:
        'No dev server detected. Start with PinFlow: Start Workflow.',
      themeIcon: 'circle-outline',
    };
  }
  return {
    id: 'preview',
    label: 'Preview',
    description: `${devServer.host}:${devServer.port}`,
    tooltip: devServer.url,
    themeIcon: 'circle-filled',
    themeIconColor: 'charts.green',
    command: {
      command: 'pinflow.openPreview',
      arguments: [devServer.url],
    },
  };
}
```

Update the order inside `buildStatusViewItems`:

```ts
export function buildStatusViewItems(
  status: PinFlowWorkspaceResult,
  externalClaim: ExternalHandoffClaim | null,
  latestRun?: PinFlowRunEvidence | null,
  options: BuildStatusViewItemsOptions = {},
): readonly StatusViewItem[] {
  const items: StatusViewItem[] = [
    buildRelayItem(status),
    buildRunnerItem(latestRun ?? null),
    buildWorkspaceItem(status, options),
    buildPreviewItem(status.devServer),
  ];
  if (externalClaim) items.push(buildExternalClaimItem(externalClaim));
  return items;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `corepack pnpm nx test pinflow-vscode -- status-view-model`
Expected: PASS — all status-view-model tests green (14 existing after Task 3's tooltip additions + 3 new = 17).

- [ ] **Step 5: Run full pinflow-vscode quality gate**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx build pinflow-vscode && corepack pnpm nx lint pinflow-vscode`
Expected: 80 tests, build clean, lint clean.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/status-view-model.ts \
        packages/pinflow-vscode/src/core/views/status-view-model.spec.ts
git commit -m "feat(vscode): add clickable Preview row to Status view"
```

---

## Phase 5 — Manifest contributions

### Task 5: `viewsWelcome` + 3 new commands + `preferredFolder` setting + activation events

**Files:**
- Modify: `packages/pinflow-vscode/package.json`
- Modify: `packages/pinflow-vscode/src/extension-manifest.spec.ts`

Bundle all package.json contributions into one commit because the manifest spec asserts everything together. The implementation in `extension.ts` happens in Phase 6.

- [ ] **Step 1: Widen the manifest type, then write the failing manifest assertions**

In `packages/pinflow-vscode/src/extension-manifest.spec.ts`, first widen the `manifest.contributes` type at the top of the file to include `viewsWelcome`:

```ts
contributes?: {
  commands?: Array<{ command: string; title: string; category?: string; icon?: string }>;
  viewsContainers?: { activitybar?: Array<{ id: string; title: string; icon: string }> };
  views?: Record<string, Array<{ id: string; name: string }>>;
  menus?: Record<string, Array<{ command: string; when: string; group: string }>>;
  configuration?: {
    title?: string;
    properties?: Record<string, {
      type?: string | string[];
      default?: unknown;
      minimum?: number;
      maximum?: number;
      enum?: string[];
      description?: string;
    }>;
  };
  viewsWelcome?: Array<{ view: string; contents: string; when: string }>;
};
```

Then append three new `it(...)` blocks inside the existing `describe('VS Code extension manifest', ...)` block:

```ts
  it('contributes the package-3a welcome blocks for not-configured and empty-workspace states', () => {
    const welcome = manifest.contributes?.viewsWelcome;
    expect(welcome).toBeDefined();
    expect(welcome).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          view: 'pinflow.status',
          when: expect.stringContaining('pinflow.notConfigured'),
        }),
        expect.objectContaining({
          view: 'pinflow.status',
          when: 'workbenchState == empty',
        }),
      ]),
    );
    const notConfigured = welcome?.find((entry) =>
      entry.when.includes('pinflow.notConfigured'),
    );
    expect(notConfigured?.contents).toContain('command:pinflow.runInit');
    expect(notConfigured?.contents).toContain('command:pinflow.openDocumentation');
    const emptyWorkspace = welcome?.find(
      (entry) => entry.when === 'workbenchState == empty',
    );
    expect(emptyWorkspace?.contents).toContain('command:vscode.openFolder');
  });

  it('contributes the package-3a commands and activation events', () => {
    const commands = manifest.contributes?.commands?.map((c) => c.command) ?? [];
    expect(commands).toEqual(
      expect.arrayContaining([
        'pinflow.runInit',
        'pinflow.openDocumentation',
        'pinflow.openPreview',
      ]),
    );
    expect(manifest.activationEvents).toEqual(
      expect.arrayContaining([
        'onCommand:pinflow.runInit',
        'onCommand:pinflow.openDocumentation',
        'onCommand:pinflow.openPreview',
      ]),
    );
  });

  it('contributes the package-3a preferredFolder user setting', () => {
    const props = manifest.contributes?.configuration?.properties ?? {};
    expect(props['pinflow.workspace.preferredFolder']).toBeDefined();
    expect(props['pinflow.workspace.preferredFolder'].type).toBe('string');
    expect(props['pinflow.workspace.preferredFolder'].default).toBe('');
  });
```

- [ ] **Step 2: Run manifest spec to confirm fail**

Run: `corepack pnpm nx test pinflow-vscode -- extension-manifest`
Expected: FAIL — `viewsWelcome` undefined, new commands missing, preferredFolder setting missing.

- [ ] **Step 3: Add the contributions and activation events to package.json**

Edit `packages/pinflow-vscode/package.json`.

Append three activation events to the existing `activationEvents` array:

```jsonc
"onCommand:pinflow.runInit",
"onCommand:pinflow.openDocumentation",
"onCommand:pinflow.openPreview"
```

Append three command entries to the existing `contributes.commands` array, in this order:

```jsonc
{ "command": "pinflow.runInit",          "title": "PinFlow: Run Init",        "category": "PinFlow", "icon": "$(rocket)" },
{ "command": "pinflow.openDocumentation","title": "PinFlow: Open Documentation","category": "PinFlow", "icon": "$(book)" },
{ "command": "pinflow.openPreview",      "title": "PinFlow: Open Preview",    "category": "PinFlow", "icon": "$(link-external)" }
```

Add the new setting inside `contributes.configuration.properties`. Place it after the existing `pinflow.externalHandoff.defaultProvider`:

```jsonc
"pinflow.workspace.preferredFolder": {
  "type": "string",
  "default": "",
  "description": "Absolute or relative path to the workspace folder PinFlow should track. Leave empty to use auto-detection (the first folder with a running relay, then the first configured folder, then the first folder)."
}
```

Add a new top-level entry in `contributes` named `viewsWelcome` (sibling of `commands`, `views`, etc.):

```jsonc
"viewsWelcome": [
  {
    "view": "pinflow.status",
    "when": "workbenchState != empty && pinflow.notConfigured",
    "contents": "PinFlow ist in diesem Workspace nicht eingerichtet.\n\n[$(rocket) PinFlow einrichten](command:pinflow.runInit)\n\n[$(book) Dokumentation öffnen](command:pinflow.openDocumentation)\n\nVoraussetzung: PinFlow CLI verfügbar (lokal in deinem Projekt oder global installiert)."
  },
  {
    "view": "pinflow.status",
    "when": "workbenchState == empty",
    "contents": "PinFlow braucht einen geöffneten Ordner.\n\n[$(folder-opened) Ordner öffnen](command:vscode.openFolder)"
  }
]
```

- [ ] **Step 4: Run manifest spec to verify pass**

Run: `corepack pnpm nx test pinflow-vscode -- extension-manifest`
Expected: PASS — existing 9 manifest tests stay green plus 3 new package-3a assertions.

- [ ] **Step 5: Run full pinflow-vscode quality gate**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx build pinflow-vscode && corepack pnpm nx lint pinflow-vscode`
Expected: 83 tests, build clean, lint clean.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/package.json \
        packages/pinflow-vscode/src/extension-manifest.spec.ts
git commit -m "feat(vscode): contribute package-3a welcome, commands, and setting"
```

---

## Phase 6 — extension.ts wiring

Phase 6 is split into four focused tasks (6a–6d). Each ends in a green test/build/lint and a commit.

### Task 6a: Honor the new `command` field in StatusTreeDataProvider

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

The new Preview row carries an optional `command` on the `StatusViewItem`. The provider must surface it as `vscode.TreeItem.command` so the row becomes clickable.

- [ ] **Step 1: Edit the StatusTreeDataProvider getTreeItem**

Locate the `StatusTreeDataProvider` class in `packages/pinflow-vscode/src/extension.ts`. The current `getTreeItem` already maps icon and label. Add a final block that conditionally sets `item.command`:

```ts
  getTreeItem(element: StatusViewItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.description = element.description;
    item.tooltip = element.tooltip;
    item.iconPath = element.themeIconColor
      ? new vscode.ThemeIcon(element.themeIcon, new vscode.ThemeColor(element.themeIconColor))
      : new vscode.ThemeIcon(element.themeIcon);
    if (element.command) {
      item.command = {
        command: element.command.command,
        title: element.label,
        arguments: element.command.arguments?.slice(),
      };
    }
    return item;
  }
```

(The only addition is the `if (element.command)` block.)

- [ ] **Step 2: Run tests + build + lint**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx build pinflow-vscode && corepack pnpm nx lint pinflow-vscode`
Expected: 83 tests pass, build clean, lint clean. (No new tests — provider changes aren't unit-tested per existing pattern.)

- [ ] **Step 3: Commit**

```bash
git add packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): wire StatusViewItem.command into the provider"
```

---

### Task 6b: Register the three new commands

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`
- Modify: `packages/pinflow-vscode/src/vscode.d.ts`

`pinflow.runInit`, `pinflow.openDocumentation`, `pinflow.openPreview` must be registered. Two of them touch APIs not yet in the `vscode.d.ts` stub — extend the stub minimally.

- [ ] **Step 1: Extend the vscode.d.ts stub**

Edit `packages/pinflow-vscode/src/vscode.d.ts`. Add to the `Uri` class:

```ts
  export class Uri {
    readonly fsPath: string;
    static file(path: string): Uri;
    static parse(value: string): Uri;
  }
```

Replace the `showInformationMessage` line in `window` to support button items:

```ts
  showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;
```

Add a new `env` namespace at the top level of the module:

```ts
  export const env: {
    openExternal(target: Uri): Thenable<boolean>;
  };
```

Add `globalState` to `ExtensionContext`:

```ts
  export interface ExtensionContext {
    subscriptions: Disposable[];
    readonly globalState: {
      get<T>(key: string): T | undefined;
      get<T>(key: string, defaultValue: T): T;
      update(key: string, value: unknown): Thenable<void>;
    };
  }
```

- [ ] **Step 2: Register the three new commands inside `activate`**

Edit `packages/pinflow-vscode/src/extension.ts`. Inside the existing `context.subscriptions.push(` block where commands are registered, add three new entries (place them next to the other `pinflow.*` registrations, keeping a sensible grouping — for example next to `pinflow.openSettings`):

```ts
    vscode.commands.registerCommand('pinflow.runInit', () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders?.length) {
        void vscode.window.showInformationMessage(
          'Open a workspace folder to run PinFlow init.',
        );
        return;
      }
      const cwd = folders[0].uri.fsPath;
      const terminal = vscode.window.createTerminal({
        name: 'PinFlow Init',
        cwd,
      });
      terminal.sendText(formatPinFlowCliCommand(cwd, ['init']));
      terminal.show();
    }),
    vscode.commands.registerCommand('pinflow.openDocumentation', () => {
      void vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/Dom-303/pinflow#readme'),
      );
    }),
    vscode.commands.registerCommand(
      'pinflow.openPreview',
      async (url: unknown) => {
        if (typeof url !== 'string' || !url) return;
        await vscode.env.openExternal(vscode.Uri.parse(url));
      },
    ),
```

- [ ] **Step 3: Run tests + build + lint**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx build pinflow-vscode && corepack pnpm nx lint pinflow-vscode`
Expected: 83 tests pass, build clean (the stub additions allow the new code to compile), lint clean.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/extension.ts \
        packages/pinflow-vscode/src/vscode.d.ts
git commit -m "feat(vscode): register runInit, openDocumentation, openPreview commands"
```

---

### Task 6c: Set `pinflow.notConfigured` context + thread `preferredFolder`/folder-count through `refreshAll`

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

Drives the welcome state visibility AND wires the new transparency features into the runtime path.

- [ ] **Step 1: Modify the `refreshAll` function**

In `packages/pinflow-vscode/src/extension.ts`, inside `refreshAll()`:

(a) Right after `const workspaceFolders = getWorkspaceFolders();`, but BEFORE the early `if (!workspaceFolders.length)` return, add the empty-workspace handling for the welcome context:

```ts
    if (!workspaceFolders.length) {
      statusItem.text = 'PinFlow: no workspace';
      statusItem.tooltip = 'Open a workspace folder to use PinFlow.';
      statusItem.show();
      statusProvider.setItems([]);
      runsProvider.setRoots([]);
      actionsProvider.setItems(buildActionsViewItems(externalClaim));
      void vscode.commands.executeCommand(
        'setContext',
        'pinflow.notConfigured',
        false,
      );
      return;
    }
```

(b) Immediately after `getBestPinFlowWorkspaceStatus(workspaceFolders)` becomes available, wire the new options. Replace the existing line:

```ts
const workspaceStatus = getBestPinFlowWorkspaceStatus(workspaceFolders);
```

with:

```ts
const config = vscode.workspace.getConfiguration('pinflow');
const preferredFolder = config.get<string>('workspace.preferredFolder', '');
const workspaceStatus = getBestPinFlowWorkspaceStatus(workspaceFolders, {
  preferredFolder: preferredFolder.trim() || undefined,
});
```

(c) Right after the `if (!workspaceStatus) return;` guard, set the welcome context:

```ts
void vscode.commands.executeCommand(
  'setContext',
  'pinflow.notConfigured',
  workspaceStatus.status === 'not-configured',
);
```

(d) Compute folder transparency context and pass into `buildStatusViewItems`. Just before `statusProvider.setItems(...)`, replace the existing call with:

```ts
const workspaceFolderIndex = workspaceFolders.findIndex(
  (folder) => folder === workspaceStatus.workspaceFolder,
);
statusProvider.setItems(
  buildStatusViewItems(workspaceStatus, externalClaim, runEvidence[0] ?? null, {
    workspaceFolderCount: workspaceFolders.length,
    workspaceFolderIndex: workspaceFolderIndex >= 0 ? workspaceFolderIndex : 0,
  }),
);
```

(The remaining downstream lines for `runsProvider.setRoots(...)` and `actionsProvider.setItems(...)` are unchanged.)

(e) The other `getConfiguration` calls already in `refreshAll` (for `runs.todayExpandedByDefault`, `timeFormat`, `notifications.runFailed`) can re-use the same `config` constant declared in (b) — fold them to use it instead of calling `getConfiguration` separately. Concrete change: in the existing block that reads `runs.todayExpandedByDefault` etc., replace `vscode.workspace.getConfiguration('pinflow')` with `config`. This is a drive-by tidy that prevents three identical lookups per tick.

- [ ] **Step 2: Run tests + build + lint**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx build pinflow-vscode && corepack pnpm nx lint pinflow-vscode`
Expected: 83 tests pass, build clean, lint clean.

- [ ] **Step 3: Commit**

```bash
git add packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): drive welcome context and preferredFolder from refreshAll"
```

---

### Task 6d: First-Run celebration toast

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

Detect the first ever `processed` run per workspace and show a one-time celebration toast. Persistence via `context.globalState`.

- [ ] **Step 1: Add the toast helper and the per-tick check**

In `packages/pinflow-vscode/src/extension.ts`, inside `refreshAll` (after the failed-run notification block, sharing the same `runEvidence` array), add:

```ts
const processedRun = runEvidence.find(
  (run) => run.summary.status === 'processed',
);
if (processedRun && workspaceStatus.workspaceRoot) {
  const firstRunKey = `pinflow.firstRunSeen.${workspaceStatus.workspaceRoot}`;
  const seen = context.globalState.get<boolean>(firstRunKey, false);
  if (!seen) {
    void context.globalState.update(firstRunKey, true);
    void showFirstRunToast(processedRun);
  }
}
```

Add a new module-level helper (alongside the existing `formatStatusText`, etc.):

```ts
async function showFirstRunToast(run: PinFlowRunEvidence): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    `Erster PinFlow-Run abgeschlossen: ${run.annotationId ?? run.runId ?? 'unknown'}`,
    'Run öffnen',
    'OK',
  );
  if (choice === 'Run öffnen' && run.promptPath) {
    await vscode.window.showTextDocument(vscode.Uri.file(run.promptPath));
  }
}
```

`run.promptPath` already exists on `PinFlowRunEvidence` — no model change needed.

The `PinFlowRunEvidence` type comes from `./core/run-evidence.js`. Add it to the existing import block at the top of `extension.ts` if it's not already imported:

```ts
import {
  findRunEvidence,
  type PinFlowRunEvidence,
} from './core/run-evidence.js';
```

- [ ] **Step 2: Run tests + build + lint**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx build pinflow-vscode && corepack pnpm nx lint pinflow-vscode`
Expected: 83 tests pass, build clean, lint clean.

- [ ] **Step 3: Commit**

```bash
git add packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): celebrate first run with a one-time toast"
```

---

## Phase 7 — End-to-end verification

### Task 7: Build VSIX and walk through the manual smoke test

**Files:** none

- [ ] **Step 1: Rebuild the VSIX**

Run: `corepack pnpm --filter pinflow-vscode package:vsix`
Expected: `tmp/pinflow-vscode.vsix` overwritten, no errors. The packaged file should now include `media/sidebar-icon.svg`, the new commands in package.json, and the configuration block with the new `preferredFolder` setting.

- [ ] **Step 2: Install the new VSIX**

In a separate VS Code window:
1. Command Palette → "Extensions: Install from VSIX..." → pick `tmp/pinflow-vscode.vsix`
2. Reload window when prompted

Expected: extension reports the new content. Check the Settings UI shows 6 PinFlow settings (the 5 from Package 2.5 plus `pinflow.workspace.preferredFolder`).

- [ ] **Step 3: Smoke test 1 — empty-workspace welcome**

Open a fresh VS Code window with NO folder. Click the PinFlow Activity-Bar icon.
Expected: Status view shows "PinFlow braucht einen geöffneten Ordner." with a clickable "Ordner öffnen" button.

- [ ] **Step 4: Smoke test 2 — not-configured welcome**

Open a folder that has no `.pinflow/` and no `pinflow.config.*`. Reload the PinFlow view.
Expected: Status view shows "PinFlow ist in diesem Workspace nicht eingerichtet." with two buttons (Init + Documentation). Click "Dokumentation öffnen" — confirm browser opens to `https://github.com/Dom-303/pinflow#readme`.

- [ ] **Step 5: Smoke test 3 — init flow**

Click "PinFlow einrichten". A new terminal "PinFlow Init" opens. Walk through the prompts of `pinflow init`. Once `.pinflow/` is created, within ~3 s the welcome should disappear and the normal Status / Runs / Actions views should appear.

- [ ] **Step 6: Smoke test 4 — Preview row + sidecar**

Run "PinFlow: Start Workflow" from the Actions view. The dev terminal should show Vite's `Local: http://localhost:NNNN/` line. Within 3 s, confirm the Status view's `Preview` row turns green with the host:port description. Click the row — browser opens to that URL.

- [ ] **Step 7: Smoke test 5 — Preview cleanup**

Stop `pinflow dev` (Ctrl+C in the dev terminal). Within 3 s the Preview row should turn back to grey "not running".

- [ ] **Step 8: Smoke test 6 — Multi-folder transparency**

Open a multi-root workspace with two folders (`File → Add Folder to Workspace…`). Hover the Workspace row in Status view.
Expected: tooltip shows the active folder path on one line and "1 of 2 workspace folders" (or similar based on which folder PinFlow picked) on a second line.

- [ ] **Step 9: Smoke test 7 — preferredFolder override**

In Settings, set `pinflow.workspace.preferredFolder` to the path of the second folder. Wait ~3 s.
Expected: the Workspace row updates to show the second folder. Reset the setting to empty — Workspace row reverts.

- [ ] **Step 10: Smoke test 8 — First-Run toast**

In a workspace where `pinflow.firstRunSeen.<workspaceRoot>` is not yet set (or use `Developer: Reload Window` after clearing the relevant globalState entry via Command Palette → "Developer: Open Extension Logs Folder" inspection isn't standard; alternatively use a fresh test workspace that's never had a successful run before this session). Trigger a successful end-to-end run.
Expected: A toast `Erster PinFlow-Run abgeschlossen: ann_…` appears with `Run öffnen` and `OK` buttons. Click `Run öffnen` — the run's `prompt.md` opens in the editor.

Trigger another run.
Expected: NO toast (the celebration slot is consumed for this workspace).

- [ ] **Step 11: Final clean-state check**

Run: `git -C /home/domi/eventbaer/dev/pinflow status --porcelain`
Expected: empty (everything from Phases 1–6 is committed).

Run: `git -C /home/domi/eventbaer/dev/pinflow log --oneline 47b7dcd..HEAD`
Expected: a list of approximately 8 commits matching the phases (Phase 1 CLI sidecar, Phase 2 reader, Phase 3 transparency, Phase 4 preview row, Phase 5 manifest, Phase 6a–6d wiring).

- [ ] **Step 12: No push, no release**

Do **not** run `git push` or any publish command. The branch stays local until explicitly approved. Report success and the list of commits added (`git log --oneline 47b7dcd..HEAD`) to the user, then stop.

---

## Quality Gate (run any time, mandatory before reporting completion)

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx test pinflow-relay
corepack pnpm nx build pinflow-vscode
corepack pnpm nx build pinflow-relay
corepack pnpm nx lint pinflow-vscode
corepack pnpm nx lint pinflow-relay
git -C /home/domi/eventbaer/dev/pinflow diff --check
```

All seven must be green. If any step fails, fix the underlying issue (do not skip hooks, do not amend earlier commits — create a new commit for the fix).
