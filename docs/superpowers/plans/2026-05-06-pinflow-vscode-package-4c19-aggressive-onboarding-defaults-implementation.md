# C.1.9 Aggressive Onboarding Defaults — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-extension PinFlow wizard match the "klick und es geht" promise: framework auto-skip when detected, app-root multi-select for monorepos, honest dynamic step counter, drop the known-broken codex marketplace command, German UI throughout, write per-app config with relative `appRoot`, and a clean reconfigure path.

**Architecture:** Same DI shape as C.1.7/C.1.8 — pure leaf modules (snippets, app-detection, config-writer, post-install, existing-configs) wrapped by the wizard orchestrator. `pickAppRoot` returns `string[]`, `writeWizardConfig` takes a batch of `{appPath, framework}`, the orchestrator computes a step plan upfront and decides which steps actually run.

**Tech Stack:** TypeScript ESM, Vitest + happy-dom, VS Code Extension API (QuickPick `canPickMany`, `showInformationMessage`), Node `fs/promises`.

**Spec:** [`docs/superpowers/specs/2026-05-06-pinflow-vscode-package-4c19-aggressive-onboarding-defaults-design.md`](../specs/2026-05-06-pinflow-vscode-package-4c19-aggressive-onboarding-defaults-design.md)

---

## Conventions for every task

- Match existing file style: named exports only, `.js` extension on all imports, AAA test structure with blank lines between phases.
- Constructor DI for `vscode.window` surfaces. **No** `vi.mock` on `vscode` or Node built-ins — pass functions through `deps`.
- Every task ends with: `nx typecheck pinflow-vscode && nx test pinflow-vscode` green, then commit.
- Use `corepack pnpm` if `pnpm` is not on PATH (consistent with prior phases on this machine).
- One commit per task — keep messages tight (`feat(vscode): ...`, `refactor(vscode): ...`).

---

## File Structure

| Path | Purpose | Change |
|---|---|---|
| `packages/pinflow-vscode/src/core/onboarding/wizard/existing-configs.ts` | Detects which app paths already have `pinflow.config.json` | **NEW** |
| `packages/pinflow-vscode/src/core/onboarding/wizard/existing-configs.spec.ts` | Tests for the helper | **NEW** |
| `packages/pinflow-vscode/src/core/onboarding/wizard/snippets.ts` | Config JSON generator | `appRoot` always `"."` |
| `packages/pinflow-vscode/src/core/onboarding/wizard/snippets.spec.ts` | Snippet tests | Updated assertions |
| `packages/pinflow-vscode/src/core/onboarding/wizard/config-writer.ts` | Writes config + gitignore | New batch signature, drop existence guard, write per-app with relative root |
| `packages/pinflow-vscode/src/core/onboarding/wizard/config-writer.spec.ts` | Writer tests | Rewritten for batch shape |
| `packages/pinflow-vscode/src/core/onboarding/wizard/post-install.ts` | Post-install toast + commands | Drop broken codex marketplace command, German strings |
| `packages/pinflow-vscode/src/core/onboarding/wizard/post-install.spec.ts` | Post-install tests | Updated for 1-cmd codex + German strings |
| `packages/pinflow-vscode/src/core/onboarding/wizard/framework-step.ts` | Framework picker | Auto-skip when detected, accept step label, drop badge mode |
| `packages/pinflow-vscode/src/core/onboarding/wizard/framework-step.spec.ts` | Framework step tests | Skip path test, no-detection path test |
| `packages/pinflow-vscode/src/core/onboarding/wizard/monorepo-step.ts` | App-root picker | Multi-select with `canPickMany: true`, return `string[]`, accept step label |
| `packages/pinflow-vscode/src/core/onboarding/wizard/monorepo-step.spec.ts` | App-root tests | Multi-select shape, all-checked default, empty-selection cancel |
| `packages/pinflow-vscode/src/core/onboarding/wizard/agent-step.ts` | Agent picker | Accept step label, German placeholder |
| `packages/pinflow-vscode/src/core/onboarding/wizard/agent-step.spec.ts` | Agent step tests | German placeholder assertion |
| `packages/pinflow-vscode/src/core/onboarding/wizard/wizard.ts` | Orchestrator | Step plan, reconfigure prompt, multi-app loop, German error |
| `packages/pinflow-vscode/src/core/onboarding/wizard/wizard.spec.ts` | Orchestrator tests | New flow tests |

No changes to `app-detection.ts` (logic unchanged), `agent-detection.ts`, `cli-detection.ts`, or `extension.ts` (the wizard surface stays the same from outside).

---

## Task 1 — `existing-configs.ts`: detect which app paths already have a config

**Files:**
- Create: `packages/pinflow-vscode/src/core/onboarding/wizard/existing-configs.ts`
- Create: `packages/pinflow-vscode/src/core/onboarding/wizard/existing-configs.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// existing-configs.spec.ts
import { describe, it, expect, vi } from 'vitest';

import { detectExistingConfigs } from './existing-configs.js';

describe('detectExistingConfigs', () => {
  it('returns the subset of paths whose pinflow.config.json exists', async () => {
    // Arrange
    const accessFn = vi.fn(async (path: string) => {
      if (path === '/repo/apps/web/pinflow.config.json') return;
      throw new Error('ENOENT');
    });

    // Act
    const result = await detectExistingConfigs(
      ['/repo/apps/web', '/repo/apps/api'],
      { access: accessFn },
    );

    // Assert
    expect(result).toEqual(['/repo/apps/web']);
  });

  it('returns empty array for empty input', async () => {
    // Arrange
    const accessFn = vi.fn();

    // Act
    const result = await detectExistingConfigs([], { access: accessFn });

    // Assert
    expect(result).toEqual([]);
    expect(accessFn).not.toHaveBeenCalled();
  });

  it('returns empty array when no configs exist', async () => {
    // Arrange
    const accessFn = vi.fn(async () => {
      throw new Error('ENOENT');
    });

    // Act
    const result = await detectExistingConfigs(
      ['/repo/apps/web', '/repo/apps/api'],
      { access: accessFn },
    );

    // Assert
    expect(result).toEqual([]);
  });

  it('runs access calls in parallel', async () => {
    // Arrange
    const order: string[] = [];
    const accessFn = vi.fn(async (path: string) => {
      order.push(`start:${path}`);
      await new Promise((r) => setTimeout(r, 10));
      order.push(`end:${path}`);
    });

    // Act
    await detectExistingConfigs(['/a', '/b', '/c'], { access: accessFn });

    // Assert — all starts happen before any end (parallel)
    expect(order.slice(0, 3).every((s) => s.startsWith('start:'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/existing-configs.spec.ts
```
Expected: all four FAIL (module not found).

- [ ] **Step 3: Implement `existing-configs.ts`**

```typescript
/**
 * Detects which app paths already have a `pinflow.config.json`.
 * Pure fs concern — no vscode imports.
 * @module
 */
import { access } from 'node:fs/promises';
import path from 'node:path';

export interface ExistingConfigsDeps {
  readonly access: (path: string) => Promise<void>;
}

const DEFAULT_DEPS: ExistingConfigsDeps = {
  access: (p) => access(p),
};

/**
 * For each app path, check whether `${appPath}/pinflow.config.json` exists.
 * Returns the subset that do exist. Runs `access()` calls in parallel.
 */
export async function detectExistingConfigs(
  appPaths: readonly string[],
  deps: ExistingConfigsDeps = DEFAULT_DEPS,
): Promise<string[]> {
  if (appPaths.length === 0) return [];

  const checks = appPaths.map(async (appPath) => {
    const configPath = path.join(appPath, 'pinflow.config.json');
    try {
      await deps.access(configPath);
      return appPath;
    } catch {
      return undefined;
    }
  });

  const results = await Promise.all(checks);
  return results.filter((p): p is string => p !== undefined);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/existing-configs.spec.ts
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/existing-configs.ts packages/pinflow-vscode/src/core/onboarding/wizard/existing-configs.spec.ts
git commit -m "feat(vscode): add detectExistingConfigs helper for wizard reconfigure flow"
```

---

## Task 2 — `snippets.ts`: write `appRoot: "."` always

