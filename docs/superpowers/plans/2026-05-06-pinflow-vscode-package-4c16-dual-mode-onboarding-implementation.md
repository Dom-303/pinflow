# PinFlow VS Code Extension — Package 4 Phase C.1.6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire dual-mode onboarding so the Setup-PinFlow click defaults to a hidden background `pinflow init --yes` (no terminal), while preserving today's terminal-first behavior as opt-in (setting + always-available command).

**Spec source:** `docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c16-dual-mode-onboarding-design.md`.

**Tech Stack:** TypeScript 5 (ESM, `nodenext`), Node `child_process`, VS Code Extension API ≥ 1.90, Vitest + happy-dom, Nx 22, pnpm via corepack. Zero new runtime dependencies.

---

## Phase 0 — Pre-flight

### Task 0: Branch + baseline green

**Files:** none

- [ ] **Step 1: Create feature branch and commit spec/plan**

```bash
git -C /home/domi/eventbaer/dev/pinflow checkout main
git -C /home/domi/eventbaer/dev/pinflow pull origin main
git -C /home/domi/eventbaer/dev/pinflow checkout -b feature/c16-dual-mode-onboarding
git -C /home/domi/eventbaer/dev/pinflow add docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c16-dual-mode-onboarding-design.md docs/superpowers/plans/2026-05-06-pinflow-vscode-package-4c16-dual-mode-onboarding-implementation.md docs/superpowers/specs/2026-05-05-pinflow-vscode-package-4-roadmap.md
git -C /home/domi/eventbaer/dev/pinflow commit -m "docs(vscode): add Phase C.1.6 dual-mode onboarding spec + plan + roadmap update"
```

- [ ] **Step 2: Confirm branch + tree clean**

```bash
git -C /home/domi/eventbaer/dev/pinflow rev-parse --abbrev-ref HEAD
# expected: feature/c16-dual-mode-onboarding
git -C /home/domi/eventbaer/dev/pinflow status --porcelain
# expected: empty
```

- [ ] **Step 3: Baseline quality gate**

```bash
corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode,pinflow-relay
```

Record: pinflow-vscode 169, pinflow-relay 421.

---

## Phase 1 — CLI Detection Helper

### Task 1: `cli-detection.ts` + tests

**Files:**
- New: `packages/pinflow-vscode/src/core/onboarding/cli-detection.ts`
- New: `packages/pinflow-vscode/src/core/onboarding/cli-detection.spec.ts`

- [ ] **Step 1: Write failing tests first**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

describe('detectPinFlowCli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns available when which/where resolves and binary is executable', async () => {
    // Arrange — mock execFile to resolve with the binary path
    // Mock fs access check to confirm executable

    // Act
    const result = await detectPinFlowCli();

    // Assert
    expect(result.available).toBe(true);
  });

  it('returns not-on-path when which/where exits non-zero', async () => {
    // Arrange — mock execFile to reject with code !== 0

    // Act
    const result = await detectPinFlowCli();

    // Assert
    expect(result.available).toBe(false);
    expect(result.reason).toBe('not-on-path');
  });

  it('returns not-executable when binary exists but lacks +x', async () => {
    // Arrange — execFile resolves with path, fs access denies X_OK

    // Act
    const result = await detectPinFlowCli();

    // Assert
    expect(result.available).toBe(false);
    expect(result.reason).toBe('not-executable');
  });

  it('returns unknown reason on unexpected errors without throwing', async () => {
    // Arrange — execFile throws unexpected error

    // Act
    const result = await detectPinFlowCli();

    // Assert
    expect(result.available).toBe(false);
    expect(result.reason).toBe('unknown');
  });
});
```

Run: `corepack pnpm nx test pinflow-vscode -- cli-detection`
Expected: FAIL — module doesn't exist.

- [ ] **Step 2: Implement `cli-detection.ts`**

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, constants } from 'node:fs/promises';

const execFileAsync = promisify(execFile);

export interface CliCheckResult {
  readonly available: boolean;
  readonly reason?: 'not-on-path' | 'not-executable' | 'unknown';
  readonly path?: string;
  readonly detail?: string;
}

const WHICH_COMMAND = process.platform === 'win32' ? 'where' : 'which';

export async function detectPinFlowCli(): Promise<CliCheckResult> {
  try {
    const { stdout } = await execFileAsync(WHICH_COMMAND, ['pinflow']);
    const path = stdout.trim().split('\n')[0]?.trim();
    if (!path) return { available: false, reason: 'not-on-path' };

    try {
      await access(path, constants.X_OK);
    } catch {
      return { available: false, reason: 'not-executable', path };
    }

    return { available: true, path };
  } catch (error) {
    if (isExecError(error) && typeof error.code === 'number' && error.code !== 0) {
      return { available: false, reason: 'not-on-path' };
    }
    return {
      available: false,
      reason: 'unknown',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function isExecError(value: unknown): value is { code?: number } {
  return typeof value === 'object' && value !== null;
}
```

