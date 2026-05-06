# C.1.12 Auto-Install Framework Plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Setup PinFlow" auto-installs `@pinflow/react` (or `@pinflow/vue`), patches `vite.config.ts` to wire `pinflow()` into the plugins array, and produces a working overlay in the browser without any manual file edits.

**Architecture:** Extended `app-detection.ts` produces `FrameworkId`. New leaf modules: `package-manager.ts`, `package-installer.ts`, `vite-config-patcher.ts`, `framework-snippets.ts`, `framework-plugin.ts`. Wizard gains a per-app install+patch phase between config-write and post-install agent step.

**Tech Stack:** Node `child_process.spawn` (argv-based, no shell), Node `fs/promises`, VS Code `OutputChannel`, `withProgress`, regex-based source patcher with backup + idempotency + validation.

**Spec:** [`docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c112-auto-plugin-install-design.md`](../specs/2026-05-06-pinflow-vscode-package-4c112-auto-plugin-install-design.md)

---

## Conventions

- Match existing file style: named exports only, `.js` extension on all imports, AAA test structure with blank lines between phases.
- Constructor DI for all external deps (fs, child_process, vscode). **No** `vi.mock` on Node built-ins.
- Tests use real `fs/promises` against `mkdtempSync` temp dirs (writer + patcher pattern from C.1.9).
- Run tests via `corepack pnpm exec vitest` in the package dir; nx tasks via `corepack pnpm exec nx ...` in repo root.
- Each task ends with: `nx typecheck pinflow-vscode && nx test pinflow-vscode` green, then commit.
- One commit per task, message style `feat(vscode): ...` / `refactor(vscode): ...`.
- All process spawning uses `spawn(bin, [...args])` with split argv arrays (never shell strings, never `exec`). The package manager's install command (e.g. `'pnpm add -D'`) is split on whitespace into argv.

---

## File Structure

| Path | Purpose | Change |
|---|---|---|
| `src/core/onboarding/wizard/app-detection.ts` | Framework classification | Extend to `FrameworkId` |
| `src/core/onboarding/wizard/app-detection.spec.ts` | Detection tests | Updated assertions |
| `src/core/onboarding/wizard/package-manager.ts` | Lockfile-based PM detection | **NEW** |
| `src/core/onboarding/wizard/package-manager.spec.ts` | PM tests | **NEW** |
| `src/core/onboarding/wizard/package-installer.ts` | spawn-based install | **NEW** |
| `src/core/onboarding/wizard/package-installer.spec.ts` | Installer tests | **NEW** |
| `src/core/onboarding/wizard/vite-config-patcher.ts` | Regex patcher with backup | **NEW** |
| `src/core/onboarding/wizard/vite-config-patcher.spec.ts` | Patcher tests | **NEW** |
| `src/core/onboarding/wizard/framework-snippets.ts` | Snippet templates | **NEW** |
| `src/core/onboarding/wizard/framework-snippets.spec.ts` | Snippet tests | **NEW** |
| `src/core/onboarding/wizard/framework-plugin.ts` | Per-app orchestrator | **NEW** |
| `src/core/onboarding/wizard/framework-plugin.spec.ts` | Orchestrator tests | **NEW** |
| `src/core/onboarding/wizard/monorepo-step.ts` | Multi-select labels | Use `FRAMEWORKS` table |
| `src/core/onboarding/wizard/monorepo-step.spec.ts` | Labels tests | Updated |
| `src/core/onboarding/wizard/wizard.ts` | Orchestrator | Add Phase 7.5 |
| `src/core/onboarding/wizard/wizard.spec.ts` | Wizard tests | Updated for new flow |
| `src/core/onboarding/wizard/snippets.ts` | pinflow.config.json snippet | Update FrameworkId type, bucket back to vite/webpack/next/nuxt for runtime compatibility |
| `src/core/onboarding/wizard/snippets.spec.ts` | Updated | |
| `src/core/onboarding/wizard/config-writer.ts` | per-app config writer | Update FrameworkId type |
| `src/core/onboarding/wizard/config-writer.spec.ts` | Updated | |
| `src/extension.ts` | Activation | Output channel registration |