**Files:**
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/snippets.ts`
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/snippets.spec.ts`

- [ ] **Step 1: Read existing test to understand current assertions**

```bash
cat packages/pinflow-vscode/src/core/onboarding/wizard/snippets.spec.ts
```

- [ ] **Step 2: Update tests to expect `appRoot: "."`**

Replace the contents of `snippets.spec.ts` with:

```typescript
import { describe, it, expect } from 'vitest';

import { generatePinflowConfigJson } from './snippets.js';

describe('generatePinflowConfigJson', () => {
  it('writes appRoot as "." regardless of input.appRoot', () => {
    // Arrange
    const input = {
      agent: 'codex' as const,
      framework: 'vite' as const,
      appRoot: '/anything/can/be/here',
    };

    // Act
    const result = generatePinflowConfigJson(input);
    const parsed = JSON.parse(result);

    // Assert
    expect(parsed.appRoot).toBe('.');
  });

  it('maps agent="claude-code" to runner.provider="claude"', () => {
    // Arrange
    const input = {
      agent: 'claude-code' as const,
      framework: 'next' as const,
      appRoot: '/repo',
    };

    // Act
    const result = JSON.parse(generatePinflowConfigJson(input));

    // Assert
    expect(result.runner.provider).toBe('claude');
  });

  it('maps agent="codex" to runner.provider="codex"', () => {
    // Arrange
    const input = {
      agent: 'codex' as const,
      framework: 'vite' as const,
      appRoot: '/repo',
    };

    // Act
    const result = JSON.parse(generatePinflowConfigJson(input));

    // Assert
    expect(result.runner.provider).toBe('codex');
  });

  it('writes framework verbatim', () => {
    // Arrange
    const frameworks = ['vite', 'webpack', 'next', 'nuxt'] as const;

    // Act + Assert
    for (const framework of frameworks) {
      const result = JSON.parse(
        generatePinflowConfigJson({
          agent: 'codex',
          framework,
          appRoot: '/repo',
        }),
      );
      expect(result.framework).toBe(framework);
    }
  });
});
```

- [ ] **Step 3: Run tests to verify the appRoot test fails**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/snippets.spec.ts
```
Expected: 1 FAIL (`appRoot` is `/anything/can/be/here`, not `.`).

- [ ] **Step 4: Update `snippets.ts` to write `appRoot: "."`**

Replace the body of `generatePinflowConfigJson`:

```typescript
export function generatePinflowConfigJson(input: SnippetInput): string {
  const config = {
    appRoot: '.',
    framework: input.framework,
    runner: {
      provider: agentToProvider(input.agent),
    },
  };

  return JSON.stringify(config, null, 2);
}
```

Note: `SnippetInput.appRoot` is now unused inside `generatePinflowConfigJson`, but kept on the input type because callers still pass an absolute path through to `writeWizardConfig` (Task 3) which uses it to choose the file location. Leave the field on `SnippetInput`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/snippets.spec.ts
```
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/snippets.ts packages/pinflow-vscode/src/core/onboarding/wizard/snippets.spec.ts
git commit -m "refactor(vscode): write appRoot=\".\" so each app's pinflow.config.json is portable"
```

---

## Task 3 — `config-writer.ts`: batch write per-app, no existence guard

**Files:**
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/config-writer.ts`
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/config-writer.spec.ts`

- [ ] **Step 1: Replace the writer signature and behavior**

Replace the entire contents of `config-writer.ts`:

```typescript
/**
 * File-system writer for the in-extension wizard.
 * Writes one `pinflow.config.json` per app + appends `.pinflow/` to the
 * workspace-root `.gitignore` once. No vscode imports — pure fs operations.
 *
 * @remarks
 * Always overwrites existing config files. Reconfigure consent is the
 * wizard's responsibility (see `wizard.ts`), not the writer's.
 *
 * @module
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generatePinflowConfigJson } from './snippets.js';
import type { SnippetInput } from './snippets.js';

export interface WriteConfigBatchInput {
  /** Workspace root — used only for the `.gitignore` location. */
  readonly cwd: string;
  readonly agent: SnippetInput['agent'];
  readonly perApp: readonly {
    readonly appPath: string;
    readonly framework: SnippetInput['framework'];
  }[];
}

const GITIGNORE_BLOCK = '# PinFlow artifacts\n.pinflow/\n';

function hasGitignoreEntry(content: string): boolean {
  return content.includes('.pinflow/');
}

function buildAppendedContent(existing: string): string {
  const separator = existing.endsWith('\n') ? '' : '\n';
  return `${existing}${separator}${GITIGNORE_BLOCK}`;
}

/**
 * Write `pinflow.config.json` for each entry in `perApp` and ensure the
 * workspace-root `.gitignore` contains `.pinflow/` exactly once.
 */
export async function writeWizardConfig(input: WriteConfigBatchInput): Promise<void> {
  // Write per-app configs in parallel — independent files, no race.
  await Promise.all(
    input.perApp.map((entry) => writeAppConfig(entry.appPath, input.agent, entry.framework)),
  );

  // Update gitignore once at the workspace root — non-load-bearing.
  await updateGitignore(path.join(input.cwd, '.gitignore'));
}

async function writeAppConfig(
  appPath: string,
  agent: SnippetInput['agent'],
  framework: SnippetInput['framework'],
): Promise<void> {
  const configPath = path.join(appPath, 'pinflow.config.json');
  const content = generatePinflowConfigJson({ agent, framework, appRoot: appPath });
  await writeFile(configPath, content, 'utf-8');
}

async function updateGitignore(gitignorePath: string): Promise<void> {
  let existing: string | undefined;

  try {
    existing = await readFile(gitignorePath, 'utf-8');
  } catch {
    // File doesn't exist — create it with the block.
  }

  if (existing === undefined) {
    await writeFile(gitignorePath, GITIGNORE_BLOCK, 'utf-8');
    return;
  }

  if (hasGitignoreEntry(existing)) {
    return;
  }

  await writeFile(gitignorePath, buildAppendedContent(existing), 'utf-8');
}
```

- [ ] **Step 2: Replace tests**

Replace the entire contents of `config-writer.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { writeWizardConfig } from './config-writer.js';

describe('writeWizardConfig', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(path.join(tmpdir(), 'pinflow-writer-spec-'));
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('writes one pinflow.config.json per app at the app path', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    const appB = path.join(workdir, 'apps', 'api');
    mkdirSync(appA, { recursive: true });
    mkdirSync(appB, { recursive: true });

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [
        { appPath: appA, framework: 'vite' },
        { appPath: appB, framework: 'webpack' },
      ],
    });

    // Assert
    const configA = JSON.parse(readFileSync(path.join(appA, 'pinflow.config.json'), 'utf-8'));
    const configB = JSON.parse(readFileSync(path.join(appB, 'pinflow.config.json'), 'utf-8'));
    expect(configA.appRoot).toBe('.');
    expect(configA.framework).toBe('vite');
    expect(configB.appRoot).toBe('.');
    expect(configB.framework).toBe('webpack');
  });

  it('overwrites an existing pinflow.config.json without throwing', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    mkdirSync(appA, { recursive: true });
    writeFileSync(path.join(appA, 'pinflow.config.json'), '{"old":"content"}', 'utf-8');

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [{ appPath: appA, framework: 'vite' }],
    });

    // Assert
    const config = JSON.parse(readFileSync(path.join(appA, 'pinflow.config.json'), 'utf-8'));
    expect(config.appRoot).toBe('.');
    expect(config.framework).toBe('vite');
  });

  it('creates .gitignore at workspace root with the .pinflow/ block when absent', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    mkdirSync(appA, { recursive: true });

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [{ appPath: appA, framework: 'vite' }],
    });

    // Assert
    const gitignore = readFileSync(path.join(workdir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.pinflow/');
  });

  it('appends to an existing .gitignore that lacks .pinflow/', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    mkdirSync(appA, { recursive: true });
    writeFileSync(path.join(workdir, '.gitignore'), 'node_modules\n', 'utf-8');

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [{ appPath: appA, framework: 'vite' }],
    });

    // Assert
    const gitignore = readFileSync(path.join(workdir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('.pinflow/');
  });

  it('does not duplicate the entry when .gitignore already contains .pinflow/', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    mkdirSync(appA, { recursive: true });
    const original = '# PinFlow artifacts\n.pinflow/\n';
    writeFileSync(path.join(workdir, '.gitignore'), original, 'utf-8');

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [{ appPath: appA, framework: 'vite' }],
    });

    // Assert
    const gitignore = readFileSync(path.join(workdir, '.gitignore'), 'utf-8');
    expect(gitignore).toBe(original);
  });

  it('updates gitignore exactly once for multi-app input', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    const appB = path.join(workdir, 'apps', 'api');
    mkdirSync(appA, { recursive: true });
    mkdirSync(appB, { recursive: true });

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [
        { appPath: appA, framework: 'vite' },
        { appPath: appB, framework: 'webpack' },
      ],
    });

    // Assert — gitignore only at workspace root, not at app paths
    expect(existsSync(path.join(workdir, '.gitignore'))).toBe(true);
    expect(existsSync(path.join(appA, '.gitignore'))).toBe(false);
    expect(existsSync(path.join(appB, '.gitignore'))).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/config-writer.spec.ts