Re-run: tests pass.

- [ ] **Step 3: Verify lint + suite**

```bash
corepack pnpm nx test pinflow-vscode -- cli-detection
corepack pnpm nx lint pinflow-vscode
corepack pnpm nx build pinflow-vscode
```

All green.

- [ ] **Step 4: Commit**

```bash
git -C /home/domi/eventbaer/dev/pinflow add packages/pinflow-vscode/src/core/onboarding/cli-detection.ts packages/pinflow-vscode/src/core/onboarding/cli-detection.spec.ts
git -C /home/domi/eventbaer/dev/pinflow commit -m "feat(vscode): add detectPinFlowCli helper for onboarding cli check"
```

---

## Phase 2 — Auto-Init Spawn Module

### Task 2: `auto-init.ts` + tests

**Files:**
- New: `packages/pinflow-vscode/src/core/onboarding/auto-init.ts`
- New: `packages/pinflow-vscode/src/core/onboarding/auto-init.spec.ts`
- New: `packages/pinflow-vscode/src/core/onboarding/index.ts` (barrel)

- [ ] **Step 1: Write failing tests first**

The module is heavy in vscode-API and child_process interactions, so tests rely on `vi.mock` for both. Mirror the existing pattern in `runs-webview-provider.spec.ts` for vscode mocks.

**Concurrency-lock reset:** the module-level `pendingInits` Set survives between tests; `vi.clearAllMocks` does NOT reset it. Each test must reset state explicitly. Two options:

1. Export `__test_resetPendingInits()` from the module and call it in `beforeEach`.
2. Use `vi.resetModules()` in `beforeEach` to re-evaluate the module fresh.

Option 1 is cleaner — explicit, no module-resolution overhead. Use it.

```ts
import { runInitInAuto, __test_resetPendingInits } from './auto-init.js';

beforeEach(() => {
  __test_resetPendingInits();
  vi.clearAllMocks();
});
```

Required test cases (all 7 in spec):

```ts
describe('runInitInAuto', () => {
  it('skips spawn when pendingInits already contains cwd', async () => { /* ... */ });
  it('invokes onSuccess callback when subprocess exits 0', async () => { /* ... */ });
  it('does not invoke onSuccess on non-zero exit', async () => { /* ... */ });
  it('shows error toast with stderr tail on failure', async () => { /* ... */ });
  it('releases the concurrency lock in both success and failure', async () => { /* ... */ });
  it('shows CLI-not-found toast and offers Open Terminal Anyway', async () => { /* ... */ });
  it('invokes spawn with correct args including --yes --agent and --app-root', async () => { /* ... */ });
});
```

Each test arranges (mock spawn + cli-detection), acts (`await runInitInAuto(...)`), asserts (mock call counts/args + state of pendingInits set).

Run: `corepack pnpm nx test pinflow-vscode -- auto-init`
Expected: FAIL.

- [ ] **Step 2: Implement `auto-init.ts`**

