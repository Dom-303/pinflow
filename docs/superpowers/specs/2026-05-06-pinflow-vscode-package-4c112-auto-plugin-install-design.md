# PinFlow VSCode Phase C.1.12 — Auto-Install Framework Plugin

**Status:** approved (2026-05-06)
**Predecessor:** [C.1.11 detection-driven onboarding](2026-05-06-pinflow-vscode-package-4c111-detection-driven-onboarding-design.md)

## Why this exists

Smoke on eventbear-web revealed a **fundamental gap** in the onboarding: the
wizard wrote `pinflow.config.json` and installed the agent's MCP plugin, but
never installed the framework's PinFlow package (`@pinflow/react`) or wired
its bundler plugin into the app's `vite.config.ts`. Without that plugin,
the overlay never gets injected and PinFlow doesn't appear in the browser.
The full setup chain that the legacy `pinflow init` CLI runs was only
half-replicated when we replaced the CLI with the in-extension wizard in
C.1.7.

The user explicitly wants: one click on "Setup PinFlow", everything
installs and wires up automatically and reliably, professional UX, no
manual file edits.

## Goal

After "Setup PinFlow" completes for a Vite-based React or Vue app, the user
can immediately run their dev server and **the PinFlow overlay appears in
the browser**. Zero manual file edits.

## Scope

**In scope (auto-patched):**

- React + Vite (`@pinflow/react/vite`)
- Vue + Vite (`@pinflow/vue/vite`)

**Out of scope for this phase (snippet fallback only):**

- React + Webpack
- Vue + Webpack
- Next.js
- Nuxt

For these, the wizard installs the package, opens the relevant config
file in VS Code, and shows a toast with the snippet to paste. Reasoning:
Webpack configs vary hugely; Next.js needs a `withPinFlow()` wrapper that
collides with existing wrappers (`withSentry`, `withBundleAnalyzer`, etc.);
Nuxt needs `modules: []` array manipulation. Each is a separate auto-patch
project worth its own iteration.

## Non-goals

- AST-based patching (regex with idempotent guards is sufficient for the
  Vite case; promote to AST if regex proves fragile in the wild).
- Patching custom function-based vite configs (e.g.
  `export default ({ mode }) => defineConfig({...})`). For these, fall back
  to the snippet path with a clear message.
- Auto-retry on network failure during install (show a clear error toast
  with retry hint instead — auto-retry hides real problems).

## Design

### 1. Extended framework detection

Today `app-detection.ts` returns `framework: 'vite' | 'webpack' | 'next' |
'nuxt'`. To pick the right `@pinflow/*` package the wizard needs to know
whether a Vite/Webpack project uses React or Vue.

`DetectedApp.framework` is replaced with a new identifier:

```ts
type FrameworkId =
  | 'react-vite'
  | 'vue-vite'
  | 'react-webpack'
  | 'vue-webpack'
  | 'next'
  | 'nuxt'
  | 'other-vite'
  | 'other-webpack';
```

Detection rules (checked in order):

- `next` dep present → `next`
- `nuxt` dep present → `nuxt`
- `vite` + `react` → `react-vite`
- `vite` + `vue` → `vue-vite`
- `vite` (no react/vue) → `other-vite`
- `webpack` + `react` → `react-webpack`
- `webpack` + `vue` → `vue-webpack`
- `webpack` (no react/vue) → `other-webpack`
- otherwise: not detected (filtered out).

The existing user-facing label "vite" is replaced by labels from a
`FRAMEWORKS` table (e.g. "React + Vite", "Vue + Vite") for the multi-select
description.

### 2. Package-manager detection

New module `package-manager.ts`. Mirrors the relay CLI's lockfile-based
detection:

- `pnpm-lock.yaml` → `pnpm`
- `yarn.lock` → `yarn`
- `bun.lock` / `bun.lockb` → `bun`
- otherwise (or `package-lock.json`) → `npm`

Lockfiles live at the **workspace root** in monorepos, not at the app dir.
Detection therefore walks up from the app dir to the workspace root (the
wizard's `cwd`).

Returns `{ id, installCmd }` where `installCmd` is the verbatim install
prefix (e.g. `'pnpm add -D'`).

### 3. Package installer

New module `package-installer.ts`.

- Spawn `${pmConfig.installCmd} ${packageName}` with `cwd = appPath`.
- Stream stdout/stderr to a dedicated VS Code Output Channel
  ("PinFlow Setup") so the user can inspect what happened.
- Wrap in `vscode.window.withProgress({ location: Notification })` so a
  spinner toast shows: "Installing @pinflow/react in apps/web..."
- On non-zero exit code: surface the last 5 lines of stderr in an error
  toast and abort the rest of the per-app setup. The user sees exactly
  what npm/pnpm complained about.
- Idempotency: if the package is already in `dependencies` or
  `devDependencies` of the app's `package.json`, skip install (log to
  output channel, no spawn).