```
Expected: 6 passed.

- [ ] **Step 4: Verify the package still typechecks (wizard.ts still imports the old shape — that's fine, it'll be fixed in Task 8)**

```bash
cd packages/pinflow-vscode && corepack pnpm exec tsc -p tsconfig.lib.json --noEmit
```
Expected: TypeScript errors in `wizard.ts` because the new signature breaks the old call site. **Leave them** — they will be fixed in Task 8. The test command in step 3 above bypasses the orchestrator's typecheck.

If you need to commit before Task 8 to keep the branch incremental, run the test command (it isolates the writer) and commit. The orchestrator typecheck will go green at the end of Task 8.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/config-writer.ts packages/pinflow-vscode/src/core/onboarding/wizard/config-writer.spec.ts
git commit -m "refactor(vscode): writeWizardConfig batches per-app writes, drops existence guard"
```

---

## Task 4 — `post-install.ts`: drop broken codex command + German strings

**Files:**
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/post-install.ts`
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/post-install.spec.ts`

- [ ] **Step 1: Update `post-install.ts`**

Replace the `INSTALL_COMMANDS` constant + its comment + all user-facing strings:

```typescript
// INSTALL_COMMANDS — codex marketplace command was upstream-broken in
// the user-installed Codex CLI; only the load-bearing MCP registration ships.
// Re-add the marketplace step when the Codex CLI bug is fixed.
const INSTALL_COMMANDS: Partial<Record<AgentChoice, readonly string[]>> = {
  codex: [
    'codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp',
  ],
  'claude-code': [
    'claude plugin marketplace add Dom-303/pinflow',
    'claude plugin install pinflow@pinflow',
  ],
};
```

Replace the toast strings and button labels. The `runPostInstall` body becomes:

```typescript
export async function runPostInstall(
  agent: AgentChoice,
  cwd: string,
  deps?: RunPostInstallDeps,
): Promise<void> {
  const showMsg = deps?._showInformationMessage ?? defaultShowInformationMessage;
  const writeText = deps?._clipboardWriteText ?? defaultClipboardWriteText;
  const runInstall = deps?.runInstallInTerminal ?? defaultRunInstallInTerminal;

  const folderName = path.basename(cwd);
  const commands = getInstallCommands(agent);
  const agentLabel = AGENT_LABELS[agent] ?? agent;

  if (commands === undefined) {
    await showMsg(`PinFlow ist eingerichtet in ${folderName}.`);
    return;
  }

  const action = await showMsg(
    `PinFlow ist eingerichtet in ${folderName}. ${agentLabel}-Plugin installieren?`,
    'Ausführen',
    'Befehl anzeigen',
    'Überspringen',
  );

  if (action === 'Ausführen') {
    runInstall(cwd, commands, agentLabel);
    return;
  }

  if (action === 'Befehl anzeigen') {
    await writeText(commands.join('\n'));
    await showMsg(`${agentLabel}-Installationsbefehl in Zwischenablage kopiert.`);
    return;
  }

  // 'Überspringen' or dismissed — silent no-op.
}
```

Also update the terminal name in `defaultRunInstallInTerminal`:

```typescript
function defaultRunInstallInTerminal(cwd: string, commands: readonly string[], agentLabel: string): void {
  const terminal = vscode.window.createTerminal({
    name: `PinFlow — ${agentLabel}-Plugin installieren`,
    cwd,
  });
  terminal.show();
  for (const cmd of commands) {
    terminal.sendText(cmd);
  }
}
```

- [ ] **Step 2: Update `post-install.spec.ts`**

Update the codex tests to expect 1 command, and update string assertions to German:

```typescript
import { describe, it, expect, vi } from 'vitest';

import { runPostInstall, getInstallCommands } from './post-install.js';

describe('getInstallCommands', () => {
  it('returns one command for codex (marketplace step dropped, mcp add only)', () => {
    const cmds = getInstallCommands('codex');
    expect(cmds).toEqual([
      'codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp',
    ]);
  });

  it('returns two commands for claude-code', () => {
    const cmds = getInstallCommands('claude-code');
    expect(cmds).toBeDefined();
    expect(cmds?.length).toBe(2);
  });

  it('returns undefined for copilot', () => {
    expect(getInstallCommands('copilot')).toBeUndefined();
  });

  it('returns undefined for other', () => {
    expect(getInstallCommands('other')).toBeUndefined();
  });
});

describe('runPostInstall', () => {
  function makeDeps(pickedAction: string | undefined) {
    const showInformationMessage = vi.fn().mockResolvedValue(pickedAction);
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    const runInstallInTerminal = vi.fn();
    return { showInformationMessage, clipboardWriteText, runInstallInTerminal };
  }

  it("'Ausführen' triggers runInstallInTerminal with codex commands and German agent label", async () => {
    // Arrange
    const deps = makeDeps('Ausführen');

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.runInstallInTerminal).toHaveBeenCalledOnce();
    expect(deps.runInstallInTerminal).toHaveBeenCalledWith(
      '/projects/myapp',
      ['codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp'],
      'Codex',
    );
  });

  it("toast prompt uses German wording", async () => {
    // Arrange
    const deps = makeDeps('Überspringen');

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    const [msg, ...actions] = deps.showInformationMessage.mock.calls[0] as [string, ...string[]];
    expect(msg).toBe('PinFlow ist eingerichtet in myapp. Codex-Plugin installieren?');
    expect(actions).toEqual(['Ausführen', 'Befehl anzeigen', 'Überspringen']);
  });

  it("'Befehl anzeigen' copies command and shows German confirmation", async () => {
    // Arrange
    const deps = makeDeps('Befehl anzeigen');
    deps.showInformationMessage
      .mockResolvedValueOnce('Befehl anzeigen')
      .mockResolvedValueOnce(undefined);

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.clipboardWriteText).toHaveBeenCalledWith(
      'codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp',
    );
    const secondCall = deps.showInformationMessage.mock.calls[1];
    expect(secondCall[0]).toBe('Codex-Installationsbefehl in Zwischenablage kopiert.');
  });

  it("'Überspringen' returns without calling terminal or clipboard", async () => {
    // Arrange
    const deps = makeDeps('Überspringen');

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.runInstallInTerminal).not.toHaveBeenCalled();
    expect(deps.clipboardWriteText).not.toHaveBeenCalled();
  });

  it("agent='copilot' shows plain German success toast, no choice prompt", async () => {
    // Arrange
    const deps = makeDeps(undefined);

    // Act
    await runPostInstall('copilot', '/projects/copilot-folder', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.showInformationMessage).toHaveBeenCalledOnce();
    const [msg, ...actions] = deps.showInformationMessage.mock.calls[0] as [string, ...string[]];
    expect(msg).toBe('PinFlow ist eingerichtet in copilot-folder.');
    expect(actions).toHaveLength(0);
    expect(deps.runInstallInTerminal).not.toHaveBeenCalled();
  });

  it("agent='other' shows plain German success toast, no choice prompt", async () => {
    // Arrange
    const deps = makeDeps(undefined);

    // Act
    await runPostInstall('other', '/projects/other-folder', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.showInformationMessage).toHaveBeenCalledOnce();
    const [msg, ...actions] = deps.showInformationMessage.mock.calls[0] as [string, ...string[]];
    expect(msg).toBe('PinFlow ist eingerichtet in other-folder.');
    expect(actions).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/post-install.spec.ts
```
Expected: 9 passed.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/post-install.ts packages/pinflow-vscode/src/core/onboarding/wizard/post-install.spec.ts
git commit -m "fix(vscode): drop broken codex marketplace command + German post-install toasts"
```

---

## Task 5 — `framework-step.ts`: auto-skip when detected, accept step label

**Files:**
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/framework-step.ts`
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/framework-step.spec.ts`

- [ ] **Step 1: Replace `framework-step.ts`**

```typescript
/**
 * Wizard step — Framework selection.
 * If the app's framework was auto-detected, returns synchronously after a
 * fire-and-forget toast. Otherwise prompts the user to pick from the four
 * supported options.
 * @module
 */
