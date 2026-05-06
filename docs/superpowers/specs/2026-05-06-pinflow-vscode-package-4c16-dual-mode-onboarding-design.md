# PinFlow VS Code Extension — Package 4 Phase C.1.6: Dual-Mode Onboarding

## Goal

Replace the C.1.5 "always-terminal" Setup behavior with a dual-mode onboarding system. Default mode runs `pinflow init` programmatically as a hidden background subprocess — the user never sees a terminal panel, just a progress notification and a success toast. Power-user / developer mode (opt-in via setting or dedicated command) preserves today's terminal-first behavior unchanged. After C.1.6, the standard onboarding flow from "click Setup PinFlow" to "folder configured" requires zero CLI/terminal touch from the user's perspective.

## Why Now

Phase C.1.5 closed the multi-folder onboarding *visibility* gap, but the click-action still drops the user into a terminal where they have to step through `pinflow init`. The 2026-05-06 user-intent crystallization made the strategic direction explicit: *Marketplace-target users (Phase E) must reach a working `.pinflow/` setup without ever seeing a terminal.* Power-users keep the terminal as opt-in.

C.1.6 lands now because:

1. **Marketplace blocker if deferred.** Every phase between here and E that touches onboarding (Phase B Live-Logs, Phase D Filters) inherits whichever default we leave in place. Establishing dual-mode now keeps the contract clean for those phases.
2. **Trivial scope today.** The init wizard's `--yes` flag already supports non-interactive use; we just need to wire spawn + progress UI. Letting it slip increases scope (e.g. Phase B might want to preview the init result).
3. **C.1.5 smoke surfaced reusable polish items** (AAA-Leerzeile-nits, executable-bit Build-step) that fit naturally in the same branch.

## Non-Goals (parked)

- **Run-Workflow auto-mode.** `pinflow dev` (long-running subprocess + output streaming + stop affordance) is a substantially bigger UX problem and gets its own phase later. C.1.6 is init-only.
- **Custom in-Extension Init Wizard via QuickPick.** Replicating the clack prompts (agent select / framework / monorepo) as VS Code QuickPicks is a real port, ~2-3 extra days. Out of scope. Auto-mode here uses `--yes` defaults; users who want custom choices switch to terminal mode.
- **CLI bundling inside the VSIX.** The extension still requires `pinflow` to be available on PATH. Self-bundling the CLI is a Phase E packaging decision.
- **Stop / cancel mid-init.** The auto-mode subprocess runs to completion; cancellation requires more state machinery. If users hit issues, terminal mode lets them Ctrl+C.

## Architectural Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Mode-switch mechanism | **Setting `pinflow.onboarding.mode`** with values `'auto' \| 'terminal'`, default `'auto'` | Single source of truth, persists across sessions, easy to discover via `Cmd+,` settings UI. Boolean was considered but enum gives forward-compat for a third mode (e.g. `'wizard'` if we add the QuickPick port later). |
| Power-user override | **Always-available command** `PinFlow: Run Init in Terminal` (forces terminal regardless of setting) | Discoverable via Command Palette (Cmd+Shift+P → "init terminal"). No new sidebar UI clutter. Power-user can also flip the setting permanently. |
| Auto-mode invocation | **`child_process.spawn('pinflow', ['init', '--yes', '--agent', defaultProvider, '--app-root', folder])`** with `cwd: folder`, stdout/stderr captured | The wizard's `--yes` mode skips most clack prompts; passing `--agent` + `--app-root` explicitly skips the remaining ones (agent-multiselect at agent-step:75, monorepo-confirm at monorepo-step:166). End-to-end non-interactive. |
| Default agent for auto-mode | **Read from existing `pinflow.externalHandoff.defaultProvider` setting** (default `'codex'`) | Reuses existing user-config; no new "default agent" setting needed. Power-user changes provider via existing UI. |
| Progress UI | **`vscode.window.withProgress` notification** (location `Notification`, cancellable: false) | Matches VS Code conventions (Git pull, NPM install). Title: "PinFlow setup running for $folderName". Auto-dismisses on success. |
| Success toast | **InformationMessage** "PinFlow ready in $folderName" with action `Open Folder Status` (focuses sidebar Status view to that folder) | Single click confirms completion. Action gives immediate value. |
| Failure toast | **ErrorMessage** with stderr-tail and actions `Show Output`, `Open Terminal` (drops user into terminal mode for retry) | Honest about failure, gives recovery path. Failed init should NOT silently leave folder in broken state — `--force false` (default) means existing config not overwritten. |
| CLI-not-found handling | **Detect via spawn `ENOENT` event** OR pre-spawn check via `which pinflow` | When auto-mode can't find CLI, surface a specific toast: "PinFlow CLI not found. See [docs] or use Terminal mode." with `Open Terminal Anyway` action. |
| Refresh trigger after success | **Force `refreshAll()` immediately**, not waiting for the 3s poll tick | Sub-second feedback that folder flipped from Setup → configured. Existing refreshAll is idempotent + cheap. |
| Status feedback during run | **Single VS Code progress notification + status-bar text update** ("PinFlow init: $step") | No need for full output panel; that's terminal-mode territory. Status messages parsed loosely from stdout (e.g. clack lines starting with `◇` or `✓`). |
| Concurrency lock | **Per-folder `Set<string> pendingInits`** prevents double-clicks | If user double-clicks Setup, second click is no-op until first completes. |
| Polish items batched | **Same branch handles AAA-Leerzeile fixes + executable-bit build step** | Small, related, reduces branch churn. Keeps C.1.6 a clean "onboarding polish" delivery. |

