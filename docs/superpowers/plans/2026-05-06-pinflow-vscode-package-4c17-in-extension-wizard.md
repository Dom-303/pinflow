# PinFlow VS Code Extension — Package 4 Phase C.1.7: In-Extension Init Wizard

> **Compact spec + plan in one document.** Replaces the spawn-based auto-mode with a native VS Code QuickPick wizard that writes `pinflow.config.json` + `.gitignore` directly — bypassing the brittle `pinflow init` CLI entirely.

## Goal

Default onboarding (`pinflow.onboarding.mode === 'auto'`) becomes a **VS Code-native wizard**: 3 QuickPicks (agent → app-root → framework), then file writes, then folder flips to configured. No terminal, no spawned subprocess, no CLI dependency. The wizard CLI's known bugs (Codex marketplace command mismatch, Claude Code marketplace.json schema error, agent-ID mismatch) are bypassed entirely.

Power-user terminal mode unchanged. Setting `pinflow.onboarding.mode` keeps the same `'auto' | 'terminal'` enum — `auto`'s **internals** change.

## Why Now

C.1.6 smoke 2026-05-06 surfaced three independent wizard-CLI failure modes in two days. Each new CLI bug breaks our extension's default path. The CLI dependency is structurally wrong for a VS Code extension that targets non-developer users. The pure-logic for config generation is small (~250 LOC) and reusable.

## Architecture Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Setting shape | **Keep `'auto' \| 'terminal'`**, swap `auto` internals to native wizard | No breaking change for existing settings. `auto` semantically = "automatic onboarding without terminal" — both old (spawn) and new (native wizard) fit. |
| Code reuse | **Re-implement minimal pure logic in pinflow-vscode**, do NOT import from `@pinflow/relay/cli/init/*` | Cleaner module boundary; avoids cross-package coupling for what is in fact ~150 LOC of detection + snippet generation. Any drift between relay's wizard and ours is fine — they target different surfaces. |
| Agent install | **SKIP. Wizard does NOT run codex/claude marketplace commands.** | Those commands are the source of all our failures. Users add agent plugins manually after init (one-time setup). Add a small post-init toast: "Agent plugin install required — see [docs]". |
| QuickPick library | **VS Code built-in (`window.showQuickPick`, `window.showInputBox`)** | Zero new deps. Sufficient for our 3 prompts. |
| Cancellation | **Standard VS Code cancellation** (return `undefined` from QuickPick aborts wizard) | User-pressed Esc → wizard exits silently. No partial files written. |
| Cancellation — partial state | **All-or-nothing**: only write files after all 3 prompts complete and user confirms | Avoids leaving folder in half-configured state. |
| Detection failures | **Graceful degradation**: if framework can't be detected, show all options | Never block. |
| Tests | **Constructor DI for VS Code APIs**, like cli-detection.ts and auto-init.ts already use | Mirror existing pattern. Avoid `vi.mock` on Node built-ins. |
| File ordering | **Write `pinflow.config.json` first, `.gitignore` second** | Config is the marker — once written, refresh detects configured. Gitignore is non-load-bearing. If gitignore fails, log + continue. |
| Polish | **Delete the old auto-init spawn logic** but keep `cli-detection.ts` (still useful for terminal mode binary check) | Reduces dead code. |
| Migration | **No setting migration needed.** `'auto'` users get the new behavior automatically. | No compat shim. |

## File-level Changes

```
packages/pinflow-vscode/
├── src/core/onboarding/
│   ├── auto-init.ts                     # DELETE (replaced by wizard)
│   ├── auto-init.spec.ts                # DELETE
│   ├── cli-detection.ts                 # KEEP
│   ├── cli-detection.spec.ts            # KEEP
│   ├── wizard/                          # NEW directory
│   │   ├── index.ts                     # NEW barrel
│   │   ├── wizard.ts                    # NEW orchestrator
│   │   ├── wizard.spec.ts               # NEW
│   │   ├── agent-step.ts                # NEW QuickPick
│   │   ├── agent-step.spec.ts           # NEW
│   │   ├── framework-step.ts            # NEW QuickPick + detect
│   │   ├── framework-step.spec.ts       # NEW
│   │   ├── monorepo-step.ts             # NEW QuickPick / InputBox
│   │   ├── monorepo-step.spec.ts        # NEW
│   │   ├── config-writer.ts             # NEW writes pinflow.config.json + gitignore
│   │   ├── config-writer.spec.ts        # NEW
│   │   ├── snippets.ts                  # NEW pure config generator (port from relay)
│   │   ├── snippets.spec.ts             # NEW
│   │   ├── app-detection.ts             # NEW pure framework/monorepo detect (port from relay)
│   │   └── app-detection.spec.ts        # NEW
│   └── index.ts                         # MOD — add wizard export
├── src/extension.ts                     # MOD — auto-mode dispatch swaps runInitInAuto → runWizard
└── docs/superpowers/plans/
    └── 2026-05-06-pinflow-vscode-package-4c17-in-extension-wizard.md  # this doc
```

## Wizard Flow (UX)