import * as vscode from 'vscode';

import type { DetectedApp } from './app-detection.js';

export type FrameworkChoice = 'vite' | 'webpack' | 'next' | 'nuxt';

interface FrameworkQuickPickItem {
  readonly label: string;
  readonly value: FrameworkChoice;
}

/** Minimal VS Code window surface — test-overridable via DI. */
export interface FrameworkStepDeps {
  readonly showQuickPick: (
    items: readonly FrameworkQuickPickItem[],
    options?: { title?: string; placeHolder?: string },
  ) => Promise<FrameworkQuickPickItem | undefined>;
  readonly showInformationMessage: (message: string) => void;
}

const ALL_FRAMEWORK_ITEMS: readonly FrameworkQuickPickItem[] = [
  { label: 'Vite', value: 'vite' },
  { label: 'Webpack', value: 'webpack' },
  { label: 'Next.js', value: 'next' },
  { label: 'Nuxt', value: 'nuxt' },
];

const FRAMEWORK_LABELS: Record<FrameworkChoice, string> = {
  vite: 'Vite',
  webpack: 'Webpack',
  next: 'Next.js',
  nuxt: 'Nuxt',
};

const DEFAULT_DEPS: FrameworkStepDeps = {
  showQuickPick: (items, options) =>
    vscode.window.showQuickPick([...items], options) as Promise<FrameworkQuickPickItem | undefined>,
  showInformationMessage: (message) => {
    void vscode.window.showInformationMessage(message);
  },
};

/**
 * Resolve the framework for an app.
 *
 * - If `detectedFromApp.framework` is set → fire silent info toast and return
 *   the detected framework synchronously (no QuickPick).
 * - Otherwise → show the QuickPick. Picking returns the value; Esc returns
 *   `undefined`.
 *
 * @param stepLabel  e.g. `"Schritt 3/3"` or `""` for single-step wizards.
 *                   Prepended to the QuickPick title when shown.
 */
export async function pickFramework(
  detectedFromApp: DetectedApp,
  stepLabel: string,
  deps: FrameworkStepDeps = DEFAULT_DEPS,
): Promise<FrameworkChoice | undefined> {
  if (detectedFromApp.framework) {
    deps.showInformationMessage(
      `Framework erkannt: ${FRAMEWORK_LABELS[detectedFromApp.framework]}`,
    );
    return detectedFromApp.framework;
  }

  const titlePrefix = stepLabel ? `${stepLabel} — ` : '';
  const picked = await deps.showQuickPick(ALL_FRAMEWORK_ITEMS, {
    title: `PinFlow Setup · ${titlePrefix}Framework wählen`,
    placeHolder: 'Konnte kein Framework erkennen — wähle manuell',
  });

  return picked?.value;
}
```

- [ ] **Step 2: Replace `framework-step.spec.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';

import { pickFramework } from './framework-step.js';