## Architecture

### File-level changes

```
packages/pinflow-vscode/
├── package.json                                              # MOD — new setting + new command
├── src/
│   ├── extension.ts                                          # MOD — register pinflow.runInitInTerminal command, update pinflow.runInit handler to dispatch on mode
│   ├── core/
│   │   ├── onboarding/                                       # NEW — module
│   │   │   ├── index.ts                                      # NEW — barrel
│   │   │   ├── auto-init.ts                                  # NEW — spawn + progress + toast logic (pure-ish, takes a deps interface)
│   │   │   ├── auto-init.spec.ts                             # NEW
│   │   │   ├── cli-detection.ts                              # NEW — detect pinflow binary availability
│   │   │   └── cli-detection.spec.ts                         # NEW
│   │   └── views/
│   │       ├── status-view-model.ts                          # MOD — Setup tooltip mentions current mode
│   │       └── status-view-model.spec.ts                     # MOD
│   └── runs-webview/components/
│       └── pinflow-folder-section.spec.ts                    # MOD — fix AAA-Leerzeile-nit from C.1.5 review
└── packages/pinflow-cli/
    └── package.json or build script                          # MOD — ensure executable bit on bin/pinflow.js after build (separate work item, see "Polish" below)
```

No new lit components. No webview-message protocol changes. Keeps the diff narrow.

### Manifest contributions (`package.json`)

#### New setting

```jsonc
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

#### New command

```jsonc
{
  "command": "pinflow.runInitInTerminal",
  "title": "PinFlow: Run Init in Terminal",
  "category": "PinFlow"
}
```

Visible in Command Palette only — not bound to any sidebar action. Power-user fallback that bypasses the setting and always opens a terminal.

### `pinflow.runInit` command — dispatch on mode

```ts
vscode.commands.registerCommand(
  'pinflow.runInit',
  async (folderPath?: unknown) => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      void vscode.window.showInformationMessage(
        'Open a workspace folder to run PinFlow init.',
      );
      return;
    }
    const cwd = resolveRunInitCwd(folderPath, folders, activeFolder);
    const mode = vscode.workspace
      .getConfiguration('pinflow')
      .get<'auto' | 'terminal'>('onboarding.mode', 'auto');

    if (mode === 'terminal') {
      runInitInTerminal(cwd);
      return;
    }
    await runInitInAuto(cwd, () => refreshAll());
  },
),
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

The existing `formatPinFlowCliCommand` + `vscode.window.createTerminal` logic moves into a small named helper `runInitInTerminal(cwd: string)`. The new `runInitInAuto(cwd, onSuccess)` lives in `core/onboarding/auto-init.ts`.

### `auto-init.ts` — programmatic spawn

