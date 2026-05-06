# PinFlow VSCode Phase C.1.9 — Aggressive Onboarding Defaults

**Status:** approved (2026-05-06)
**Predecessor:** [C.1.8 Guided Onboarding Polish](2026-05-06-pinflow-vscode-package-4c18-guided-onboarding-polish-design.md)
**Successor (planned):** Phase B — Run-Visualisierung

## Why this exists

C.1.5 → C.1.8 produced a working guided wizard, but the smoke test surfaced
real-user friction:

- The framework step asks 4 options even when the framework is unambiguously
  detected ("✓ erkannt" badge is decoration, not action).
- The app-root step is single-pick — a 4-app monorepo means 4 separate wizard
  runs with no way to do them in one pass.
- The step counter ("1/3 → 3/3") is hardcoded, so when steps auto-skip the
  numbering becomes nonsensical.
- The post-install Run button executes a known-broken `codex marketplace add`
  command. The user sees the failure firsthand — exactly the opposite of
  "klick und es geht".
- UI strings drift between German and English depending on which step you're
  on.

Two issues found during the critical pass that the user didn't flag but bite
the same vision:

- `pinflow.config.json` is written at the wizard's `cwd` with an absolute
  `appRoot` — fine for a single-app workspace, structurally wrong for
  multi-app where each app needs its own config.
- A second wizard run on an already-configured folder throws a raw
  "already exists" error and offers "Open Terminal" as the only recovery,
  with no way to reconfigure from the UI.

This spec resolves all of the above in a single coherent pass so the wizard
finally matches the "klick und es geht" promise the user has been articulating
since C.1.6.

## Out of scope

- InputBox path validation in the 0-apps branch (edge case, no user feedback).
- Caching install state per agent across wizard runs (over-clever; Skip is
  enough).