1. User clicks Setup PinFlow on unconfigured folder
2. `auto` mode → calls `runWizard(cwd)`
3. **Step 1 — Agent QuickPick**: title "Choose coding agent for $folder", items: Codex / Claude Code / GitHub Copilot / Other. User picks one. Esc cancels.
4. **Step 2 — App-Root**: detect `package.json` candidates under cwd (depth 2). If 1 → auto-pick. If 2+ → QuickPick. If 0 → InputBox with cwd as default.
5. **Step 3 — Framework**: detect via `package.json` deps (vite/webpack/next/nuxt). If 1 → confirm via QuickPick "yes / change". If 0 → QuickPick of all options.
6. **Write files**: `pinflow.config.json` (with chosen agent + framework + appRoot) + append `.pinflow/` to `.gitignore`.
7. **Refresh**: trigger `refreshAll()` → folder flips to configured.
8. **Toast**: "PinFlow ready in $folder. Install your agent plugin: [Open Docs]". One action: opens docs link with copy-pasteable codex/claude install commands.

Total UX: 3 clicks (often 2 because step 2/3 auto-resolve), ~5 seconds, never leaves the editor.

## Tests (per file)

- `app-detection.spec.ts`: 4 tests (single app, monorepo with packages/, monorepo with apps/, no package.json)
- `snippets.spec.ts`: 4 tests (vite config, webpack config, next config, nuxt config)
- `agent-step.spec.ts`: 3 tests (user picks codex, user picks claude, user cancels)
- `monorepo-step.spec.ts`: 4 tests (single app auto-pick, multi-app QuickPick, no app InputBox, user cancels)
- `framework-step.spec.ts`: 3 tests (detected→confirm, undetected→pick, user cancels)
- `config-writer.spec.ts`: 4 tests (writes config, appends to gitignore, gitignore doesn't exist (creates), gitignore already has .pinflow/)
- `wizard.spec.ts`: 3 tests (full happy path, agent cancel exits, framework cancel exits)

**Total new tests: ~25.** Existing 187 → ~212 expected. (Some auto-init.spec.ts tests will be deleted, net +18 or so.)

## Tasks (subagent-driven)

### Task 0: Branch + baseline
```bash
git checkout main && git pull
git checkout -b feature/c17-in-extension-wizard
git add docs/superpowers/plans/2026-05-06-pinflow-vscode-package-4c17-in-extension-wizard.md
git commit -m "docs(vscode): add Phase C.1.7 in-extension wizard plan"
corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode,pinflow-relay
```
Baseline: pinflow-vscode 187, pinflow-relay 421.

### Task 1: Pure logic (snippets + app-detection)
**Subagent (Sonnet).** Reads `packages/pinflow-relay/src/cli/init/snippets.ts` and `app-detection.ts`. Re-implements only the parts our wizard needs in `packages/pinflow-vscode/src/core/onboarding/wizard/snippets.ts` + `app-detection.ts`. TDD with 4+4 tests. No vscode imports — pure file/path operations.

### Task 2: config-writer
**Subagent (Sonnet).** New module that takes `{cwd, agent, framework, appRoot}` and writes `pinflow.config.json` + appends `.pinflow/` to `.gitignore` (handles missing-gitignore + already-has-entry cases). 4 tests with real `mkdtemp` like multi-folder-state.spec.ts.

### Task 3: Wizard step modules
**Subagent (Sonnet).** Implements agent-step.ts, monorepo-step.ts, framework-step.ts. Each uses VS Code QuickPick / InputBox via DI. 10 tests across the three files. Mirror `cli-detection.ts` DI pattern.

### Task 4: Wizard orchestrator
**Subagent (Sonnet).** wizard.ts ties steps together: agent → app-root → framework → config-writer.write → refreshAll → success toast. Cancellation = silent return. 3 tests. Includes failure-toast for write errors.

### Task 5: Extension wiring + delete old auto-init
**Subagent (Sonnet).** In extension.ts, swap `runInitInAuto` import + call to `runWizard`. Delete `auto-init.ts`, `auto-init.spec.ts`. Update `core/onboarding/index.ts` barrel. Verify all tests still green, no dead imports.

### Task 6: Quality gate + VSIX + smoke
**Foreground (me).** Run full 8-check quality gate. Build VSIX. Hand off to user for manual smoke (3-5 click flow on aluna's twin folder).

## Manual Smoke (final gate)

1. Build VSIX, reinstall in user's other VS Code (Uninstall → Reload Window → Install from VSIX)
2. Open workspace with unconfigured folder
3. Click Setup PinFlow
4. Pick agent (e.g. Codex). No terminal opens.
5. Step 2/3 auto-resolve OR show one more QuickPick each
6. Within 5s: success toast. Folder accordion flips to Relay missing.
7. Verify `pinflow.config.json` exists in folder. Verify `.pinflow/` in `.gitignore`.
8. Settings flip to `terminal` → click Setup → terminal opens (regression check)
9. Settings back to `auto` → reload → setup flow as in step 3-7

## Out of Scope (parked)

- **Agent plugin install automation** (codex/claude marketplace commands) — those CLI commands are buggy upstream; wizard skips them, success toast points to docs
- **Existing wizard CLI re-publish to fix marketplace.json schema** — separate work, relay package
- **`/N` toast investigation** — defer
- **Executable-bit build step for pinflow.js** — defer
- **Phase B / C.2 / C.3 / D / E** — after C.1.7 ships

## Post-merge follow-ups

- Update roadmap doc to mark C.1.7 done
- Memory entry: in-Extension wizard now default