---

## Task 1 — Extended `app-detection.ts`: produce `FrameworkId`

**Files:**
- Modify: `src/core/onboarding/wizard/app-detection.ts`
- Modify: `src/core/onboarding/wizard/app-detection.spec.ts`

- [ ] **Step 1: Replace `app-detection.ts` with extended detection** (full code in Task 1 of the previous plan revision; see commit history of this plan branch for the exact source). Key bullets:
  - Define `FrameworkId` union type and the `FRAMEWORKS` lookup table with `{ id, label, package, configFile }` per framework.
  - Add `getFrameworkConfig(id)` accessor.
  - Make `DetectedApp.framework` of type `FrameworkId` (required, narrowed).
  - Replace `classifyFramework` body with the precedence rules from the spec §1 (next/nuxt/vite+react/vite+vue/vite/webpack+react/webpack+vue/webpack), returning `undefined` if nothing matches.
  - Keep root + depth-1/2 walking unchanged from C.1.11.

The full source is reproduced in `task1-app-detection.snippet.md` next to this plan if helpful — but the implementer can also derive it from the spec directly.

- [ ] **Step 2: Update `app-detection.spec.ts`** — replace existing assertions and add new ones (concrete cases listed below).

Existing-case updates:
- "returns single entry when cwd has package.json with vite dep" → rename to "classifies bare vite as other-vite"; expected framework `'other-vite'`.
- "returns two entries for monorepo": both subpkg fixtures should now classify (vite-only → `'other-vite'`; webpack-only → `'other-webpack'`).
- "detects next framework": expected `'next'` (unchanged in spirit).
- "returns only frontend apps from a monorepo (eventbear-web case)": fixture for apps/web becomes `{ dependencies: { react: '^18.0.0' }, devDependencies: { vite: '^5.0.0' } }`; assert framework `'react-vite'`.