```ts
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as vscode from 'vscode';

import { detectPinFlowCli } from './cli-detection.js';

export interface RunInitInAutoDeps {
  readonly defaultProvider: string;       // from pinflow.externalHandoff.defaultProvider
  readonly onSuccess: () => Promise<void> | void;  // refresh trigger
}

const pendingInits = new Set<string>();   // module-level concurrency lock

export async function runInitInAuto(
  cwd: string,
  deps: RunInitInAutoDeps,
): Promise<void> {
  if (pendingInits.has(cwd)) return;          // double-click guard
  pendingInits.add(cwd);
  try {
    const cliCheck = await detectPinFlowCli();
    if (!cliCheck.available) {
      await showCliNotFoundToast(cwd, cliCheck.reason);
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
      const result = await runSpawn({
        command: 'pinflow',
        args: ['init', '--yes', '--agent', deps.defaultProvider, '--app-root', cwd],
        cwd,
        onStdoutLine: (line) => updateProgressFromLine(progress, line),
      });
      if (result.code === 0) {
        await deps.onSuccess();
        showSuccessToast(folderName, cwd);
      } else {
        showFailureToast(folderName, cwd, result.stderr);
      }
    },
  );
}
```

`runSpawn` is a small async helper that wraps `child_process.spawn`, returns `{code, stdout, stderr}`, and emits stdout lines to the optional `onStdoutLine` callback.