```ts
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as vscode from 'vscode';

import { detectPinFlowCli } from './cli-detection.js';

export interface RunInitInAutoDeps {
  readonly defaultProvider: string;
  readonly onSuccess: () => Promise<void> | void;
  readonly runInitInTerminal: (cwd: string) => void;
}

const pendingInits = new Set<string>();
const SPAWN_TIMEOUT_MS = 180_000;  // 3 min — agent-step may pnpm-install agent CLIs

export async function runInitInAuto(
  cwd: string,
  deps: RunInitInAutoDeps,
): Promise<void> {
  if (pendingInits.has(cwd)) return;
  pendingInits.add(cwd);
  try {
    const cliCheck = await detectPinFlowCli();
    if (!cliCheck.available) {
      await showCliNotFoundToast(cwd, cliCheck.reason, deps.runInitInTerminal);
      return;
    }
    await spawnInit(cwd, deps);
  } finally {
    pendingInits.delete(cwd);
  }
}

async function spawnInit(cwd: string, deps: RunInitInAutoDeps): Promise<void> {
  const folderName = path.basename(cwd);
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `PinFlow setup for ${folderName}`,
      cancellable: false,
    },
    async (progress) => {
      const result = await runSpawn(cwd, deps.defaultProvider, (line) =>
        updateProgressFromLine(progress, line),
      );
      if (result.code === 0) {
        await deps.onSuccess();
        showSuccessToast(folderName);
      } else {
        showFailureToast(folderName, cwd, result.stderr, deps.runInitInTerminal);
      }
    },
  );
}

interface SpawnResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function runSpawn(
  cwd: string,
  defaultProvider: string,
  onStdoutLine: (line: string) => void,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(
      'pinflow',
      ['init', '--yes', '--agent', defaultProvider, '--app-root', cwd],
      { cwd },
    );
    let stdout = '';
    let stderr = '';
    let buffer = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, SPAWN_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      stdout += text;
      buffer += text;
      let nlIdx;
      while ((nlIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        if (line.trim()) onStdoutLine(line);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr || String(err) });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function updateProgressFromLine(
  progress: vscode.Progress<{ message?: string }>,
  line: string,
): void {
  const lowered = line.toLowerCase();
  if (lowered.includes('agent')) progress.report({ message: 'Configuring agent…' });
  else if (lowered.includes('framework')) progress.report({ message: 'Detecting framework…' });
  else if (lowered.includes('monorepo') || lowered.includes('app root')) progress.report({ message: 'Resolving app root…' });
  else if (lowered.includes('gitignore')) progress.report({ message: 'Updating .gitignore…' });
}

async function showCliNotFoundToast(
  cwd: string,
  reason: string | undefined,
  runInitInTerminal: (cwd: string) => void,
): Promise<void> {
  const detail = reason ? ` (${reason})` : '';
  const action = await vscode.window.showErrorMessage(
    `PinFlow CLI not found${detail}. Install it or use Terminal mode.`,
    'Open Terminal Anyway',
    'Open Docs',
  );
  if (action === 'Open Terminal Anyway') runInitInTerminal(cwd);
  if (action === 'Open Docs') {
    void vscode.env.openExternal(
      vscode.Uri.parse('https://github.com/Dom-303/pinflow#readme'),
    );
  }
}

function showSuccessToast(folderName: string): void {
  void vscode.window
    .showInformationMessage(`PinFlow ready in ${folderName}.`, 'Open Folder Status')
    .then((action) => {
      if (action === 'Open Folder Status') {
        void vscode.commands.executeCommand('pinflow.status.focus');
      }
    });
}

function showFailureToast(
  folderName: string,
  cwd: string,
  stderr: string,
  runInitInTerminal: (cwd: string) => void,
): void {
  const tail = stderr.split('\n').slice(-3).join('\n').trim();
  const message = tail
    ? `PinFlow init failed for ${folderName}: ${tail}`
    : `PinFlow init failed for ${folderName}.`;
  void vscode.window
    .showErrorMessage(message, 'Open Terminal')
    .then((action) => {
      if (action === 'Open Terminal') runInitInTerminal(cwd);
    });
}

// Test-only export for resetting the lock between tests
export const __test_resetPendingInits = () => pendingInits.clear();
```

Re-run tests. Iterate until all 7 pass.

- [ ] **Step 3: Add barrel `index.ts`**

```ts
export { runInitInAuto, type RunInitInAutoDeps } from './auto-init.js';
export { detectPinFlowCli, type CliCheckResult } from './cli-detection.js';
```

- [ ] **Step 4: Verify lint + build**

```bash
corepack pnpm nx test pinflow-vscode -- onboarding
corepack pnpm nx lint pinflow-vscode
corepack pnpm nx build pinflow-vscode
```

All green.

- [ ] **Step 5: Commit**

```bash
git -C /home/domi/eventbaer/dev/pinflow add packages/pinflow-vscode/src/core/onboarding/
git -C /home/domi/eventbaer/dev/pinflow commit -m "feat(vscode): add runInitInAuto for terminal-free pinflow init"
```

---

## Phase 3 — Manifest: Setting + New Command

### Task 3: `package.json` setting + command + manifest tests