New cases (each with its own `it()`):
- `vite + react` → `'react-vite'`
- `vite + vue` → `'vue-vite'`
- `vite` only (no react/vue) → `'other-vite'`
- `webpack + react` → `'react-webpack'`
- `webpack + vue` → `'vue-webpack'`
- `webpack` only → `'other-webpack'`
- `next + react` (next dep alone forces `'next'` even when vite isn't present) → `'next'`

- [ ] **Step 3: Run tests**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/app-detection.spec.ts
```

- [ ] **Step 4: Typecheck — expected to surface drift in consumers (monorepo-step, wizard, snippets, config-writer). Leave them, they're fixed in Task 6.**

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/app-detection.ts packages/pinflow-vscode/src/core/onboarding/wizard/app-detection.spec.ts
git commit -m "feat(vscode): app-detection produces FrameworkId (react-vite/vue-vite/...)"
```

---

## Task 2 — `package-manager.ts`

**Files:**
- Create: `src/core/onboarding/wizard/package-manager.ts`
- Create: `src/core/onboarding/wizard/package-manager.spec.ts`

- [ ] **Step 1: Module source.** A small DI-driven detector that checks lockfiles at the workspace root in priority order: pnpm-lock.yaml → yarn.lock → bun.lock(b) → npm fallback. Returns `{ id, label, installCmd }` from a hardcoded `PACKAGE_MANAGERS` table mirroring relay's. Inject `fileExists(path) => boolean` for testability.

- [ ] **Step 2: Tests (6 cases):**
  - pnpm-lock present → pnpm
  - yarn.lock present → yarn
  - bun.lock present → bun
  - bun.lockb present (binary form) → bun
  - no lockfile → npm fallback
  - both pnpm-lock + yarn.lock → pnpm wins (priority order)

- [ ] **Step 3: Run tests + commit**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/package-manager.spec.ts
git add ...
git commit -m "feat(vscode): add package-manager detection from lockfiles"
```

---

## Task 3 — `package-installer.ts`

**Files:**
- Create: `src/core/onboarding/wizard/package-installer.ts`
- Create: `src/core/onboarding/wizard/package-installer.spec.ts`

**Module behavior:**

```ts
export interface PackageInstallerDeps {
  // Argv-based command runner. NEVER pass shell strings — only split argv arrays.
  readonly runCommand: (
    bin: string,
    args: readonly string[],
    options: { cwd: string; onOutput: (line: string) => void },
  ) => Promise<{ exitCode: number }>;
  readonly readJson: (p: string) => Promise<Record<string, unknown> | undefined>;
}

export type InstallStatus = 'installed' | 'already-present' | 'failed';

export async function installPackage(
  appPath: string,
  packageName: string,
  pm: PackageManagerConfig,
  onOutput: (line: string) => void,
  deps?: PackageInstallerDeps,
): Promise<{ status: InstallStatus; stderr?: string }>;
```

- Default `runCommand` uses `spawn(bin, [...args], { cwd })` from `node:child_process` (argv-style, no shell). Stdout + stderr are split into lines and forwarded to `onOutput`. Resolves with `{ exitCode }` when the child closes.
- Default `readJson` reads `package.json` and parses it; returns `undefined` on missing/invalid file.
- Idempotency: parse the app's `package.json`; if `packageName` is in `dependencies` or `devDependencies`, skip and return `'already-present'`.
- On install: split `pm.installCmd` (e.g. `'pnpm add -D'`) on whitespace to get argv, append `packageName`, run via `runCommand`. Non-zero exit → `'failed'` with `stderr: 'Exit code N'`.
- Always emit a `$ <full command>` line via `onOutput` before running.

**Tests (6 cases, all with mocked deps — never spawn for real):**
- already in `dependencies` → returns `'already-present'`, no runCommand call
- already in `devDependencies` → same
- not installed → runs `pnpm` with argv `['add', '-D', '@pinflow/react']` and cwd
- streams output: `runCommand` mock invokes `onOutput('added 1 package in 3s')` → assertion that the line reached the caller
- non-zero exit code → returns `'failed'` with stderr containing `'Exit code 127'`
- missing package.json (`readJson` returns undefined) → proceeds with install

Run tests + commit.

---

## Task 4 — `vite-config-patcher.ts` (highest-risk task)

**Files:**
- Create: `src/core/onboarding/wizard/vite-config-patcher.ts`
- Create: `src/core/onboarding/wizard/vite-config-patcher.spec.ts`

**Module strategy** (also documented in spec §4):

1. Locate config: try `vite.config.ts`, `vite.config.js`, `vite.config.mjs` in order. None → return `'no-config-file'`.
2. Idempotency: if source already matches `/@pinflow\/(react|vue)\/vite/` → return `'already-patched'` (no backup, no write).
3. Backup: copy `<configFile>` → `<configFile>.pinflow-backup`.
4. Insert import after the last top-level `^import .+;?$` line. Pattern miss → return `'pattern-miss'`.
5. Insert plugin: search `/plugins\s*:\s*\[/`. If not found → `'pattern-miss'`. If found, search inside the array for `react()` (or `vue()` for vue-vite). If found, insert `pinflow(),\n<indent>` immediately after that factory line, preserving the leading whitespace. If not found, fall back to inserting `\n    pinflow(),` right after the opening `[`.
6. Validate the patched source: contains the new import, contains `pinflow()`, the count of `<word>(` factory calls did not decrease vs. original. Validation fail → return `'pattern-miss'` (the original file is untouched at this point because we haven't written yet).
7. Only on validation pass: write the patched source. Return `'patched'` with `{ configFile, backupFile, importLine, pluginLine }`.

**DI surface:** `readFile`, `writeFile`, `copyFile`, `fileExists` — defaults wrap `node:fs/promises`.

**Tests (9 cases, all using `mkdtempSync` temp dirs + real fs):**

1. Clean react-vite config: import + `pinflow()` after `react()`, status `'patched'`.
2. Vue-vite config: vue/vite import + `pinflow()` after `vue()`.
3. Multi-plugin config preserves `otherPlugin()`, `resolve.alias`, etc.
4. Idempotent: re-running on already-patched source is no-op (`'already-patched'`).
5. Backup file is created on first patch and equals the original.
6. No config file in dir → `'no-config-file'`.
7. Detects `vite.config.js` (not just `.ts`).
8. Config without `plugins:` array → `'pattern-miss'`, original file unchanged.
9. Config with `plugins: [customPlugin()]` (no react/vue factory) → still patches via fallback after `[`, original `customPlugin()` remains.

Run tests + commit.

---

## Task 5 — `framework-snippets.ts` + `framework-plugin.ts`

**Files (4 NEW):**
- `src/core/onboarding/wizard/framework-snippets.ts`
- `src/core/onboarding/wizard/framework-snippets.spec.ts`
- `src/core/onboarding/wizard/framework-plugin.ts`
- `src/core/onboarding/wizard/framework-plugin.spec.ts`

### `framework-snippets.ts`

A pure module exporting `getFrameworkSnippet(framework: FrameworkId): string`. Returns the snippet for each framework — adapt the snippet text from `pinflow-relay/src/cli/init/snippets.ts` (the relay already has tested templates for each framework × runner combination). For this MVP we don't need runner-specific variants — the wizard always uses the auto-patch path for vite, so vite snippets are only shown on pattern-miss as a hint, not as a runtime choice.

Provide entries for all 8 `FrameworkId` values. The webpack/next/nuxt entries are the proper full snippets. The `react-vite` / `vue-vite` snippets can be small hints (single-line import + comment showing where to put `pinflow()`).

**Tests (4 cases):**
- Every `FrameworkId` produces a non-empty string.
- next snippet contains `withPinFlow`.
- nuxt snippet contains `modules: ['@pinflow/nuxt']`.
- react-webpack snippet contains `@pinflow/transform/webpack-loader`.

### `framework-plugin.ts`

The per-app orchestrator. Imports the leaf modules and exposes:

```ts
export type FrameworkPluginStatus = 'patched' | 'snippet-only' | 'install-failed';

export interface FrameworkPluginResult {
  readonly status: FrameworkPluginStatus;
  readonly framework: FrameworkId;
  readonly appPath: string;
  readonly detail?: string;
}

export interface FrameworkPluginDeps {
  readonly detectPackageManager: (workspaceRoot: string) => PackageManagerConfig;
  readonly installPackage: (
    appPath: string,
    pkg: string,
    pm: PackageManagerConfig,
    onOutput: (line: string) => void,
  ) => Promise<{ status: 'installed' | 'already-present' | 'failed'; stderr?: string }>;
  readonly patchViteConfig: (
    appPath: string,
    framework: 'react-vite' | 'vue-vite',
  ) => Promise<{ status: 'patched' | 'already-patched' | 'no-config-file' | 'pattern-miss'; configFile?: string }>;
  readonly showSnippetFallback: (input: {
    appPath: string;
    framework: FrameworkId;
    snippet: string;
  }) => Promise<void>;
}

export async function installFrameworkPlugin(
  appPath: string,
  framework: FrameworkId,
  workspaceRoot: string,
  onOutput: (line: string) => void,
  deps?: FrameworkPluginDeps,
): Promise<FrameworkPluginResult>;
```

Behavior:
1. Detect package manager from workspace root.
2. Resolve `FrameworkConfig` from `getFrameworkConfig(framework)` (gives `{ package, configFile, label }`).
3. Run `installPackage(appPath, fwConfig.package, pm, onOutput)`. On `'failed'` → return `'install-failed'` immediately (don't try to patch a config we couldn't even install for).
4. If framework is `'react-vite'` or `'vue-vite'`: call `patchViteConfig(appPath, framework)`. On `'patched'` or `'already-patched'` → return `'patched'`. On `'no-config-file'` or `'pattern-miss'` → call `showSnippetFallback` and return `'snippet-only'` (with `detail: <patchStatus>`).
5. For all other frameworks (webpack/next/nuxt/other-*): always call `showSnippetFallback` after install and return `'snippet-only'`.

Default `showSnippetFallback` is a no-op stub — the wizard provides the real VS Code surface (open file + clipboard + toast).

**Tests (6 cases):**
- react-vite happy path: install + patch called, status `'patched'`, snippet not shown.
- vue-vite happy path: installs `@pinflow/vue`, patches with `vue-vite`.
- install fails → status `'install-failed'`, patch not called.
- Vite pattern-miss → install runs, patch returns pattern-miss → snippet shown → status `'snippet-only'` with `detail: 'pattern-miss'`.
- next: installs `@pinflow/next`, patch not called, snippet shown, status `'snippet-only'`.
- react-webpack: installs `@pinflow/react`, patch not called, snippet shown.

Run tests for both new modules + commit.

---

## Task 6 — Wire wizard.ts: Phase 7.5 + monorepo-step labels + writer types + extension activation

**Files:**
- Modify: `src/core/onboarding/wizard/wizard.ts`
- Modify: `src/core/onboarding/wizard/wizard.spec.ts`
- Modify: `src/core/onboarding/wizard/monorepo-step.ts`
- Modify: `src/core/onboarding/wizard/monorepo-step.spec.ts`
- Modify: `src/core/onboarding/wizard/snippets.ts`
- Modify: `src/core/onboarding/wizard/snippets.spec.ts`
- Modify: `src/core/onboarding/wizard/config-writer.ts`
- Modify: `src/core/onboarding/wizard/config-writer.spec.ts`
- Modify: `src/extension.ts`

This is the largest single task. Plan the edits before writing.

### Step 1: Update `snippets.ts` for FrameworkId + bucket the value back for runtime compatibility

The runtime config schema (`packages/pinflow-relay/src/cli/config-loader.ts` and `@pinflow/core` schema) accepts the legacy bucket values `'vite' | 'webpack' | 'next' | 'nuxt'` for the `framework` field of `pinflow.config.json`. Map FrameworkId back to a bucket before writing:

```ts
function frameworkBucket(id: FrameworkId): 'vite' | 'webpack' | 'next' | 'nuxt' {
  if (id === 'next') return 'next';
  if (id === 'nuxt') return 'nuxt';
  if (id.endsWith('-vite')) return 'vite';
  return 'webpack';
}

// in generatePinflowConfigJson:
const config = {
  appRoot: '.',
  framework: frameworkBucket(input.framework),
  runner: { provider: agentToProvider(input.agent) },
};
```

Update `SnippetInput.framework` type to `FrameworkId`.

Update `snippets.spec.ts`: every test should pass FrameworkId values (e.g. `'react-vite'`) and assert the bucketed value (`'vite'`) ends up in the JSON. Add explicit tests:
- `react-vite` → `framework: 'vite'`
- `vue-webpack` → `framework: 'webpack'`
- `next` → `framework: 'next'`
- `nuxt` → `framework: 'nuxt'`
- `other-vite` → `framework: 'vite'`

### Step 2: Update `config-writer.ts` types

`SnippetInput['framework']` is now `FrameworkId`. The `WriteConfigBatchInput.perApp` entries inherit the type. No behavior change. Update `config-writer.spec.ts` callers to pass `'react-vite'` (or any other valid id) where they previously passed `'vite'` etc.

### Step 3: Update `monorepo-step.ts` to show readable labels

Replace `description: app.framework` (which is now `'react-vite'` etc., not friendly) with the human label from the `FRAMEWORKS` table:

```ts
import { FRAMEWORKS, type FrameworkId } from './app-detection.js';

function frameworkLabel(id: FrameworkId): string {
  return FRAMEWORKS.find((f) => f.id === id)?.label ?? id;
}

// in items map:
description: frameworkLabel(app.framework),
```

Update `monorepo-step.spec.ts` to expect the readable labels in the `description` field (e.g. `'React + Vite'` instead of `'react-vite'`).

### Step 4: Update `wizard.ts` — DI surface + Phase 7.5

**DI surface additions** in `WizardInternalDeps`:

```ts
readonly installFrameworkPlugin: (
  appPath: string,
  framework: FrameworkId,
  workspaceRoot: string,
  onOutput: (line: string) => void,
) => Promise<FrameworkPluginResult>;
readonly withProgress: <T>(
  title: string,
  task: (
    report: (progress: { message?: string; increment?: number }) => void,
  ) => Promise<T>,
) => Promise<T>;
readonly outputAppend: (line: string) => void;
readonly outputShow: () => void;
```

**Default impls in `DEFAULT_INTERNAL_DEPS`:**

- `installFrameworkPlugin`: passes through to `installFrameworkPlugin` from `framework-plugin.ts` with a real `showSnippetFallback` that uses VS Code:
  - `vscode.workspace.openTextDocument(<configPath>)` + `showTextDocument` (catches errors and falls through to an untitled doc with the snippet content if the file doesn't exist).
  - `vscode.window.showInformationMessage(<message>, 'Snippet kopieren', 'Snippet anzeigen', 'Verstanden')`.
  - On `'Snippet kopieren'`: `vscode.env.clipboard.writeText(snippet)`.
  - On `'Snippet anzeigen'`: open an untitled doc with the snippet text.
- `withProgress`: thin wrapper around `vscode.window.withProgress({ location: Notification, title }, task)`.
- `outputAppend` / `outputShow`: lazy module-level singleton — `let cachedOutputChannel: vscode.OutputChannel | undefined; function getOutputChannel() { if (!cachedOutputChannel) cachedOutputChannel = vscode.window.createOutputChannel('PinFlow Setup'); return cachedOutputChannel; }`. `outputAppend` calls `appendLine`, `outputShow` calls `show(true)`.

**New Phase 7.5** (between current Phase 7 = write configs, and Phase 8 = post-install agent):

```ts
// Phase 7.5 — install + auto-patch framework plugin per app
const failures: FrameworkPluginResult[] = [];
const headerSep = '═════════════════════════════════════════════════════════';
internal.outputAppend(`\n${headerSep}`);
internal.outputAppend(
  `PinFlow Setup · ${new Date().toISOString()} · ${cwd}`,
);
internal.outputAppend(headerSep);

await internal.withProgress(
  'PinFlow: Plugin einrichten',
  async (report) => {
    for (let i = 0; i < perApp.length; i++) {
      const entry = perApp[i];
      const rel = path.relative(cwd, entry.appPath) || path.basename(entry.appPath);
      report({ message: `(${i + 1}/${perApp.length}) ${rel}` });
      const result = await internal.installFrameworkPlugin(
        entry.appPath,
        entry.framework,
        cwd,
        (line) => internal.outputAppend(`[${rel}] ${line}`),
      );
      if (result.status === 'install-failed') failures.push(result);
    }
  },
);

if (failures.length > 0) {
  const apps = failures
    .map((f) => path.relative(cwd, f.appPath) || path.basename(f.appPath))
    .join(', ');
  const action = await internal.showErrorMessage(
    `Plugin-Setup fehlgeschlagen für: ${apps}.`,
    'Output anzeigen',
  );
  if (action === 'Output anzeigen') internal.outputShow();
}
```

The wizard still proceeds to Phase 8 (post-install agent step) even if Phase 7.5 had failures — recoverable, and the user shouldn't lose the agent setup.

### Step 5: Update `wizard.spec.ts`

- Extend `makeInternalDeps` with stubs for `installFrameworkPlugin` (default `vi.fn(async () => ({ status: 'patched', framework: 'react-vite', appPath: '/repo' }))`), `withProgress` (default `vi.fn(async (_title, task) => task(vi.fn()))`), `outputAppend` (default `vi.fn()`), `outputShow` (default `vi.fn()`).
- Update happy-path tests to expect `installFrameworkPlugin` called once per app in `perApp`, with the correct args.
- Update test fixtures: `detectApps` mocks return apps with `framework: 'react-vite'` (not `'vite'`); the wizard then propagates that to `installFrameworkPlugin`.
- Add new test: install-failed path. `installFrameworkPlugin` returns `{ status: 'install-failed', ... }`. Assert `showErrorMessage` was called with `'Plugin-Setup fehlgeschlagen für: ...'` and `'Output anzeigen'`. Assert post-install **still runs** (failure mode is recoverable).
- Existing reconfigure / cancellation / concurrency tests still apply unchanged in spirit; just adjust the framework values in fixtures.

### Step 6: Update `extension.ts`

Add output channel creation on activation. Push to subscriptions for proper disposal. The wizard uses the lazy singleton from Step 4 above, which is fine — but creating it explicitly in the extension's lifecycle keeps disposal clean. Either approach works; the lazy singleton is simplest.

```ts
// Optional: pre-create + register for disposal
const outputChannel = vscode.window.createOutputChannel('PinFlow Setup');
context.subscriptions.push(outputChannel);
```

If using the lazy singleton, no extension.ts change is required.

### Step 7: Run + commit

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/
cd packages/pinflow-vscode && corepack pnpm exec tsc -p tsconfig.lib.json --noEmit
git add packages/pinflow-vscode/src/core/onboarding/wizard/ packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): wizard auto-installs framework plugin and patches vite.config"
```

---

## Task 7 — Full quality gate + VSIX rebuild

- [ ] **Step 1: Lint, typecheck, full test**

```bash
corepack pnpm exec nx lint pinflow-vscode && corepack pnpm exec nx typecheck pinflow-vscode && corepack pnpm exec nx test pinflow-vscode
```

- [ ] **Step 2: Build VSIX**

```bash
corepack pnpm --filter pinflow-vscode run package:vsix
```

If `registry:publish` bumps versions in tracked package.jsons: `git checkout -- package.json packages/*/package.json`.

- [ ] **Step 3: Commit cleanup if any**

---

## Task 8 — Push, PR, merge

- [ ] **Step 1: Push**

```bash
git push -u origin feature/c112-auto-plugin-install
```

- [ ] **Step 2: PR**

Title: `feat(vscode): C.1.12 auto-install framework plugin + auto-patch vite.config`

Body summarizes:
- Closes the gap from C.1.11 smoke (overlay never injected because @pinflow/react wasn't installed and vite.config wasn't wired).
- Adds extended detection (FrameworkId) + package-manager + installer + vite patcher + orchestrator + Phase 7.5.
- Net effect on eventbear-web: 1-click setup, overlay tab in browser.

- [ ] **Step 3: Merge**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull origin main --ff-only
```

---

## Self-Review

- [x] **Spec coverage:**
  - §1 Extended detection → Task 1
  - §2 Package-manager detection → Task 2
  - §3 Package installer → Task 3
  - §4 Vite config patcher → Task 4
  - §5 Plugin orchestrator → Task 5
  - §6 Snippet fallback → Task 5 (snippets module) + Task 6 (wizard wiring of `showSnippetFallback`)
  - §7 Wizard integration → Task 6
  - §8 Output channel → Task 6 step 4-6
- [x] **Placeholder scan:** no TBDs / fill-in-laters. Each step has a concrete instruction or interface.
- [x] **Type consistency:** `FrameworkId` defined in Task 1 and consumed everywhere downstream. `PackageManagerConfig`, `InstallStatus`, `PatchStatus`, `FrameworkPluginStatus` all defined where used.
- [x] **No shell-string command execution.** All process spawning uses `spawn(bin, [...args])` with split argv arrays. The package manager's `installCmd` (e.g. `'pnpm add -D'`) is split on whitespace into argv before spawning. The package name is appended as a separate argv element. No interpolation into a shell string anywhere.

## Execution

Plan complete. User has pre-authorized subagent-driven execution. Proceed via subagent-driven-development: one Sonnet implementer subagent per task, push/merge end-to-end without per-step confirmation.