- Depth-3 monorepo scanning (current depth-1 + depth-2 covers all evidence).
- Status-bar copy review — the existing "PinFlow: not configured" text in
  [extension.ts:523](../../packages/pinflow-vscode/src/extension.ts#L523)
  works correctly; no user complaint, no change.

## Goal

A monorepo with N detected apps, all using a recognized framework, completes
PinFlow setup in **two clicks** (Agent → Done). A single-app project completes
in **one click + auto-skipped framework**. A reconfigure runs through the same
flow without manual file deletion.

## Design

### 1. Framework step auto-skips when detected

`pickFramework()` becomes responsible for the auto-skip decision:

- If `detectedFromApp.framework` is set → **return that framework
  synchronously, show no QuickPick**, emit a transient toast through an
  injected `showInformationMessage` dep:
  `Framework erkannt: ${label}` (German, consistent).
- If not set → show QuickPick with all four options, current placeholder copy.

This keeps the existing function signature (returns `FrameworkChoice |
undefined`) and concentrates the policy in one place. The wizard
orchestrator does not need to know whether the step was shown or skipped.

The auto-skip toast is **fire-and-forget**, awaited only enough to be queued
in the VS Code notification stack — it must not block the wizard from
proceeding to write config.

### 2. App-root step supports multi-select in monorepos

`pickAppRoot()` returns `readonly string[] | undefined` (was: `string |
undefined`). Three branches:

- **1 app**: returns `[apps[0].path]` (auto-pick, no UI). Same as before but
  wrapped in an array for type uniformity.
- **2+ apps**: `showQuickPick({ canPickMany: true, ... })` with **all items
  pre-checked**. User can deselect what they don't want. Returns the array of
  picked paths, or `undefined` if cancelled. Returning `[]` is treated as
  cancelled (user deselected everything).
- **0 apps**: InputBox as today; on success returns `[entered]`.

The QuickPick item description shows the detected framework where known so the
user has a basis for keep/deselect ("apps/web — vite", "apps/api — webpack",
"tools/scripts — unknown framework").

### 3. Honest dynamic step counter

Step labels are computed by the wizard orchestrator before any step runs,
based on which steps will actually be shown:

- **Always shown:** Agent step (no auto-skip path).
- **Conditionally shown:** App-root step (skipped only when a single app is
  auto-picked silently — but we still show the step in 2+ and 0 cases).
- **Conditionally shown:** Framework step (skipped when single framework
  detected for the picked app(s)).

The orchestrator builds a step plan upfront:

```ts
type StepPlan = {
  total: number;
  agent: number;       // always 1
  appRoot?: number;    // 2 if shown
  framework?: number;  // last if shown
};
```

Each step receives its label as a string (`"Schritt 1/2"`, `"Schritt 2/2"`,
or just `""` when total is 1) instead of building it itself. This removes the
hardcoded "1/3" / "2/3" / "3/3" titles and makes the step modules pure
renderers.

When multi-select is in play (2+ apps picked), the framework step is
suppressed if **every** picked app has a detected framework. If even one
picked app has no framework detection, the framework step is shown once and
its choice is applied to all apps without their own detection. Apps with
their own detection keep that.

(This single-shared-fallback rule is the simplest user-visible behavior; the
alternative — one framework step per ambiguous app — would balloon the click
count back up.)

### 4. Codex marketplace command dropped

`INSTALL_COMMANDS.codex` becomes:

```ts
codex: ['codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp']
```

The marketplace plugin discovery step is documented in the project README as
a manual one-shot for now, with a TODO link to the upstream Codex CLI bug.
The MCP registration is the load-bearing piece for Codex⇄PinFlow integration;
shipping a green Run button for it alone is a real improvement over today's
"Run → see two commands, one fails".

The hardcoded comment "known-broken upstream; it is still shipped..." is
removed along with the broken command.

### 5. UI strings to German consistently

All wizard-facing user strings move to German. Code identifiers, type names,
internal log messages, and JSDoc stay English.

Strings to translate (non-exhaustive, drives implementation):

- `agent-step.ts` placeholder: "Select the AI coding agent..." → "Wähle den
  Agent für dieses Projekt"
- `monorepo-step.ts` placeholder: "Multiple package.json files found..." →
  "Mehrere Apps gefunden — wähle eine oder mehrere"
- `monorepo-step.ts` InputBox prompt: "No package.json found..." → "Keine
  package.json gefunden. Pfad zum App-Root eingeben:"
- `framework-step.ts` placeholder (detected branch is dropped per #1; only
  not-detected branch remains): keep current German "Konnte kein Framework
  erkennen — wähle manuell"
- `framework-step.ts` `'✓ erkannt'` badge: removed entirely (no longer shown,
  step skipped)
- `post-install.ts`: all four toast strings German
  - `PinFlow ready in {folder}.` → `PinFlow ist eingerichtet in {folder}.`
  - `Install ${agentLabel} plugin?` → `${agentLabel}-Plugin installieren?`
  - `'Run' / 'Show command' / 'Skip'` → `'Ausführen' / 'Befehl anzeigen' /
    'Überspringen'`
  - `${agentLabel} install command copied to clipboard.` →
    `${agentLabel}-Installationsbefehl in Zwischenablage kopiert.`
- `wizard.ts` failure toast: `PinFlow setup failed for ${folderName}: ...` →
  `PinFlow-Setup fehlgeschlagen für ${folderName}: ...`
- `wizard.ts` "Open Terminal" recovery action: → `'Terminal öffnen'`

Tests covering exact strings update accordingly — the new strings become the
canonical assertion targets.

### 6. `appRoot` becomes relative; config writes per-app

`writeWizardConfig()` signature changes from `WriteConfigInput` (single
appRoot) to `WriteConfigBatchInput`:

```ts
export interface WriteConfigBatchInput {
  readonly cwd: string;          // workspace root, used for .gitignore only
  readonly agent: AgentChoice;
  readonly perApp: readonly {
    readonly appPath: string;          // absolute
    readonly framework: FrameworkChoice;
  }[];
}
```

Behavior:

- For each `perApp` entry, write `${appPath}/pinflow.config.json` with
  `appRoot: '.'`.
- `.gitignore` is updated **once at `cwd`** (the workspace root), not per
  app — `.pinflow/` is the artifact directory, and a single root-level entry
  is the canonical pnpm/npm convention.
- **No existence check.** `writeWizardConfig` always overwrites. The
  reconfigure consent (see §7) is the wizard's responsibility, not the
  writer's. This keeps the writer dumb and the policy in one place.

The single-app and 0-app cases collapse to `perApp.length === 1`. The wizard
treats them identically.

### 7. Reconfigure flow

The reconfigure prompt is a **guard between app-root selection and config
write**, not a step. It only fires when the user has actually picked at
least one app whose config already exists.

Order of operations:

1. Agent step.
2. App-root step (multi-select / auto-pick / InputBox).
3. **Reconfigure check** — for the picked app paths, run parallel `access()`
   on each `${appPath}/pinflow.config.json`. Collect the subset that already
   exist.
4. If the existing-config subset is non-empty, show:

   ```
   PinFlow ist bereits konfiguriert in: apps/web, apps/api.
   Bestehende Konfiguration überschreiben?

     [Überschreiben]  [Abbrechen]
   ```

   - "Überschreiben" → continue.
   - "Abbrechen" or dismiss → return early, no side effects.

5. Framework step (if needed).
6. Write configs.

Why this position and not earlier:

- A user adding a third app to a 2-app-already-configured monorepo should
  **not** see "everything will be overwritten" before they've picked which
  apps to act on. The prompt would be alarming and inaccurate.
- Detecting existing configs only for **picked** apps is the right scope:
  unselected apps are guaranteed untouched.

Implementation: a new `detectExistingConfigs(appPaths)` helper returns the
subset that exist. Lives next to `config-writer.ts` (sibling fs concern).
`writeWizardConfig` itself has no existence logic.

Step counter is unaffected — the reconfigure dialog is a guard, not a
counted step.

### Step plan summary

For a fresh single-app Vite project:
1. Agent step (1/1)
2. *App-root auto-pick (silent)*
3. *Framework auto-skip (silent toast: "Framework erkannt: Vite")*
4. Write config + post-install toast.

For a fresh monorepo with 3 detected apps, all with frameworks:
1. *(No reconfigure prompt — no existing configs.)*
2. Agent step (1/2)
3. App-root multi-select (2/2)
4. *Framework auto-skip per app (silent toasts).*
5. Write 3 configs + post-install toast.

For a reconfigure on a single-app project:
1. Agent step (1/1)
2. *App-root auto-pick (silent).*
3. Reconfigure confirmation ("Überschreiben?")
4. *Framework auto-skip (silent toast).*
5. Write config (overwrite) + post-install toast.

For a monorepo with one ambiguous app and one Vite app, fresh:
1. Agent step (1/3)
2. App-root multi-select (2/3) — both pre-checked
3. Framework step (3/3) — applies to ambiguous one only; Vite one keeps
   detected. Title clarifies: "Framework für 'tools/scripts' wählen
   (apps/web ist erkannt: Vite)".
4. Write 2 configs + post-install toast.

## Components to modify

| File | Change |
|---|---|
| `packages/pinflow-vscode/src/core/onboarding/wizard/framework-step.ts` | Auto-skip path, toast injection, drop `'✓ erkannt'` badge mode, accept step label |
| `packages/pinflow-vscode/src/core/onboarding/wizard/monorepo-step.ts` | Multi-select with `canPickMany: true`, return `string[]`, accept step label |
| `packages/pinflow-vscode/src/core/onboarding/wizard/agent-step.ts` | Accept step label, German placeholder |
| `packages/pinflow-vscode/src/core/onboarding/wizard/wizard.ts` | Build step plan, run reconfigure prompt, loop config writes, German error messages |
| `packages/pinflow-vscode/src/core/onboarding/wizard/config-writer.ts` | New batch signature, relative `appRoot`, no existence guard, gitignore once |
| `packages/pinflow-vscode/src/core/onboarding/wizard/existing-configs.ts` | **NEW** — `detectExistingConfigs(appPaths)` helper, parallel `access()` |
| `packages/pinflow-vscode/src/core/onboarding/wizard/snippets.ts` | `appRoot` always `.` (or `relative` from config dir to app root, but spec says `.`) |
| `packages/pinflow-vscode/src/core/onboarding/wizard/post-install.ts` | German strings, drop broken codex command |
| `packages/pinflow-vscode/src/core/onboarding/wizard/index.ts` | Re-export new types if needed |
| Test specs for all of the above | Update to new strings, new shapes, new flows |

One new module: `existing-configs.ts` (parallel `access()` helper). The
reconfigure prompt orchestration lives inline in `wizard.ts`; the prompt
itself is a single `showInformationMessage` call.

## Testing

All new branches get unit tests with constructor DI per project conventions:

- `framework-step.spec.ts`: detected → returns synchronously, fires toast, no
  QuickPick call. Not detected → QuickPick shown.
- `monorepo-step.spec.ts`: 1 app → `[path]`, 2+ → multi-select call shape (all
  pre-checked), 0 → InputBox path. Empty selection → `undefined`.
- `wizard.spec.ts`: step plan computation for each scenario above; reconfigure
  prompt only shows when configs exist; cancellation returns early at each
  step; multi-app loop writes N configs.
- `config-writer.spec.ts`: batch write writes N files at correct paths with
  `appRoot: '.'`, gitignore appended once, idempotent.
- `post-install.spec.ts`: codex install command list contains exactly one
  command (`codex mcp add ...`), German strings.
- `existing-configs.spec.ts`: parallel `access()` correctly returns the
  subset of paths whose `pinflow.config.json` exists; empty inputs return
  empty array; unreadable paths are treated as not-existing.

No integration test gate — same as C.1.5–C.1.8, manual VSIX smoke is the
final check.

## Risks

- **Framework auto-skip silences user agency** — if our detection is wrong
  (e.g. Vite-the-bundler shipped as a transitive dep but the user actually
  uses webpack via custom config), we silently mis-configure. Mitigation: the
  detection only fires on top-level deps in `dependencies`/`devDependencies`,
  not transitive. If this proves brittle in the wild, we can add a
  `pinflow.onboarding.confirmFramework` opt-in setting later.
- **Multi-app config drift** — if the user reconfigures one app in a
  monorepo later (without going through the wizard), the per-app configs can
  drift. This is fine: per-app configs are the canonical source of truth,
  drift means the user customized one. The wizard never touches an
  unselected app's config.
- **Reconfigure check across all detected apps** — depth-2 scan in a large
  monorepo could be slow on cold I/O. In practice these are tens of dirs,
  parallel `access()` calls finish in single-digit ms. Not worth optimizing
  preemptively.

## Acceptance

- Single-app fresh: 1 click (Agent), config written, post-install toast.
- Single-app reconfigure: 2 clicks (Überschreiben + Agent), config rewritten.
- Monorepo 3 apps fresh, all frameworks detected: 2 clicks (Agent + multi-
  select OK), 3 configs written.
- Monorepo 2 apps mixed: 3 clicks (Agent + multi-select + framework for the
  ambiguous one), 2 configs written.
- Codex install Run: exactly one command runs, succeeds.
- All wizard strings are German.
- VSIX builds, all unit tests green, manual smoke passes.
