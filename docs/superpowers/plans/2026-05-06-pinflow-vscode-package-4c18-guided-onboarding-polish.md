# PinFlow VS Code Extension — Package 4 Phase C.1.8: Guided Onboarding Polish

> **Compact spec + plan, single document.** Polishes C.1.7 wizard with step indicators, detection-badges, and an inline post-init agent-plugin install flow that replaces the GitHub-redirect dead-end.

## Goal

User flows through the C.1.7 wizard with full **at-a-glance situational awareness**: which step they're on (Step 1/3 etc.), what was auto-detected (✓ erkannt / ✓ installiert), and clear next-step actions after init (Run / Show command / Skip — never "you're on your own, here's a GitHub link").

## Why Now

C.1.7 smoke 2026-05-06: wizard worked end-to-end, but user's verdict was *"da fehlt noch in der Essenz grundsätzlich was, weil wenn man es auch nicht versteht, warum man jetzt auf GitHub weitergeleitet wird"*. The mechanics work; the **guidance** is thin. Polish closes the perceived gap before Phase B (Run-Visualisierung) builds on top.

## Architectural Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Step indicator | **QuickPick `title` field** with pattern `'PinFlow Setup · Schritt $N/3 — $stepLabel'` | Native VS Code field, free orientation, no extra UI |
| Detection badges | **`description` and ordering** within each QuickPick item: detected/installed first with `'✓ erkannt'` / `'✓ installiert'` | Reuses existing QuickPick item shape; immediate visual signal |
| Agent CLI detection | **New module `wizard/agent-detection.ts`** mirroring `cli-detection.ts` DI pattern (`which codex`, `which claude`, `which copilot`) | Pure, testable, reusable for post-install flow |
| Post-install action | **3-button toast: `[Run] [Show command] [Skip]`** instead of GitHub link | User sees + chooses; transparent failure if codex/claude commands break upstream |
| `Run` semantics | **Open visible terminal**, run install commands sequentially | Honest — user sees what runs, sees failures directly. No cryptic background toasts (lessons from C.1.6) |
| `Show command` semantics | **Copy to clipboard via `vscode.env.clipboard.writeText`** + small confirmation toast `'$command copied to clipboard.'` | Most user-friendly: zero copy-paste friction. User pastes into their own terminal whenever ready. |
| `Skip` / no-action | **No-op silent return** | Folder is already configured; plugin install is genuinely optional |
| Agents without install commands (`other`) | **Skip post-install entirely**, show plain success toast `'PinFlow ready in $folder.'` | User explicitly chose "manual setup" |
| Install commands per agent | **Hardcoded mapping in `wizard/post-install.ts`** mirrored from relay's `cli/init/types.ts` AGENTS constant | Small (~6 commands across 2-3 agents), drift acceptable, no cross-package coupling |
| Codex marketplace command known broken | **Document in code comment**, still ship the `Run` button | User sees the failure in their terminal honestly, can fix locally; not extension's responsibility to gate |
| When framework detection fails | **QuickPick description hint**: `'Konnte kein Framework erkennen — wähle manuell'` on the QuickPick `placeHolder` | Single line, no extra prompts |
| Test approach | **Mirror C.1.7 DI pattern** (constructor-injected vscode + node:child_process surfaces; no `vi.mock` on Node built-ins) | Continuity, repo conventions |

## File-level Changes

```
packages/pinflow-vscode/src/core/onboarding/wizard/
├── agent-detection.ts                # NEW — which codex/claude/copilot binaries are on PATH
├── agent-detection.spec.ts           # NEW — 4 tests
├── post-install.ts                   # NEW — toast + Run/Show/Skip flow + install-command map
├── post-install.spec.ts              # NEW — 5 tests
├── agent-step.ts                     # MOD — step title + installed-badge
├── agent-step.spec.ts                # MOD — 2 new test cases
├── framework-step.ts                 # MOD — step title + detected-badge + placeholder fallback hint
├── framework-step.spec.ts            # MOD — 2 new test cases
├── monorepo-step.ts                  # MOD — step title only
├── monorepo-step.spec.ts             # MOD — 1 new test case
├── wizard.ts                         # MOD — call agent-detection + thread installed-agents to agent-step + replace success toast with runPostInstall call
├── wizard.spec.ts                    # MOD — 2 new test cases (post-install called, skipped for 'other' agent)
└── index.ts                          # NO CHANGE
```

## Wizard Flow (UX after polish)

1. User clicks Setup PinFlow on unconfigured folder
2. Background: `detectApps(cwd)` + `detectInstalledAgents()` (both pure, fast)
3. **QuickPick 1** — title `'PinFlow Setup · Schritt 1/3 — Agent wählen'`
   - Items ordered: installed agents first (with `✓ installiert` description), then uninstalled
   - User picks Codex (or whatever)
4. **QuickPick 2** — title `'PinFlow Setup · Schritt 2/3 — App-Root wählen'`
   - 1 app → auto-pick (still skip UI, log in step)
   - 2+ apps → QuickPick with all paths
   - 0 apps → InputBox with cwd default
