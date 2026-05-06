# PinFlow VSCode Phase C.1.13 — UI State Persistence + Install Stability

**Status:** approved (2026-05-06)
**Predecessor:** [C.1.12 auto-install framework plugin](2026-05-06-pinflow-vscode-package-4c112-auto-plugin-install-design.md)
**Successor (planned):** C.1.14 bidirectional settings sync (separate spec)

## Why

C.1.12 smoke confirmed the overlay appears in the browser after one-click setup. Two follow-up issues surfaced:

1. **Browser refresh wipes the open workspace UI.** The user pressed F5 and the overlay collapsed back to the side tab — the open panel state is not persisted. Same for the active settings tab (workspace / flow / history).
2. **Install can fail silently from the user's perspective.** A network flake during `pnpm add -D @pinflow/react` produces a one-off error toast with no easy retry; long installs (>30 s) leave the user staring at a spinner with no hint that the Output Channel is the place to inspect progress.

Three small fixes close both gaps so C.1 onboarding feels stable end-to-end.

## Scope

- **A. Mode + activeTab persistence** in the overlay (browser localStorage). Pure overlay change, no relay/extension touch.
- **B. Retry button** on the wizard's install-failure toast. Re-runs only Phase 7.5 for the failed apps.
- **C. Long-install hint** in the progress notification. After 30 s without completion, append the Output-Channel pointer to the progress message.

## Non-goals

- Bidirectional settings sync between VS Code Settings and overlay localStorage (theme, picker mode, etc.) — handled in **C.1.14** as a separate architecture-level change.
- Resume after VS Code reload mid-install — too rare to justify a state-machine + recovery hook. Idempotency in C.1.12 already covers re-running setup, which is the recovery path.

## Design

### A. Persist `mode` and `activeTab`

`packages/pinflow-overlay/src/core/overlay-store.ts`:
- Add two new keys: `pinflow:mode`, `pinflow:activeTab`.
- Add `loadMode(): OverlayMode` and `loadActiveTab(): SettingsTab` static loaders, mirroring the existing `loadTheme` pattern.
- Apply at `OverlayStore` constructor: `mode: options?.initialMode ?? OverlayStore.loadMode()` (instead of the current bare `?? 'collapsed'`).
- Add `setMode(mode)` and `setActiveTab(tab)` setters that update state **and** write localStorage. Existing call sites that mutate `mode` directly via `setState({ mode: ... })` need to be redirected through `setMode` so persistence is consistent — there are about 6 such sites in the file (look for `mode: 'expanded'` / `mode: 'collapsed'` / `mode: 'capture'`). Same for `activeTab`.

`packages/pinflow-overlay/src/components/ds-settings-overlay.ts`:
- The component currently holds `activeTab` as `@state` (Lit-internal). Move it into the store so it survives reload.
- Component reads `activeTab` from `storeController.state`; clicking a tab calls `store.setActiveTab(tab)`.

Validation/restrictions:
- Whitelist load values to known enums (`'collapsed' | 'expanded' | 'capture'` for mode; `'workspace' | 'flow' | 'history'` for tab). Anything else falls back to default.
- `mode: 'capture'` is **not** persisted on purpose — it's a transient interaction state, not a user preference. Persist only `'collapsed'` / `'expanded'`. The setter only writes localStorage for those two.

### B. Retry button on install-failure toast