### 4. Vite config patcher

New module `vite-config-patcher.ts`. **The hardest piece — needs care.**

**Inputs:** `appPath` (where `vite.config.{ts,js,mjs}` lives) +
`framework: 'react-vite' | 'vue-vite'` (drives import + factory name).

**Steps:**

1. Locate the config file. Try in order: `vite.config.ts`, `vite.config.js`,
   `vite.config.mjs`. If none exist → fallback to snippet path (see §6).

2. Read the file. **Idempotency check:** if it already contains
   `@pinflow/react/vite` or `@pinflow/vue/vite` import → skip everything,
   log "PinFlow plugin already wired up". This makes re-runs safe.

3. **Backup:** copy the file to `${configFile}.pinflow-backup` before any
   modification. Always overwrites a previous backup (most recent
   pre-patch state wins).

4. **Import insertion:** find the last top-level `^import .+;?$` line.
   Insert the new import on the line **after** it:
   ```ts
   import { pinflow } from '@pinflow/react/vite';
   ```
   (or `@pinflow/vue/vite` for vue-vite). If no imports exist (rare), the
   pattern miss falls through to snippet path.

5. **Plugin insertion:** find the `plugins:` key in a `defineConfig({...})`
   call. Concretely match the regex `/plugins\s*:\s*\[/`.

   - If the array contains `react()` (for react-vite) or `vue()` (for
     vue-vite), insert `pinflow(),\n    ` **immediately after** that
     factory call, preserving the surrounding indentation (read the
     leading whitespace of the line containing the matched factory).
   - If no react/vue factory call is found in the array, insert
     `pinflow(),\n    ` **immediately after** the opening `[` of the
     plugins array.

6. **Validation:** after writing, re-read the file and verify:
   - The new import line is present.
   - The new `pinflow()` call is present.
   - No plugin factory was deleted (count of named factories `()` doesn't
     decrease compared to pre-patch).

   If any check fails: restore from backup, log error, fall back to snippet
   path.

7. **No comments removed, no formatting touched** outside the surgical
   insertions. The patcher writes the original buffer with two splices
   only — preserves all whitespace, comments, and unrelated content.

**Pattern miss / unusual config shapes** (e.g.
`export default ({ mode }) => defineConfig({...})`, multiple defineConfig
calls, etc.) → restore from backup if any was made, fall back to snippet.

### 5. Framework plugin orchestrator

New module `framework-plugin.ts`.

```ts
export async function installFrameworkPlugin(
  appPath: string,
  framework: FrameworkId,
  workspaceRoot: string,
  deps: FrameworkPluginDeps,
): Promise<{ ok: true } | { ok: false; reason: string }>;
```

For Vite frameworks (`react-vite` / `vue-vite`):
1. Detect package manager (workspace root).
2. Install package (with idempotency).
3. Patch vite config (with backup + idempotency + fallback).

For non-Vite frameworks (`react-webpack` / `vue-webpack` / `next` / `nuxt`
/ `other-*`):
1. Detect package manager.
2. Install package.
3. **Snippet fallback:** open the config file in VS Code, show toast with
   the snippet text + "Copy snippet" button (writes to clipboard).

Returns success/failure result for the wizard to aggregate.

### 6. Snippet fallback

Reused for non-Vite frameworks and for any pattern miss in the Vite patcher.
Source-of-truth snippets are ported from `pinflow-relay/src/cli/init/snippets.ts`
(which already has the right snippets for every framework × runner-provider
combination).

VS Code interaction:
- `vscode.window.showTextDocument` to open the config file (creates blank
  if missing — but we only fall through here when the file exists).
- Toast: "Bitte folgendes Snippet in `${configFile}` einfügen:"
  with `[Snippet kopieren]` `[Snippet anzeigen]` `[Verstanden]` buttons.
- "Snippet kopieren" → `vscode.env.clipboard.writeText(snippet)`.
- "Snippet anzeigen" → opens an untitled document with the snippet.

### 7. Wizard integration

The orchestrator (`wizard.ts`) gains a new phase between `writeWizardConfig`
and `runPostInstall`:

```
Phase 7 — write configs                        (existing)
Phase 7.5 — install + patch per-app plugin     (NEW)
Phase 8 — refresh + post-install agent plugin  (existing)
```