**Files:**
- Modify: `packages/pinflow-vscode/package.json`
- Modify: `packages/pinflow-vscode/src/extension-manifest.spec.ts`

- [ ] **Step 1: Failing manifest tests**

Add to `extension-manifest.spec.ts`:

```ts
it('contributes pinflow.onboarding.mode setting with auto/terminal enum', () => {
  // Arrange
  const setting = manifest.contributes.configuration.properties['pinflow.onboarding.mode'];

  // Act + Assert
  expect(setting).toBeDefined();
  expect(setting.enum).toEqual(['auto', 'terminal']);
  expect(setting.default).toBe('auto');
});

it('contributes pinflow.runInitInTerminal command', () => {
  // Arrange + Act
  const command = manifest.contributes.commands.find(
    (c: { command: string }) => c.command === 'pinflow.runInitInTerminal',
  );

  // Assert
  expect(command).toBeDefined();
  expect(command.title).toContain('Run Init in Terminal');
});
```

- [ ] **Step 2: Add setting + command to `package.json`**

Insert into `contributes.configuration.properties`:

```json
"pinflow.onboarding.mode": {
  "type": "string",
  "enum": ["auto", "terminal"],
  "enumDescriptions": [
    "Run pinflow init programmatically with safe defaults (no terminal opens). Recommended for most users.",
    "Open a terminal and run 'pinflow init' interactively. Choose this if you want to step through agent/framework/monorepo prompts manually."
  ],
  "default": "auto",
  "description": "How PinFlow should run 'pinflow init' when you click 'Setup PinFlow' on an unconfigured folder."
}
```

Insert into `contributes.commands`:

```json
{
  "command": "pinflow.runInitInTerminal",
  "title": "PinFlow: Run Init in Terminal",
  "category": "PinFlow"
}
```

- [ ] **Step 3: Verify**

```bash
corepack pnpm nx test pinflow-vscode -- extension-manifest
```

Green.

- [ ] **Step 4: Commit**

```bash
git -C /home/domi/eventbaer/dev/pinflow add packages/pinflow-vscode/package.json packages/pinflow-vscode/src/extension-manifest.spec.ts
git -C /home/domi/eventbaer/dev/pinflow commit -m "feat(vscode): contribute onboarding.mode setting + runInitInTerminal command"
```

---

## Phase 4 — Status-View Tooltip Mode-Aware

### Task 4: Tooltip varies by mode + tests

**Files:**
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.ts`
- Modify: `packages/pinflow-vscode/src/core/views/status-view-model.spec.ts`

- [ ] **Step 1: Add `mode` option to `BuildStatusFolderGroupsOptions`**

```ts
export interface BuildStatusFolderGroupsOptions {
  readonly activeFolder?: string;
  readonly externalClaim?: ExternalHandoffClaim | null;
  readonly onboardingMode?: 'auto' | 'terminal';
}
```

- [ ] **Step 2: Build tooltip dynamically**

```ts
function buildSetupTooltip(mode: 'auto' | 'terminal'): string {
  const suffix = mode === 'terminal' ? '(terminal mode)' : '(auto mode)';
  return `Click to scaffold .pinflow/ in this folder ${suffix}`;
}

// inside buildStatusFolderGroups, replace SETUP_ITEM_BASE.tooltip with:
const tooltip = buildSetupTooltip(options.onboardingMode ?? 'auto');
```

Change `SETUP_ITEM_BASE` to omit `tooltip` (it's now per-call).

- [ ] **Step 3: Add 2 new tests**

```ts
it('Setup tooltip in auto mode mentions auto mode', () => {
  // Arrange
  const state = notConfiguredState('/repo');

  // Act
  const groups = buildStatusFolderGroups([state], { onboardingMode: 'auto' });

  // Assert
  expect(groups[0].children[0].tooltip).toContain('(auto mode)');
});