`packages/pinflow-vscode/src/core/onboarding/wizard/wizard.ts`:
- The current Phase 7.5 collects `failures: FrameworkPluginResult[]` and shows `showErrorMessage(message, 'Output anzeigen')`. Replace the action list with `'Erneut versuchen'`, `'Output anzeigen'`, `'Schließen'`.
- On `'Erneut versuchen'`: re-run `installFrameworkPlugin` for **just the failed apps** (not the successful ones — they're already configured). Reuse the same progress-notification block, but only iterate over `failures`. After the retry, re-aggregate; if there are still failures, show the toast again. Hard cap at 3 retries (the loop, not per-app) to prevent infinite loops on permanently broken environments.
- On `'Output anzeigen'`: existing behavior (show output channel).
- On `'Schließen'` or dismiss: return.

The retry path must remain idempotent — `installFrameworkPlugin`'s `installPackage` already checks if the package is in `package.json`, so a partial-fail-then-retry doesn't reinstall what worked. Same for `patchViteConfig` (already-patched check).

### C. Long-install hint

`packages/pinflow-vscode/src/core/onboarding/wizard/wizard.ts`:
- Inside the `withProgress` callback in Phase 7.5, set a single `setTimeout(30_000)` after starting the loop. When it fires (and the loop is still running), call `report({ message: '${currentMessage} · Bei langsamer Verbindung kann das dauern. Output anzeigen: View → Output → PinFlow Setup' })`.
- Clear the timeout in a `finally` after the loop completes.
- The timeout uses an injected timer dep (testable). Default: `setTimeout`/`clearTimeout`.

This is purely informational. The user is never blocked by this — the spinner runs the same. The hint helps them find the output channel if the install genuinely takes a while.

## Components

| Path | Change |
|---|---|
| `packages/pinflow-overlay/src/core/overlay-store.ts` | Add mode + activeTab persistence (loaders, setters, localStorage keys); redirect existing `mode:` mutations through `setMode` |
| `packages/pinflow-overlay/src/core/types.ts` | Add `activeTab` to `OverlayState` if not already there; export `SettingsTab` type if needed |
| `packages/pinflow-overlay/src/components/ds-settings-overlay.ts` | Move `activeTab` from `@state` to store-driven; persist via `setActiveTab` |
| `packages/pinflow-overlay/src/core/overlay-store.spec.ts` (or new spec file if pattern-matching cleaner) | Tests for load/set of mode and activeTab |
| `packages/pinflow-vscode/src/core/onboarding/wizard/wizard.ts` | Phase 7.5: retry-on-fail loop, long-install hint |
| `packages/pinflow-vscode/src/core/onboarding/wizard/wizard.spec.ts` | Tests for retry path + hint timer |

## Tests

### Overlay (Task A)

In existing or new `overlay-store.*.spec.ts`:
- `setMode('expanded')` writes `pinflow:mode` to localStorage; new instance reads it back.
- `setMode('capture')` does **not** persist (transient state).
- `loadMode` falls back to `'collapsed'` for unknown / missing values.
- Same shape for `setActiveTab`/`loadActiveTab` with `workspace`/`flow`/`history`.

### Wizard (Tasks B + C)

In `wizard.spec.ts`:
- Install-fail then retry: `installFrameworkPlugin` returns `'install-failed'` first call, `'patched'` on retry. User picks `'Erneut versuchen'`. Assert: install called twice for the failed app, success on second; only the failed app retried (not the successful sibling).
- Retry exhaustion: 3 retries fail in a row → after 3rd, no further retry button, only `'Output anzeigen'`/`'Schließen'`.
- Long-install hint: `installFrameworkPlugin` resolves after 35 s of simulated time. Assert `report` was called with a message containing `'Output anzeigen'` after the 30 s mark.
- Hint timer cleared on success: install resolves at 5 s (under threshold). Hint message never appended.

## Acceptance

- F5 in browser keeps the overlay open at `expanded` and the same active settings tab the user had open.
- Network failure on install → "Erneut versuchen" toast button retries cleanly without re-running successful installs.
- Long install (>30 s) shows a hint pointing the user to the Output Channel.
- All existing tests still green; new tests cover the additions.

## Out of scope (explicit)

- Settings sync between VS Code and overlay (C.1.14).
- Cancel button on the install progress (would need killing in-flight subprocesses; not worth the complexity for this iteration).
- Persisting `activeAnnotation` / `selectedElement` UI state (per-session, not per-preference; harder to scope cleanly).