Phase 7.5 loops over `perApp` and calls `installFrameworkPlugin()`. Each
invocation runs sequentially (parallel installs would compete for npm
locks). VS Code Progress shows `Plugin installieren (1/N): apps/web…`.

If any per-app setup fails, the wizard:
- Continues with remaining apps (so 2 of 3 succeed cleanly).
- Aggregates errors.
- At end of Phase 7.5, shows a single error toast with the failed apps and
  their reasons + a button to open the Output Channel.

The wizard still proceeds to Phase 8 (agent MCP install) even if Phase 7.5
had failures — the failure mode is recoverable (manual snippet paste), and
the user shouldn't lose the agent setup.

### 8. Output channel

A single shared VS Code Output Channel `"PinFlow Setup"` is created on
extension activation and reused for all wizard runs. Each setup run is
prefixed:
```
═════════════════════════════════════════════════════════
PinFlow Setup · 2026-05-06 19:45:21 · /home/.../eventbear-web
═════════════════════════════════════════════════════════
[apps/web] Detecting package manager... pnpm
[apps/web] Installing @pinflow/react...
  added 1 package in 3s
[apps/web] Patching vite.config.ts...
  ✓ Import added at line 7
  ✓ pinflow() inserted at line 24 after react()
  ✓ Backup at vite.config.ts.pinflow-backup
[apps/web] Done.
```

The channel is shown automatically on first install, hidden if everything
succeeds, and explicitly re-shown via toast button on failure.

## Components

| Path | Change |
|---|---|
| `app-detection.ts` | Detection produces `FrameworkId` (react-vite / vue-vite / etc.); root + sub-app detection unchanged otherwise |
| `app-detection.spec.ts` | Updated assertions for the new framework labels |
| `package-manager.ts` | **NEW** — lockfile-based PM detection from workspace root |
| `package-manager.spec.ts` | **NEW** |
| `package-installer.ts` | **NEW** — spawn-based install with output channel + progress + idempotency |
| `package-installer.spec.ts` | **NEW** |
| `vite-config-patcher.ts` | **NEW** — regex patcher with backup + idempotency + validation |
| `vite-config-patcher.spec.ts` | **NEW** — multi-scenario coverage |
| `framework-plugin.ts` | **NEW** — orchestrator (Vite auto-patch / non-Vite snippet fallback) |
| `framework-plugin.spec.ts` | **NEW** |
| `framework-snippets.ts` | **NEW** — ported from relay CLI's `snippets.ts` |
| `monorepo-step.ts` | Updated description labels (FRAMEWORKS table) |
| `wizard.ts` | New Phase 7.5 with progress + per-app loop + error aggregation |
| `wizard.spec.ts` | Updated for new flow |
| `extension.ts` | Output channel registered on activation |

## Acceptance criteria

- **eventbear-web smoke**: open repo, click "Setup PinFlow", agent =
  Codex. Without any further interaction:
  1. `apps/web/pinflow.config.json` is written.
  2. `@pinflow/react` is installed in `apps/web/package.json` as devDep.
  3. `apps/web/vite.config.ts` has `import { pinflow } from
     '@pinflow/react/vite'` and `pinflow()` in `plugins: [react(),
     pinflow(), …]`.
  4. `apps/web/vite.config.ts.pinflow-backup` exists.
  5. Codex MCP is registered globally.
  6. Running the dev server shows the PinFlow overlay tab on the right
     edge of the browser.
- **Idempotency**: re-running setup on the same project doesn't duplicate
  the import, doesn't re-install, doesn't double-patch.
- **Failure path**: if patching fails, vite.config.ts is restored from
  backup and the snippet fallback fires. No corrupted state.
- **Output channel**: clear log of every step, visible on demand.

## Risks

- **Regex fragility for unusual configs**: mitigated by backup + validation
  + snippet fallback. Will revisit AST if real-world failure rate is high.
- **Long install time** (npm install on slow networks): mitigated by
  progress notification + output channel showing real npm output.
- **Multi-app monorepo with shared `node_modules`**: pnpm hoists; install
  once at workspace root might be enough, but spec mandates per-app
  install so each app's package.json declares the dep explicitly. This is
  the conservative correct behavior.
- **`vite.config.js` vs `.ts` vs `.mjs`**: detector tries each; patcher
  handles all three identically (no JSX-specific logic).

## Out of scope (deferred)

- React/Vue Webpack auto-patch
- Next.js auto-wrap
- Nuxt module append
- AST patching (Phase 2 if regex proves insufficient)
- npm-registry override (Verdaccio for local dev — not needed since
  `@pinflow/react@0.6.0` is on public npm)