it('Setup tooltip in terminal mode mentions terminal mode', () => {
  // Arrange
  const state = notConfiguredState('/repo');

  // Act
  const groups = buildStatusFolderGroups([state], { onboardingMode: 'terminal' });

  // Assert
  expect(groups[0].children[0].tooltip).toContain('(terminal mode)');
});
```

- [ ] **Step 4: Update existing tooltip-asserting tests** to use the default `'auto'` form (`'(auto mode)'`) or pass `onboardingMode` explicitly.

- [ ] **Step 5: Verify**

```bash
corepack pnpm nx test pinflow-vscode -- status-view-model
corepack pnpm nx lint pinflow-vscode
```

- [ ] **Step 6: Commit**

```bash
git -C /home/domi/eventbaer/dev/pinflow add packages/pinflow-vscode/src/core/views/status-view-model.ts packages/pinflow-vscode/src/core/views/status-view-model.spec.ts
git -C /home/domi/eventbaer/dev/pinflow commit -m "feat(vscode): make Setup tooltip onboarding-mode aware"
```

---

## Phase 5 — Extension Wiring

### Task 5: Dispatch `pinflow.runInit` on mode + register `pinflow.runInitInTerminal` + pass `onboardingMode` to status-view

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`

- [ ] **Step 1: Extract `runInitInTerminal` helper**

Move existing terminal-open logic from inside `pinflow.runInit` handler into a small named function at module scope:

```ts
function runInitInTerminal(cwd: string): void {
  const terminal = vscode.window.createTerminal({ name: 'PinFlow Init', cwd });
  terminal.sendText(formatPinFlowCliCommand(cwd, ['init']));
  terminal.show();
}
```

- [ ] **Step 2: Update `pinflow.runInit` to dispatch on mode**

```ts
vscode.commands.registerCommand('pinflow.runInit', async (folderPath?: unknown) => {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    void vscode.window.showInformationMessage(
      'Open a workspace folder to run PinFlow init.',
    );
    return;
  }
  const cwd = resolveRunInitCwd(folderPath, folders, activeFolder);
  const config = vscode.workspace.getConfiguration('pinflow');
  const mode = config.get<'auto' | 'terminal'>('onboarding.mode', 'auto');
  if (mode === 'terminal') {
    runInitInTerminal(cwd);
    return;
  }
  const provider = config.get<string>('externalHandoff.defaultProvider', 'codex');
  await runInitInAuto(cwd, {
    defaultProvider: provider,
    onSuccess: refreshAll,
    runInitInTerminal,
  });
}),
```

- [ ] **Step 3: Register `pinflow.runInitInTerminal`**

```ts
vscode.commands.registerCommand(
  'pinflow.runInitInTerminal',
  (folderPath?: unknown) => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      void vscode.window.showInformationMessage(
        'Open a workspace folder to run PinFlow init.',
      );
      return;
    }
    const cwd = resolveRunInitCwd(folderPath, folders, activeFolder);
    runInitInTerminal(cwd);
  },
),
```

- [ ] **Step 4: Read mode in `refreshAll` and pass to `buildStatusFolderGroups`**

```ts
const onboardingMode = vscode.workspace
  .getConfiguration('pinflow')
  .get<'auto' | 'terminal'>('onboarding.mode', 'auto');

statusProvider.setFolderGroups(
  buildStatusFolderGroups(folderStates, {
    activeFolder,
    externalClaim,
    onboardingMode,
  }),
);
```

- [ ] **Step 5: Re-read mode on configuration change**

In `activate`, near the existing `onDidChangeConfiguration` listener (or create one if absent):

```ts
context.subscriptions.push(
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('pinflow.onboarding.mode')) {
      void refreshAll();
    }
  }),
);
```

This ensures tooltip updates the moment user flips the setting.

- [ ] **Step 6: Verify**

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx lint pinflow-vscode
corepack pnpm nx build pinflow-vscode
corepack pnpm nx run pinflow-vscode:build:webview
```

All green. Test count remains around 184 (current 169 + 13 added in earlier tasks + 2 in Task 4 = ~184).

- [ ] **Step 7: Commit**

```bash
git -C /home/domi/eventbaer/dev/pinflow add packages/pinflow-vscode/src/extension.ts
git -C /home/domi/eventbaer/dev/pinflow commit -m "feat(vscode): wire onboarding-mode dispatch into pinflow.runInit + add pinflow.runInitInTerminal"
```

---

## Phase 6 — Polish

### Task 6: AAA-Leerzeile fix in C.1.5 folder-section spec

**Files:**
- Modify: `packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.spec.ts`

- [ ] **Step 1: Locate the third unconfigured-state test from C.1.5 review**

The test "does not render run cards when not-configured" (around line 173-184) skips the Act phase and lacks blank-line separation between Arrange and Assert.

- [ ] **Step 2: Fix to canonical AAA**

Insert a blank line between the `await el.updateComplete;` (Arrange end) and the assertions; if the test legitimately has no Act phase (pure render check), keep an explicit `// Act\n// (no behavior — observe initial render)\n` placeholder OR drop the comment and rely on the blank line.