describe('pickFramework', () => {
  it('returns detected framework synchronously without QuickPick', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInformationMessage = vi.fn();

    // Act
    const result = await pickFramework(
      { path: '/repo/apps/web', framework: 'vite' },
      'Schritt 3/3',
      { showQuickPick, showInformationMessage },
    );

    // Assert
    expect(result).toBe('vite');
    expect(showQuickPick).not.toHaveBeenCalled();
    expect(showInformationMessage).toHaveBeenCalledWith('Framework erkannt: Vite');
  });

  it('shows QuickPick with all four options when nothing detected', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue({ label: 'Webpack', value: 'webpack' });
    const showInformationMessage = vi.fn();

    // Act
    const result = await pickFramework(
      { path: '/repo/apps/web' },
      'Schritt 2/2',
      { showQuickPick, showInformationMessage },
    );

    // Assert
    expect(result).toBe('webpack');
    expect(showInformationMessage).not.toHaveBeenCalled();
    const [items, options] = showQuickPick.mock.calls[0];
    expect(items.map((i: { value: string }) => i.value)).toEqual([
      'vite',
      'webpack',
      'next',
      'nuxt',
    ]);
    expect(options.title).toBe('PinFlow Setup · Schritt 2/2 — Framework wählen');
    expect(options.placeHolder).toBe('Konnte kein Framework erkennen — wähle manuell');
  });

  it('omits step prefix when stepLabel is empty', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInformationMessage = vi.fn();

    // Act
    await pickFramework(
      { path: '/repo' },
      '',
      { showQuickPick, showInformationMessage },
    );

    // Assert
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Framework wählen');
  });

  it('returns undefined when QuickPick is cancelled', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInformationMessage = vi.fn();

    // Act
    const result = await pickFramework(
      { path: '/repo' },
      'Schritt 1/1',
      { showQuickPick, showInformationMessage },
    );

    // Assert
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/framework-step.spec.ts
```
Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/framework-step.ts packages/pinflow-vscode/src/core/onboarding/wizard/framework-step.spec.ts
git commit -m "feat(vscode): framework-step auto-skips when detected, accepts dynamic step label"
```

---

## Task 6 — `monorepo-step.ts`: multi-select, return `string[]`

**Files:**
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/monorepo-step.ts`
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/monorepo-step.spec.ts`

- [ ] **Step 1: Replace `monorepo-step.ts`**

```typescript
/**
 * Wizard step — App-root selection.
 * - 1 app → silent auto-pick.
 * - 2+ apps → multi-select QuickPick with all items pre-checked.
 * - 0 apps → InputBox for a manual path.
 * @module
 */
import path from 'node:path';

import * as vscode from 'vscode';

import type { DetectedApp } from './app-detection.js';

interface AppQuickPickItem {
  readonly label: string;
  readonly description?: string;
  readonly picked: boolean;
  readonly value: string;
}

/** Minimal VS Code window surface — test-overridable via DI. */
export interface MonorepoStepDeps {
  readonly showQuickPick: (
    items: readonly AppQuickPickItem[],
    options: {
      readonly title?: string;
      readonly placeHolder?: string;
      readonly canPickMany: true;
    },
  ) => Promise<readonly AppQuickPickItem[] | undefined>;
  readonly showInputBox: (options?: {
    readonly title?: string;
    readonly prompt?: string;
    readonly value?: string;
  }) => Promise<string | undefined>;
}

const DEFAULT_DEPS: MonorepoStepDeps = {
  showQuickPick: (items, options) =>
    vscode.window.showQuickPick([...items], options) as Promise<readonly AppQuickPickItem[] | undefined>,
  showInputBox: (options) => vscode.window.showInputBox(options),
};

/**
 * Resolve one or more app roots for the wizard.
 *
 * @param stepLabel  e.g. `"Schritt 2/3"` or `""` for single-step wizards.
 *
 * @returns
 *  - `[singlePath]` when exactly one app was detected (silent auto-pick).
 *  - The user's multi-select picks (1..N) when 2+ apps were detected.
 *  - `[manualPath]` from the InputBox when 0 apps were detected.
 *  - `undefined` when the user cancelled or deselected everything.
 */
export async function pickAppRoot(
  cwd: string,
  apps: readonly DetectedApp[],
  stepLabel: string,
  deps: MonorepoStepDeps = DEFAULT_DEPS,
): Promise<readonly string[] | undefined> {
  if (apps.length === 1) {
    return [apps[0].path];
  }

  const titlePrefix = stepLabel ? `${stepLabel} — ` : '';

  if (apps.length > 1) {
    const items: AppQuickPickItem[] = apps.map((app) => ({
      label: path.relative(cwd, app.path) || path.basename(app.path),
      description: app.framework ?? 'unbekanntes Framework',
      picked: true,
      value: app.path,
    }));

    const picked = await deps.showQuickPick(items, {
      title: `PinFlow Setup · ${titlePrefix}Apps auswählen`,
      placeHolder: 'Mehrere Apps gefunden — wähle eine oder mehrere',
      canPickMany: true,
    });

    if (picked === undefined) return undefined;
    if (picked.length === 0) return undefined;
    return picked.map((p) => p.value);
  }

  const entered = await deps.showInputBox({
    title: `PinFlow Setup · ${titlePrefix}App-Root wählen`,
    prompt: 'Keine package.json gefunden. Pfad zum App-Root eingeben:',
    value: cwd,
  });

  if (entered === undefined || entered.trim() === '') return undefined;
  return [entered];
}
```

- [ ] **Step 2: Replace `monorepo-step.spec.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';

import { pickAppRoot } from './monorepo-step.js';

describe('pickAppRoot', () => {
  it('auto-picks the only detected app silently', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [{ path: '/repo/apps/web', framework: 'vite' }],
      'Schritt 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toEqual(['/repo/apps/web']);
    expect(showQuickPick).not.toHaveBeenCalled();
    expect(showInputBox).not.toHaveBeenCalled();
  });

  it('shows multi-select QuickPick with all items pre-checked when 2+ apps detected', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue([
      { label: 'apps/web', value: '/repo/apps/web', picked: true },
      { label: 'apps/api', value: '/repo/apps/api', picked: true },
    ]);
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web', framework: 'vite' },
        { path: '/repo/apps/api', framework: 'webpack' },
      ],
      'Schritt 2/2',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toEqual(['/repo/apps/web', '/repo/apps/api']);
    const [items, options] = showQuickPick.mock.calls[0];
    expect(items).toEqual([
      { label: 'apps/web', description: 'vite', picked: true, value: '/repo/apps/web' },
      { label: 'apps/api', description: 'webpack', picked: true, value: '/repo/apps/api' },
    ]);
    expect(options.canPickMany).toBe(true);
    expect(options.title).toBe('PinFlow Setup · Schritt 2/2 — Apps auswählen');
    expect(options.placeHolder).toBe('Mehrere Apps gefunden — wähle eine oder mehrere');
  });

  it('describes apps without detected framework as "unbekanntes Framework"', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInputBox = vi.fn();

    // Act
    await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api', framework: 'webpack' },
      ],
      'Schritt 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    const [items] = showQuickPick.mock.calls[0];
    expect(items[0].description).toBe('unbekanntes Framework');
    expect(items[1].description).toBe('webpack');
  });

  it('returns undefined when multi-select is cancelled', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ],
      'Schritt 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it('returns undefined when user deselects everything in multi-select', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue([]);
    const showInputBox = vi.fn();

    // Act
    const result = await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ],
      'Schritt 2/3',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it('shows InputBox with German prompt when no apps detected', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInputBox = vi.fn().mockResolvedValue('/manual/path');

    // Act
    const result = await pickAppRoot(
      '/repo',
      [],
      'Schritt 2/2',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toEqual(['/manual/path']);
    const [options] = showInputBox.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Schritt 2/2 — App-Root wählen');
    expect(options.prompt).toBe(
      'Keine package.json gefunden. Pfad zum App-Root eingeben:',
    );
    expect(options.value).toBe('/repo');
  });

  it('returns undefined when InputBox is cancelled or empty', async () => {
    // Arrange
    const showQuickPick = vi.fn();
    const showInputBox = vi.fn().mockResolvedValue(undefined);

    // Act
    const result = await pickAppRoot(
      '/repo',
      [],
      'Schritt 1/1',
      { showQuickPick, showInputBox },
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it('omits step prefix when stepLabel is empty', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue([]);
    const showInputBox = vi.fn();

    // Act
    await pickAppRoot(
      '/repo',
      [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ],
      '',
      { showQuickPick, showInputBox },
    );

    // Assert
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Apps auswählen');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/monorepo-step.spec.ts
```
Expected: 8 passed.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/monorepo-step.ts packages/pinflow-vscode/src/core/onboarding/wizard/monorepo-step.spec.ts
git commit -m "feat(vscode): app-root step supports multi-select with German UI"
```

---

## Task 7 — `agent-step.ts`: German placeholder + dynamic step label

**Files:**
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/agent-step.ts`
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/agent-step.spec.ts`

- [ ] **Step 1: Update `agent-step.ts`**

Add `stepLabel` to `AgentStepDeps`, replace placeholder, drop hardcoded "Schritt 1/3":

```typescript
export interface AgentStepDeps {
  readonly showQuickPick: (
    items: readonly AgentQuickPickItem[],
    options?: { title?: string; placeHolder?: string },
  ) => Promise<AgentQuickPickItem | undefined>;
  readonly installedAgents?: InstalledAgents;
  readonly stepLabel?: string;
}
```

Replace the body of `pickAgent`:

```typescript
export async function pickAgent(deps: AgentStepDeps = DEFAULT_DEPS): Promise<AgentChoice | undefined> {
  const items = buildOrderedItems(deps.installedAgents);
  const titlePrefix = deps.stepLabel ? `${deps.stepLabel} — ` : '';

  const picked = await deps.showQuickPick(items, {
    title: `PinFlow Setup · ${titlePrefix}Agent wählen`,
    placeHolder: 'Wähle den Agent für dieses Projekt',
  });

  return picked?.value;
}
```

Also update the badge string from `'✓ installiert'` (already German — keep as-is) — confirm it stays German.

- [ ] **Step 2: Update `agent-step.spec.ts`**

Find the existing tests and update title/placeholder assertions to German. If the spec doesn't already check those strings, add at least one test that does. Skeleton:

```typescript
import { describe, it, expect, vi } from 'vitest';

import { pickAgent } from './agent-step.js';

describe('pickAgent', () => {
  it('shows German title and placeholder with step label', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue({ label: 'Codex', value: 'codex' });

    // Act
    const result = await pickAgent({
      showQuickPick,
      stepLabel: 'Schritt 1/2',
    });

    // Assert
    expect(result).toBe('codex');
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Schritt 1/2 — Agent wählen');
    expect(options.placeHolder).toBe('Wähle den Agent für dieses Projekt');
  });

  it('omits step prefix when stepLabel is undefined', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    await pickAgent({ showQuickPick });

    // Assert
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Agent wählen');
  });

  it('reorders installed agents to the top with German badge', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    await pickAgent({
      showQuickPick,
      installedAgents: { codex: false, 'claude-code': true, copilot: false },
      stepLabel: 'Schritt 1/3',
    });

    // Assert
    const [items] = showQuickPick.mock.calls[0];
    const claudeItem = items.find((i: { value: string }) => i.value === 'claude-code');
    expect(claudeItem.description).toBe('✓ installiert');
    // Claude is reordered to the top
    expect(items[0].value).toBe('claude-code');
  });

  it('returns undefined when user cancels', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    const result = await pickAgent({ showQuickPick });

    // Assert
    expect(result).toBeUndefined();
  });
});
```

If the existing spec has overlapping tests, REPLACE the whole file with the above to keep things consistent.

- [ ] **Step 3: Run tests**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/agent-step.spec.ts
```
Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/agent-step.ts packages/pinflow-vscode/src/core/onboarding/wizard/agent-step.spec.ts
git commit -m "feat(vscode): agent-step accepts dynamic step label, German placeholder"
```

---

## Task 8 — `wizard.ts`: step plan, reconfigure prompt, multi-app loop

**Files:**
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/wizard.ts`
- Modify: `packages/pinflow-vscode/src/core/onboarding/wizard/wizard.spec.ts`