`updateProgressFromLine` does loose pattern-matching on clack-style lines:
- Lines containing "agent" → `progress.report({ message: 'Configuring agent…' })`
- Lines containing "framework" → `progress.report({ message: 'Detecting framework…' })`
- Otherwise no-op (clack's decorative output stays silent)

Best-effort UX, never blocks on parse failures.

### `cli-detection.ts` — find pinflow binary

```ts
export interface CliCheckResult {
  readonly available: boolean;
  readonly reason?: 'not-on-path' | 'not-executable' | 'unknown';
  readonly detail?: string;
}

export async function detectPinFlowCli(): Promise<CliCheckResult> {
  // Try `which pinflow` (or where on Win32) and check the resolved path is executable.
  // Return structured result. The function is pure (no side effects beyond child_process exec).
}
```

Used pre-spawn so we can show a tailored toast instead of a raw ENOENT.

Implementation note: don't cache the result across sessions — if user installs CLI mid-session we should detect on next attempt.

### Toasts

```ts
async function showCliNotFoundToast(cwd: string, reason?: string): Promise<void> {
  const action = await vscode.window.showErrorMessage(
    `PinFlow CLI not found${reason ? ` (${reason})` : ''}. Install it or use Terminal mode.`,
    'Open Terminal Anyway',
    'Open Docs',
  );
  if (action === 'Open Terminal Anyway') runInitInTerminal(cwd);
  if (action === 'Open Docs') void vscode.env.openExternal(vscode.Uri.parse('https://github.com/Dom-303/pinflow#installation'));
}

function showSuccessToast(folderName: string, cwd: string): void {
  void vscode.window.showInformationMessage(
    `PinFlow ready in ${folderName}.`,
    'Open Folder Status',
  ).then((action) => {
    if (action === 'Open Folder Status') {
      // focuses the sidebar Status view; the folder is now configured so the right accordion expands automatically
      void vscode.commands.executeCommand('pinflow.status.focus');
    }
  });
}

function showFailureToast(folderName: string, cwd: string, stderr: string): void {
  const tail = stderr.split('\n').slice(-3).join('\n').trim();
  void vscode.window.showErrorMessage(
    `PinFlow init failed for ${folderName}: ${tail || 'Unknown error'}`,
    'Open Terminal',
  ).then((action) => {
    if (action === 'Open Terminal') runInitInTerminal(cwd);
  });
}
```

### `runInitInTerminal` helper (extracted from existing extension.ts)

```ts
export function runInitInTerminal(cwd: string): void {
  const terminal = vscode.window.createTerminal({ name: 'PinFlow Init', cwd });
  terminal.sendText(formatPinFlowCliCommand(cwd, ['init']));
  terminal.show();
}
```

Existing logic, just lifted into a named function so both `pinflow.runInit` (terminal-mode branch) and `pinflow.runInitInTerminal` (always-terminal command) call it.

### `status-view-model.ts` — tooltip update

```ts
const SETUP_ITEM_BASE = {
  id: 'setup',
  label: 'Setup PinFlow',
  description: 'run pinflow init',
  // Tooltip becomes mode-aware:
  //   auto → 'Click to scaffold .pinflow/ in this folder (auto mode)'
  //   terminal → 'Click to scaffold .pinflow/ in this folder (terminal mode)'
  // Mode is read inside buildStatusFolderGroups; SETUP_ITEM_BASE only carries the static parts.
  themeIcon: 'rocket',
} as const;
```

Tooltip dynamic so the user immediately sees which mode will fire on click. Test asserts both tooltip variants.

### Polish items in same branch

1. **AAA-Leerzeile fix** in `pinflow-folder-section.spec.ts` (third unconfigured-state test from C.1.5 review)
2. **Executable-bit build step** for `pinflow-cli/dist/.../bin/pinflow.js` — likely a `chmod +x` in a `postbuild` script in `pinflow-cli/package.json` or in the project's nx target. Investigate during implementation; if more than 30min effort, defer to a separate followup PR.

## Tests

### `auto-init.spec.ts` (new file)

| Test | Expects |
|---|---|
| `runInitInAuto` returns early if pendingInits already contains cwd | spawn never called |
| `runInitInAuto` invokes onSuccess callback when subprocess exits 0 | callback called once |
| `runInitInAuto` does NOT invoke onSuccess on non-zero exit | callback not called |
| `runInitInAuto` shows error toast with stderr tail on failure | mock `vscode.window.showErrorMessage` receives expected message |
| `runInitInAuto` releases the concurrency lock in both success and failure | second call succeeds after first finishes |
| `runInitInAuto` shows CLI-not-found toast when detection fails | mock receives expected message + actions |
| `runInitInAuto` invokes spawn with correct args (`--yes`, `--agent`, `--app-root`) | mock spawn-args match |

7 new tests using `vi.mock` for `child_process` + `vscode` stubs.

### `cli-detection.spec.ts` (new file)

| Test | Expects |
|---|---|
| `detectPinFlowCli` returns `available: true` when binary resolves and is executable | result shape |
| Returns `available: false, reason: 'not-on-path'` when which/where fails | structured failure |
| Returns `available: false, reason: 'not-executable'` when binary exists but lacks +x | structured failure |
| Does not throw on unexpected errors (returns `reason: 'unknown'`) | resilience |

4 new tests.

### `status-view-model.spec.ts` (modify)

| Test | Expects |
|---|---|
| Setup tooltip in auto mode contains `(auto mode)` text | tooltip string |
| Setup tooltip in terminal mode contains `(terminal mode)` text | tooltip string |

2 new tests on top of existing.

### `extension-manifest.spec.ts` (modify)

| Test | Expects |
|---|---|
| Setting `pinflow.onboarding.mode` is contributed with enum `['auto', 'terminal']` and default `'auto'` | new test |
| Command `pinflow.runInitInTerminal` is contributed | new test |

2 new tests.

### Test count delta

- New tests: ~13 (auto-init 7 + cli-detection 4 + status-view-model 2 + manifest 2)
- Existing tests touched: ~3 (status-view-model setup-tests get tooltip-mode parameterization, AAA-fix in folder-section spec)
- Net pinflow-vscode delta: ~+13 → ending around 182 tests (current 169 + 13).

## Risk Resolutions

| Risk | Resolution |
|---|---|
| `pinflow init --yes` still prompts in unusual project shapes (no detected framework, monorepo with 0 apps) | Pass `--app-root ${cwd}` explicitly to skip monorepo detection. Framework/agent-step `--yes` paths are guarded (verified by reading source). If a corner case still hangs, the spawn timeout (60s) kicks in and we surface a failure toast with "Open Terminal" action. |
| Spawn hangs indefinitely | 60s timeout via `setTimeout` clearing on exit; on timeout, `child.kill('SIGTERM')` + show failure toast. |
| User clicks Setup repeatedly during a slow run | `pendingInits` Set is the lock; second click is no-op. |
| User changes `pinflow.onboarding.mode` mid-run | Read happens at command-invocation time, not during run. Mode change applies to next click. |
| User has CLI installed but PATH doesn't propagate to Extension host (common on macOS/WSL) | Detection uses VS Code's `process.env.PATH` directly. If still not found, error toast guides user to Terminal mode (which uses VS Code's terminal env, often more permissive). |
| `pinflow init` succeeds but creates files outside the user's expected scope | The `--app-root ${cwd}` arg pins it to the clicked folder. The wizard's own logic only writes inside that folder + its `.gitignore`. No regression risk vs. terminal mode. |
| Toast `'Open Folder Status'` action's command `pinflow.status.focus` may not exist as the registered focus command | VS Code auto-generates `${viewId}.focus` for contributed views. Implementer must verify the contributed view ID in `package.json` matches. If the auto-command doesn't fire, action falls back silently (no error). |
| Status-view tooltip is mode-aware but Actions-view Setup-leaf tooltip is not | Intentional — Actions-leaves render their tooltip far less prominently (no description column shown by default in TreeView "Actions"), and the user-facing affordance is the row click which dispatches identically in both views. Adding mode-awareness there is scope-creep without UX gain. |
| `pendingInits` Set survives between unit tests | Tests must reset it explicitly via the test-only export `__test_resetPendingInits` in a `beforeEach` block — `vi.clearAllMocks()` does NOT clear module-level Sets. |
| Spawn timeout (180s) too short for first-run agent install on slow networks | If 180s isn't enough in real-world testing, lift to a setting `pinflow.onboarding.spawnTimeoutMs` later. Default 180s covers ~95% of cases (agent install is the heavy step; everything else is config writes). |
| `--agent` flag receives a value the CLI doesn't support (e.g. user has an unusual `defaultProvider`) | The CLI validates and errors with `Invalid agent: ...` to stderr. Failure toast surfaces stderr-tail. Recovery via Terminal mode where user picks interactively. |
| Polish: executable-bit fix touches build pipeline | Bounded scope — if the fix is more than a one-liner `chmod` in package.json scripts or nx target, defer to a separate PR. Don't let polish derail the main feature. |

## Manual Smoke Test (final verification gate for Phase C.1.6)

1. Build VSIX: `corepack pnpm --filter pinflow-vscode run package:vsix`. Install in VS Code.
2. **Setting default is `auto`:**
   - Open Settings (`Cmd+,`), search "pinflow onboarding". Confirm default is `auto`.
3. **Auto-mode happy path:**
   - Open mixed workspace, click Setup PinFlow on unconfigured folder F.
   - Progress notification appears: "PinFlow setup for $F".
   - Within 5-15s, success toast: "PinFlow ready in $F". No terminal panel opens.
   - Sidebar Status accordion for F flips from Setup leaf to Relay/Runner/Workspace/Preview rows within ~1s.
4. **Auto-mode CLI not found:**
   - Temporarily rename `pinflow` binary so `which pinflow` fails. Click Setup.
   - Error toast appears: "PinFlow CLI not found...". Action `Open Terminal Anyway` opens terminal at correct cwd.
5. **Auto-mode failure path:**
   - In a folder where `pinflow init` will fail (e.g. simulate by setting `--app-root` to non-writable path or by breaking the CLI), click Setup.
   - Error toast surfaces stderr tail. Action `Open Terminal` opens terminal at cwd for retry.
6. **Terminal-mode via setting:**
   - Toggle setting to `terminal`. Click Setup on a different unconfigured folder.
   - Terminal opens with `pinflow init`, just like C.1.5 behavior. No progress notification.
7. **Terminal-mode via Command Palette:**
   - Setting back to `auto`. Run `PinFlow: Run Init in Terminal` from Command Palette.
   - Terminal opens at active folder. Confirms power-user always-available path.
8. **Setup tooltip mode-aware:**
   - In auto mode: hover Setup leaf → tooltip ends with `(auto mode)`.
   - Switch to terminal mode → tooltip ends with `(terminal mode)`.
9. **Concurrency lock:**
   - Click Setup rapidly (5x) on same folder. Only one progress notification appears.
10. **Refresh integration:**
    - After successful auto-init, the folder's accordion children update within 1s without manual refresh. The `pinflow.notConfigured` context updates accordingly.
11. **No regression:**
    - C.1.5 multi-folder mixed-state behavior unchanged for non-Setup paths.
    - Phase A walkthrough still appears on first install.
    - Phase A's `pinflow.switchFolder` still works.
    - C.1 multi-folder simultaneous tracking still works.

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

All eight green. Then manual smoke.

## Out of Scope (parked, restated)

- Run-Workflow (`pinflow dev`) auto-mode — own phase later
- Custom in-Extension Init Wizard via QuickPick — Phase D/E if ever
- CLI bundling inside VSIX — Phase E
- Cancel mid-init UI
- `--force` overwrite affordance (existing `--force` flag in CLI is enough; auto-mode never forces)
- Settings UI redesign