5. **QuickPick 3** — title `'PinFlow Setup · Schritt 3/3 — Framework wählen'`
   - Detected framework first with `✓ erkannt` description
   - Other 3 follow without badge
   - placeholder hint when nothing detected
6. **Write files** (config-writer)
7. **Refresh** (refreshAll → folder flips configured)
8. **Post-install** (NEW — replaces today's GitHub-link toast)
   - If agent ∈ {codex, claude-code}:
     - Toast: `'PinFlow ready in $folder. Install $agentLabel plugin?'` with `[Run] [Show command] [Skip]`
     - Run → opens VS Code integrated terminal at cwd with install command(s) sent, user sees output (terminal panel = inside VS Code, NOT external)
     - Show command → copies the install command(s) to clipboard, shows brief confirmation toast
     - Skip / dismiss → no further action
   - If agent ∈ {copilot, other}: plain `'PinFlow ready in $folder.'` toast (no install commands available/applicable)

## Tests (per file)

- `agent-detection.spec.ts` — 4: codex installed; claude installed; copilot installed; nothing installed
- `post-install.spec.ts` — 5: 'Run' triggers terminal-mode helper with correct command; 'Show command' calls `clipboard.writeText` with the multi-line command and shows confirmation toast; 'Skip' returns silent; agent='other' skips toast and shows plain success; agent='copilot' shows plain success (no install commands)
- `agent-step.spec.ts` — +2: installed agents listed first with badge; multiple installed sorted but otherwise input-order
- `framework-step.spec.ts` — +2: detected framework has `✓ erkannt` badge; undetected shows placeholder hint
- `monorepo-step.spec.ts` — +1: step title contains `Schritt 2/3`
- `wizard.spec.ts` — +2: runs post-install for codex agent; skips post-install for 'other' agent

**Total new tests: 16** (4+5+2+2+1+2). Existing 205 → 221.

## Tasks

### Task 0: Branch + plan commit + baseline
```bash
git checkout main && git pull
git checkout -b feature/c18-guided-onboarding-polish
git add docs/superpowers/plans/2026-05-06-pinflow-vscode-package-4c18-guided-onboarding-polish.md
git commit -m "docs(vscode): add Phase C.1.8 guided onboarding polish plan"
corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode,pinflow-relay
```

### Task 1: agent-detection module
**Subagent (Sonnet).** New `wizard/agent-detection.ts` + spec. Mirrors `cli-detection.ts` DI. Detects codex / claude / copilot binaries on PATH. Returns `{ codex: boolean; 'claude-code': boolean; copilot: boolean; }`.

### Task 2: post-install module
**Subagent (Sonnet).** New `wizard/post-install.ts` + spec. Three-button toast flow. Hardcoded install commands per agent (codex's 2 commands, claude-code's 2 commands, copilot/other → plain success). DI for `vscode.window.showInformationMessage`, `runInitInTerminal` (for Run path).

### Task 3: Step-indicator + detection-badges
**Subagent (Sonnet).** Updates agent-step.ts, framework-step.ts, monorepo-step.ts to:
- accept optional installed-agents map (agent-step) / detection result (framework-step)
- pass `title: 'PinFlow Setup · Schritt N/3 — $label'` to QuickPick options
- order/badge detected items first
- placeholder hint on framework-step when undetected
Updates each `.spec.ts` accordingly. Does NOT touch wizard.ts (Task 4).

### Task 4: Wire wizard.ts
**Subagent (Sonnet).** wizard.ts:
- calls `detectInstalledAgents()` after `detectApps`
- threads installed-agents into `pickAgent(...)` call
- threads detected framework string into `pickFramework(...)` (already done in C.1.7; verify and clean up)
- on success: calls `runPostInstall(agent, cwd, deps)` instead of inline toast
- removes the inline `showSuccessToast` / `pendingWizards` post-write logic where superseded
Updates wizard.spec.ts with 2 new tests.

### Task 5: Quality gate + VSIX
**Foreground (me).** Runs the 8-check gate, packages VSIX, hands off to user.

## Manual Smoke (final gate)

1. Reinstall VSIX (uninstall → window close → reopen → install from VSIX)
2. Click Setup PinFlow
3. Confirm step titles read `Schritt 1/3`, `Schritt 2/3`, `Schritt 3/3`
4. Confirm installed agent (e.g. codex if on PATH) appears first with `✓ installiert`
5. Confirm detected framework (vite/etc.) appears first with `✓ erkannt`
6. After write, confirm post-install toast with `[Run] [Show command] [Skip]`
7. Click `Run` → terminal opens, codex install commands run sequentially (user sees real output and any failure)
8. Settings flip to terminal mode → Setup → terminal opens (regression check)
9. No regression: C.1.7 wizard still works for 'other' agent (skips post-install gracefully)

## Out of scope (parked)

- Webview-based wizard (QuickPicks are sufficient)
- Auto-running install commands without confirmation
- Detecting partial-install state (e.g. codex installed but plugin missing)
- Phase B / C.2 / C.3 / D / E