This is the orchestrator change that ties everything together. Read the current `wizard.ts` and `wizard.spec.ts` carefully before starting — many spec test cases will need updating, not just additions.

- [ ] **Step 1: Replace `wizard.ts`**

```typescript
/**
 * Wizard orchestrator — computes the step plan, runs the steps the user
 * needs to see, gates a reconfigure prompt when configs already exist,
 * writes one config per picked app, then triggers post-install. No spawn,
 * no terminal, no CLI dependency.
 * @module
 */
import path from 'node:path';

import * as vscode from 'vscode';

import { detectApps } from './app-detection.js';
import { detectInstalledAgents } from './agent-detection.js';
import { pickAgent } from './agent-step.js';
import { pickAppRoot } from './monorepo-step.js';
import { pickFramework } from './framework-step.js';
import { writeWizardConfig } from './config-writer.js';
import { detectExistingConfigs } from './existing-configs.js';
import { runPostInstall } from './post-install.js';
import type { DetectedApp } from './app-detection.js';
import type { InstalledAgents } from './agent-detection.js';
import type { AgentChoice } from './agent-step.js';
import type { FrameworkChoice } from './framework-step.js';
import type { WriteConfigBatchInput } from './config-writer.js';
import type { RunPostInstallDeps } from './post-install.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RunWizardDeps {
  readonly onSuccess: () => Promise<void> | void;
  readonly runInitInTerminal: (cwd: string) => void;
}

// ---------------------------------------------------------------------------
// Internal DI surface (test-overridable)
// ---------------------------------------------------------------------------

export interface WizardInternalDeps {
  readonly detectApps: (cwd: string) => DetectedApp[];
  readonly detectInstalledAgents: () => Promise<InstalledAgents>;
  readonly detectExistingConfigs: (appPaths: readonly string[]) => Promise<string[]>;
  readonly pickAgent: (
    installedAgents: InstalledAgents,
    stepLabel: string,
  ) => Promise<AgentChoice | undefined>;
  readonly pickAppRoot: (
    cwd: string,
    apps: readonly DetectedApp[],
    stepLabel: string,
  ) => Promise<readonly string[] | undefined>;
  readonly pickFramework: (
    detectedApp: DetectedApp,
    stepLabel: string,
  ) => Promise<FrameworkChoice | undefined>;
  readonly writeWizardConfig: (input: WriteConfigBatchInput) => Promise<void>;
  readonly runPostInstall: (
    agent: AgentChoice,
    cwd: string,
    deps: RunPostInstallDeps,
  ) => Promise<void>;
  readonly showInformationMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
  readonly showErrorMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
  readonly createTerminal: (options: { name: string; cwd: string }) => {
    sendText: (text: string) => void;
    show: () => void;
  };
}

const DEFAULT_INTERNAL_DEPS: WizardInternalDeps = {
  detectApps: (cwd) => detectApps(cwd),
  detectInstalledAgents: () => detectInstalledAgents(),
  detectExistingConfigs: (appPaths) => detectExistingConfigs(appPaths),
  pickAgent: (installedAgents, stepLabel) =>
    pickAgent({
      installedAgents,
      stepLabel,
      showQuickPick: (items, options) =>
        vscode.window.showQuickPick([...items], options) as Promise<(typeof items)[number] | undefined>,
    }),
  pickAppRoot: (cwd, apps, stepLabel) => pickAppRoot(cwd, apps, stepLabel),
  pickFramework: (detectedApp, stepLabel) => pickFramework(detectedApp, stepLabel),
  writeWizardConfig: (input) => writeWizardConfig(input),
  runPostInstall: (agent, cwd, postInstallDeps) =>
    runPostInstall(agent, cwd, postInstallDeps),
  showInformationMessage: (message, ...actions) =>
    vscode.window.showInformationMessage(message, ...actions),
  showErrorMessage: (message, ...actions) =>
    vscode.window.showErrorMessage(message, ...actions),
  createTerminal: (options) => vscode.window.createTerminal(options),
};

// ---------------------------------------------------------------------------
// Module-level concurrency lock (per-folder)
// ---------------------------------------------------------------------------

const pendingWizards = new Set<string>();

export const __test_resetPendingWizards = (): void => {
  pendingWizards.clear();
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function runWizard(
  cwd: string,
  deps: RunWizardDeps,
  internalDeps: WizardInternalDeps = DEFAULT_INTERNAL_DEPS,
): Promise<void> {
  if (pendingWizards.has(cwd)) return;
  pendingWizards.add(cwd);

  try {
    await runWizardSteps(cwd, deps, internalDeps);
  } finally {
    pendingWizards.delete(cwd);
  }
}

// ---------------------------------------------------------------------------
// Step plan
// ---------------------------------------------------------------------------

interface StepPlan {
  readonly total: number;
  readonly agentLabel: string;
  readonly appRootLabel: string;
  readonly frameworkLabel: string;     // empty when framework step will be skipped
  readonly frameworkStepNeeded: boolean;
}

/**
 * Compute step plan upfront. The framework step is needed iff at least one
 * detected app is missing a framework classification — in which case we show
 * one shared framework picker for the ambiguous apps.
 *
 * The app-root step is always counted because we don't yet know whether it
 * will auto-pick or prompt at planning time. (It's silent for 1-app and
 * shown for 2+ / 0 — the user only sees it when it counts.)
 */
function planSteps(apps: readonly DetectedApp[]): StepPlan {
  // Agent always shown.
  // App-root: if exactly 1 app, it auto-picks silently — drop from plan.
  const appRootShown = apps.length !== 1;

  // Framework: shown if any app lacks a detected framework.
  // For 0-apps case, the user will pick a path manually, so we always need
  // to ask for a framework.
  const ambiguousAppsExist =
    apps.length === 0 || apps.some((a) => a.framework === undefined);
  const frameworkShown = ambiguousAppsExist;

  let count = 1; // agent
  if (appRootShown) count += 1;
  if (frameworkShown) count += 1;

  const fmt = (i: number) => (count === 1 ? '' : `Schritt ${i}/${count}`);

  let nextIdx = 1;
  const agentLabel = fmt(nextIdx++);
  const appRootLabel = appRootShown ? fmt(nextIdx++) : '';
  const frameworkLabel = frameworkShown ? fmt(nextIdx++) : '';

  return {
    total: count,
    agentLabel,
    appRootLabel,
    frameworkLabel,
    frameworkStepNeeded: frameworkShown,
  };
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function runWizardSteps(
  cwd: string,
  deps: RunWizardDeps,
  internal: WizardInternalDeps,
): Promise<void> {
  // Phase 1 — detect apps + installed agents in parallel.
  const [apps, installedAgents] = await Promise.all([
    Promise.resolve(internal.detectApps(cwd)),
    internal.detectInstalledAgents(),
  ]);

  const plan = planSteps(apps);

  // Phase 2 — agent step.
  const agent = await internal.pickAgent(installedAgents, plan.agentLabel);
  if (agent === undefined) return;

  // Phase 3 — app-root step.
  const appRoots = await internal.pickAppRoot(cwd, apps, plan.appRootLabel);
  if (appRoots === undefined || appRoots.length === 0) return;

  // Phase 4 — reconfigure consent for picked apps that already have configs.
  const existing = await internal.detectExistingConfigs(appRoots);
  if (existing.length > 0) {
    const proceed = await confirmReconfigure(existing, cwd, internal);
    if (!proceed) return;
  }

  // Phase 5 — framework step (one shared pick for ambiguous apps).
  const fallbackFramework: FrameworkChoice | undefined = plan.frameworkStepNeeded
    ? await runFrameworkStep(apps, appRoots, plan.frameworkLabel, internal)
    : undefined;
  if (plan.frameworkStepNeeded && fallbackFramework === undefined) return;

  // Phase 6 — assemble per-app config inputs.
  const perApp = appRoots.map((appPath) => {
    const detected = apps.find((a) => a.path === appPath)?.framework;
    const framework = detected ?? fallbackFramework;
    if (framework === undefined) {
      // Cannot happen: planSteps would have set frameworkStepNeeded=true
      // and Phase 5 would have returned a value or aborted.
      throw new Error(`No framework resolved for app ${appPath}`);
    }
    return { appPath, framework };
  });

  // Phase 7 — write configs.
  try {
    await internal.writeWizardConfig({ cwd, agent, perApp });
  } catch (err: unknown) {
    await showFailureToast(cwd, err, deps.runInitInTerminal, internal);
    return;
  }

  // Phase 8 — refresh + post-install.
  await deps.onSuccess();

  const postInstallDeps: RunPostInstallDeps = {
    runInstallInTerminal: (terminalCwd, commands, agentLabel) => {
      const terminal = internal.createTerminal({
        name: `PinFlow — ${agentLabel}-Plugin installieren`,
        cwd: terminalCwd,
      });
      for (const cmd of commands) {
        terminal.sendText(cmd);
      }
      terminal.show();
    },
  };

  await internal.runPostInstall(agent, cwd, postInstallDeps);
}

async function runFrameworkStep(
  apps: readonly DetectedApp[],
  appRoots: readonly string[],
  stepLabel: string,
  internal: WizardInternalDeps,
): Promise<FrameworkChoice | undefined> {
  // Find the first picked app that has no detection — use it for prompt context.
  const firstAmbiguousAppRoot = appRoots.find((root) => {
    const detected = apps.find((a) => a.path === root)?.framework;
    return detected === undefined;
  });
  const detectedAppForStep: DetectedApp =
    apps.find((a) => a.path === firstAmbiguousAppRoot) ??
    { path: firstAmbiguousAppRoot ?? appRoots[0] };

  return internal.pickFramework(detectedAppForStep, stepLabel);
}

async function confirmReconfigure(
  existing: readonly string[],
  cwd: string,
  internal: WizardInternalDeps,
): Promise<boolean> {
  const labels = existing.map((p) => path.relative(cwd, p) || path.basename(p)).join(', ');
  const action = await internal.showInformationMessage(
    `PinFlow ist bereits konfiguriert in: ${labels}. Bestehende Konfiguration überschreiben?`,
    'Überschreiben',
    'Abbrechen',
  );
  return action === 'Überschreiben';
}

async function showFailureToast(
  cwd: string,
  err: unknown,
  runInitInTerminal: (cwd: string) => void,
  internal: WizardInternalDeps,
): Promise<void> {
  const folderName = path.basename(cwd);
  const message =
    err instanceof Error
      ? `PinFlow-Setup fehlgeschlagen für ${folderName}: ${err.message}`
      : `PinFlow-Setup fehlgeschlagen für ${folderName}.`;

  const action = await internal.showErrorMessage(message, 'Terminal öffnen');
  if (action === 'Terminal öffnen') runInitInTerminal(cwd);
}
```