Pattern from .claude/rules/testing.md: blank lines BETWEEN phases. If only Arrange + Assert make sense, separate them with one blank line.

- [ ] **Step 3: Verify**

```bash
corepack pnpm nx test pinflow-vscode -- pinflow-folder-section
```

Green.

- [ ] **Step 4: Commit**

```bash
git -C /home/domi/eventbaer/dev/pinflow add packages/pinflow-vscode/src/runs-webview/components/pinflow-folder-section.spec.ts
git -C /home/domi/eventbaer/dev/pinflow commit -m "chore(vscode): apply AAA blank-line nit from c1.5 review"
```

### Task 7: Investigate executable-bit Build Step (time-boxed 30 min)

**Files:** likely `packages/pinflow-cli/package.json` or root nx target config.

- [ ] **Step 1: Check current state**

```bash
ls -la /home/domi/eventbaer/dev/pinflow/dist/packages/pinflow-cli/bin/pinflow.js
# expected: -rw-r--r-- (no x bit)
```

- [ ] **Step 2: Find a one-liner fix**

Options to evaluate (in priority):

a) Add `"postbuild": "chmod +x dist/packages/pinflow-cli/bin/pinflow.js"` to root or pinflow-cli package.json
b) Add `chmod +x` to the `sync-dist` target in `scripts/nx-plugin.ts` if there's a hook
c) Add a new tiny nx target `chmod-bin` that runs after build via `dependsOn`

If any of (a)/(b)/(c) lands in <30 min and survives `nx run-many -t test,build`, ship it. Otherwise defer to a separate followup PR.

- [ ] **Step 3: If implemented, verify**

```bash
rm -rf dist/packages/pinflow-cli
corepack pnpm nx build pinflow-cli
ls -la dist/packages/pinflow-cli/bin/pinflow.js
# expected: -rwxr-xr-x
```

- [ ] **Step 4: Commit (only if landed)**

```bash
git -C /home/domi/eventbaer/dev/pinflow add <files>
git -C /home/domi/eventbaer/dev/pinflow commit -m "chore(cli): preserve executable bit on pinflow.js after build"
```

---

## Phase 7 — End-to-End Verification

### Task 8: Quality gate + VSIX rebuild

**Files:** none

- [ ] **Step 1: Full quality gate**

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

Output: `tmp/pinflow-vscode.vsix`.

- [ ] **Step 3: Hand off to user for manual smoke**

Stop. User runs the 11-step smoke from spec § Manual Smoke Test.

### Task 9: User-driven manual smoke test

**Files:** none

- [ ] User installs VSIX
- [ ] User runs 11-step smoke (auto-mode happy path, CLI not found, failure path, terminal-mode via setting, terminal-mode via Command Palette, tooltip mode-aware, concurrency lock, refresh integration, no regression)
- [ ] User reports findings → either Push or Hotfix

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

All eight green. Then user runs manual smoke.

---

## Expected end-state summary

- **pinflow-vscode tests:** 169 → ~184 (+15 net new across cli-detection (4), auto-init (7), status-view-model (2), manifest (2))
- **pinflow-relay:** unchanged (421)
- **VSIX bundle:** ~210 KB (≤3 KB increase from new onboarding module)
- **New manifest contributions:**
  - Setting `pinflow.onboarding.mode` (`'auto' | 'terminal'`, default `'auto'`)
  - Command `pinflow.runInitInTerminal` (Command Palette only)
- **Behavior changes:**
  - Default Setup PinFlow click → background `pinflow init --yes --agent <provider> --app-root <folder>` with progress notification + success toast. No terminal opens.
  - `pinflow.onboarding.mode = 'terminal'` → Setup PinFlow click opens terminal (today's behavior).
  - `pinflow.runInitInTerminal` always opens terminal regardless of setting.
  - Status Setup-tooltip indicates active mode.
  - On successful auto-init, refreshAll fires immediately (folder flips to configured within ~1s).
  - On configuration change of `pinflow.onboarding.mode`, refreshAll fires (tooltip updates live).
- **No breaking changes** to webview message protocol.
- **Polish:** AAA-Leerzeile-nit fixed; executable-bit build step landed if doable in 30 min, else deferred.