- [ ] **Step 2: Update `wizard.spec.ts`**

The wizard spec gets a comprehensive update. Replace its contents with:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';

import { runWizard, __test_resetPendingWizards } from './wizard.js';
import type { WizardInternalDeps, RunWizardDeps } from './wizard.js';

afterEach(() => {
  __test_resetPendingWizards();
});

function makeInternalDeps(
  overrides: Partial<WizardInternalDeps> = {},
): WizardInternalDeps {
  return {
    detectApps: vi.fn(() => []),
    detectInstalledAgents: vi.fn(async () => ({
      codex: false,
      'claude-code': false,
      copilot: false,
    })),
    detectExistingConfigs: vi.fn(async () => []),
    pickAgent: vi.fn(async () => 'codex'),
    pickAppRoot: vi.fn(async () => undefined),
    pickFramework: vi.fn(async () => 'vite'),
    writeWizardConfig: vi.fn(async () => {}),
    runPostInstall: vi.fn(async () => {}),
    showInformationMessage: vi.fn(async () => undefined),
    showErrorMessage: vi.fn(async () => undefined),
    createTerminal: vi.fn(() => ({ sendText: vi.fn(), show: vi.fn() })),
    ...overrides,
  };
}

function makeUserDeps(): RunWizardDeps {
  return {
    onSuccess: vi.fn(),
    runInitInTerminal: vi.fn(),
  };
}

describe('runWizard step plan', () => {
  it('single-app fresh: 1-step counter, no app-root prompt, no framework prompt, writes once', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
    });
    const userDeps = makeUserDeps();

    // Act
    await runWizard('/repo', userDeps, internal);

    // Assert — agent step receives empty step label (only 1 step total)
    expect(internal.pickAgent).toHaveBeenCalledWith(expect.anything(), '');
    expect(internal.pickFramework).not.toHaveBeenCalled();
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [{ appPath: '/repo', framework: 'vite' }],
    });
    expect(internal.runPostInstall).toHaveBeenCalled();
  });

  it('monorepo all-detected: 2-step counter (agent + multi-select), framework auto-skips per app', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web', framework: 'vite' },
        { path: '/repo/apps/api', framework: 'webpack' },
      ]),
      pickAppRoot: vi.fn(async () => ['/repo/apps/web', '/repo/apps/api']),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickAgent).toHaveBeenCalledWith(expect.anything(), 'Schritt 1/2');
    expect(internal.pickAppRoot).toHaveBeenCalledWith(
      '/repo',
      expect.any(Array),
      'Schritt 2/2',
    );
    expect(internal.pickFramework).not.toHaveBeenCalled();
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [
        { appPath: '/repo/apps/web', framework: 'vite' },
        { appPath: '/repo/apps/api', framework: 'webpack' },
      ],
    });
  });

  it('monorepo mixed (one ambiguous): 3-step counter, shared framework applied to ambiguous only', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web', framework: 'vite' },
        { path: '/repo/tools/scripts' }, // no framework
      ]),
      pickAppRoot: vi.fn(async () => ['/repo/apps/web', '/repo/tools/scripts']),
      pickFramework: vi.fn(async () => 'webpack'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickAgent).toHaveBeenCalledWith(expect.anything(), 'Schritt 1/3');
    expect(internal.pickAppRoot).toHaveBeenCalledWith(
      '/repo',
      expect.any(Array),
      'Schritt 2/3',
    );
    expect(internal.pickFramework).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/repo/tools/scripts' }),
      'Schritt 3/3',
    );
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [
        { appPath: '/repo/apps/web', framework: 'vite' },
        { appPath: '/repo/tools/scripts', framework: 'webpack' },
      ],
    });
  });

  it('zero apps: 2-step counter (agent + framework), InputBox-supplied path used', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => []),
      pickAppRoot: vi.fn(async () => ['/manual/path']),
      pickFramework: vi.fn(async () => 'vite'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickAgent).toHaveBeenCalledWith(expect.anything(), 'Schritt 1/3');
    expect(internal.pickFramework).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/manual/path' }),
      'Schritt 3/3',
    );
    expect(internal.writeWizardConfig).toHaveBeenCalledWith({
      cwd: '/repo',
      agent: 'codex',
      perApp: [{ appPath: '/manual/path', framework: 'vite' }],
    });
  });
});

describe('runWizard cancellation', () => {
  it('returns early when agent step cancelled', async () => {
    // Arrange
    const internal = makeInternalDeps({
      pickAgent: vi.fn(async () => undefined),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickAppRoot).not.toHaveBeenCalled();
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('returns early when app-root step cancelled', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ]),
      pickAppRoot: vi.fn(async () => undefined),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.pickFramework).not.toHaveBeenCalled();
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('returns early when app-root multi-select empty', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [
        { path: '/repo/apps/web' },
        { path: '/repo/apps/api' },
      ]),
      pickAppRoot: vi.fn(async () => []),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('returns early when framework step cancelled', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      pickFramework: vi.fn(async () => undefined),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });
});

describe('runWizard reconfigure flow', () => {
  it('shows reconfigure prompt when picked app already has config; "Überschreiben" continues', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      detectExistingConfigs: vi.fn(async () => ['/repo']),
      showInformationMessage: vi.fn(async () => 'Überschreiben'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('Bestehende Konfiguration überschreiben?'),
      'Überschreiben',
      'Abbrechen',
    );
    expect(internal.writeWizardConfig).toHaveBeenCalled();
  });

  it('cancels when user picks "Abbrechen" on reconfigure prompt', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      detectExistingConfigs: vi.fn(async () => ['/repo']),
      showInformationMessage: vi.fn(async () => 'Abbrechen'),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert
    expect(internal.writeWizardConfig).not.toHaveBeenCalled();
  });

  it('skips reconfigure prompt when no picked app has existing config', async () => {
    // Arrange
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      detectExistingConfigs: vi.fn(async () => []),
    });

    // Act
    await runWizard('/repo', makeUserDeps(), internal);

    // Assert — showInformationMessage is not called for the reconfigure prompt
    // (it might still be called by other code paths, so we check the specific
    // call with "Überschreiben" wasn't made)
    const calls = (internal.showInformationMessage as ReturnType<typeof vi.fn>).mock.calls;
    const reconfigureCall = calls.find((c) => c[0]?.includes?.('Überschreiben'));
    expect(reconfigureCall).toBeUndefined();
    expect(internal.writeWizardConfig).toHaveBeenCalled();
  });
});

describe('runWizard error handling', () => {
  it('shows German error toast when writeWizardConfig throws; "Terminal öffnen" opens terminal', async () => {
    // Arrange
    const userDeps = makeUserDeps();
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      writeWizardConfig: vi.fn(async () => {
        throw new Error('disk full');
      }),
      showErrorMessage: vi.fn(async () => 'Terminal öffnen'),
    });

    // Act
    await runWizard('/repo', userDeps, internal);

    // Assert
    expect(internal.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('PinFlow-Setup fehlgeschlagen'),
      'Terminal öffnen',
    );
    expect(userDeps.runInitInTerminal).toHaveBeenCalledWith('/repo');
    expect(internal.runPostInstall).not.toHaveBeenCalled();
  });
});

describe('runWizard concurrency lock', () => {
  it('prevents concurrent invocations for same cwd', async () => {
    // Arrange
    let agentResolve: ((v: 'codex') => void) | null = null;
    const internal = makeInternalDeps({
      detectApps: vi.fn(() => [{ path: '/repo', framework: 'vite' }]),
      pickAppRoot: vi.fn(async () => ['/repo']),
      pickAgent: vi.fn(
        () =>
          new Promise<'codex'>((resolve) => {
            agentResolve = resolve;
          }),
      ),
    });

    // Act — start two wizards for the same cwd concurrently
    const first = runWizard('/repo', makeUserDeps(), internal);
    const second = runWizard('/repo', makeUserDeps(), internal);
    agentResolve?.('codex');
    await Promise.all([first, second]);

    // Assert — only one wizard ran
    expect(internal.pickAgent).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run wizard tests**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/wizard.spec.ts
```
Expected: all green.

- [ ] **Step 4: Run all wizard tests as a sanity check**

```bash
cd packages/pinflow-vscode && corepack pnpm exec vitest run src/core/onboarding/wizard/
```
Expected: all suites green.

- [ ] **Step 5: Typecheck the package — should now be clean (Task 3 deferred typecheck)**

```bash
cd packages/pinflow-vscode && corepack pnpm exec tsc -p tsconfig.lib.json --noEmit
```
Expected: zero TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/core/onboarding/wizard/wizard.ts packages/pinflow-vscode/src/core/onboarding/wizard/wizard.spec.ts
git commit -m "feat(vscode): wizard computes step plan, gates reconfigure, writes per-app configs"
```

---

## Task 9 — Quality gate: full lint + tests + VSIX rebuild

**Files:** none (verification only)

- [ ] **Step 1: Run lint, typecheck, and full test suite for pinflow-vscode**

```bash
nx lint pinflow-vscode && nx typecheck pinflow-vscode && nx test pinflow-vscode
```
Expected: all green. Fix anything that broke (most likely candidates: import order, unused imports left over from refactors).

- [ ] **Step 2: Build the VSIX**

```bash
corepack pnpm --filter pinflow-vscode run package:vsix
```
Expected: a `.vsix` file in `packages/pinflow-vscode/`. The `registry:publish` machinery may bump versions in tracked package.json files — if so, revert them with `git checkout -- package.json packages/*/package.json` to keep the branch clean.

- [ ] **Step 3: Manual smoke checklist** (skip if no VS Code at hand — user will run this in the smoke phase)

For documentation in the PR description, the user will verify:

  1. **Single-app fresh project (Vite)**: Setup PinFlow → 1 click on Agent → "Framework erkannt: Vite" toast → success toast with [Ausführen] [Befehl anzeigen] [Überspringen].
  2. **Monorepo with 2 detected Vite apps**: Setup PinFlow → Agent click → multi-select all-checked → [OK] → 2 configs written, both with `appRoot: "."`.
  3. **Reconfigure on configured single-app**: Setup PinFlow again → Agent click → "Bestehende Konfiguration überschreiben?" → [Überschreiben] → config rewritten.
  4. **Codex Run**: success toast → [Ausführen] → terminal opens, runs only `codex mcp add ...`, succeeds.
  5. **All UI strings German**: Walk the full wizard, confirm no English remnants.

- [ ] **Step 4: Commit any cleanup from Step 1 if needed**

```bash
git status
# If anything changed during lint --fix:
git add -A && git commit -m "chore(vscode): lint cleanup after C.1.9 refactor"
```

---

## Task 10 — Push, PR, merge

**Files:** none (git operations)

- [ ] **Step 1: Push branch**

```bash
git push -u origin feature/c19-aggressive-onboarding-defaults
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat(vscode): C.1.9 aggressive onboarding defaults" --body "$(cat <<'EOF'
## Summary

- Framework step auto-skips when detected (silent toast "Framework erkannt: X")
- App-root step supports multi-select for monorepos (all-checked default)
- Honest dynamic step counter ("1/2", "2/2", or empty when single step)
- Drop known-broken `codex marketplace add` — only `codex mcp add` runs
- All wizard UI strings are German
- `pinflow.config.json` written per app with `appRoot: "."` (monorepo-friendly)
- Reconfigure flow: prompt before overwriting existing configs

## Test plan
- [ ] Single-app Vite: 1 click + auto framework
- [ ] Monorepo 2 apps: 2 clicks (Agent + multi-select) → 2 configs written
- [ ] Mixed monorepo (one ambiguous): 3 clicks (Agent + multi-select + framework) → shared framework applied to ambiguous only
- [ ] Reconfigure: existing config triggers "Überschreiben?" prompt
- [ ] Codex Run: terminal runs single working command
- [ ] No English remnants in wizard UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Merge PR (per user's git autonomy memory)**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Self-Review

- [x] **Spec coverage:**
  - §1 Framework auto-skip → Task 5
  - §2 Multi-select app-root → Task 6
  - §3 Honest step counter → Tasks 5, 6, 7, 8 (label injection + plan)
  - §4 Drop broken codex command → Task 4
  - §5 German UI → Tasks 4, 5, 6, 7, 8 (every step string + wizard error)
  - §6 Relative `appRoot` + per-app writes → Tasks 2, 3
  - §7 Reconfigure flow → Tasks 1 (helper), 8 (orchestration)
- [x] **Placeholder scan:** No "TBD"/"TODO" left. All test code is concrete.
- [x] **Type consistency:** `WriteConfigBatchInput.perApp` shape matches `runWizardSteps` Phase 6. `pickAppRoot` returns `readonly string[] | undefined`, used consistently in wizard. `pickFramework` signature `(detectedFromApp, stepLabel, deps?)` matches injection in `DEFAULT_INTERNAL_DEPS`. `pickAgent` `AgentStepDeps.stepLabel` flows from wizard `plan.agentLabel` to inside the QuickPick title. `detectExistingConfigs` signature `(appPaths, deps?)` matches the test stubs.

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-05-06-pinflow-vscode-package-4c19-aggressive-onboarding-defaults-implementation.md`.**

User has pre-authorized subagent-driven execution per memory `feedback_git_autonomy`. Proceed via subagent-driven-development: one Sonnet implementer subagent per task, two-stage review (spec-review + code-quality-review) where the change risk warrants it, then push/merge end-to-end without per-step confirmation.
