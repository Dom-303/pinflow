# PinFlow VS Code Extension — Package 3B-1: Webview Infra + Run-Cards + Lifecycle-Pills

## Goal

Replace the `pinflow.runs` Tree-View (shipped in Package 2 + 3A) with a Lit-based Webview that renders runs as visual cards with status pills. Establish the Webview infrastructure (build pipeline, message-passing, CSP, theming) that 3B-2 (live-log streaming) and 3B-3 (diff viewer) will build on.

3B-1 is the foundation. After it ships, the dashboard direction is committed; the harder engineering work (live logs, diff rendering) happens in subsequent packages without re-deciding architecture.

## Why Now

After Package 3A, the sidebar shows correct status and a chronological run list, but a Tree-View can only render text + icon per row. The user-experience gap closes when each run becomes a card with visible lifecycle, structured metadata, and (in later packages) inline log + diff. Webview is the only VS Code surface that supports this.

## Non-Goals (parked for 3B-2 / 3B-3 / later)

- **Live-log streaming** inside cards — Package 3B-2.
- **Click-to-diff inline viewer** — Package 3B-3.
- **Filter / sort / search** UI — later (likely 3B-3 or 4+).
- **Run-details drawer / detail page** — later.
- **State stores (Redux, Zustand, signals)** — Lit `@property` reactivity is sufficient at 3B-1 scope.
- **End-to-end Webview rendering tests** via `@vscode/test-electron` — manual smoke covers this.
- **Multi-folder dashboard** — single-active-folder per 3A's resolution.

## Architecture Decisions (settled during brainstorming)

| Decision | Choice | Reasoning |
|---|---|---|
| Framework | **Lit** + existing tokens from `pinflow-overlay/src/styles/theme.ts` | Repo already has full Lit design system + reusable component patterns from overlay. Avoids React-bridge in a Lit-native codebase. |
| Webview placement | **Sidebar with mixed views**: Status + Actions stay Tree-Views, only `pinflow.runs` becomes Webview | Status + Actions are glanceable lists that don't need cards. Run-cards need vertical space; sidebar fits. Preserves 3A's investments. |
| Scope phasing | **Three small packages**: 3B-1 (this spec) → 3B-2 (live log) → 3B-3 (diff viewer) | Webview infra is a risk on its own; isolating it. Live-log is its own engineering tier. Each package ships an end-to-end VS Code extension version. |
| Theming | **Hybrid**: VS Code theme variables for background/foreground, PinFlow accents for brand | Respects user's VS Code theme (light, dark, high-contrast). PinFlow brand bleeds through gold accents, status pills, card surfaces — recognizable as PinFlow but native to VS Code. |
| `runs-view-model.ts` | **Delete** rather than keep as fallback | Maintaining two UIs would mean a `pinflow.runs.useTreeView` setting + routing logic + duplicate tests. Hotfix-revert of 3B-1 is faster than parallel maintenance. |

## Architecture

### File-level changes

```
packages/pinflow-vscode/
├── package.json                                            # MOD — view type tree → webview, new build script
├── project.json                                            # MOD — new `build:webview` Nx target
├── .vscodeignore                                           # MOD — exclude src/runs-webview, include dist/runs-webview
├── vite.webview.config.ts                                  # NEW — Vite config for the webview bundle
├── scripts/check-webview-bundle-size.mjs                   # NEW — fails build if bundle > 150 KB gzipped
└── src/
    ├── extension.ts                                        # MOD — RunsWebviewProvider replaces RunsTreeDataProvider
    ├── core/views/runs-view-model.ts                       # DELETE — Tree-View no longer used
    ├── core/views/runs-view-model.spec.ts                  # DELETE
    ├── core/views/group-runs-by-date.ts                    # DELETE — only used by runs-view-model
    ├── core/views/group-runs-by-date.spec.ts               # DELETE
    ├── core/views/runs-webview-provider.ts                 # NEW — host-side provider (Node runtime)
    ├── core/views/runs-webview-provider.spec.ts            # NEW
    ├── core/views/runs-webview-messages.ts                 # NEW — shared message types (Node + Webview both import)
    ├── core/views/runs-webview-messages.spec.ts            # NEW
    └── runs-webview/                                       # NEW — webview-side bundle ONLY (browser runtime)
        ├── index.html                                      # Webview entrypoint (Vite-built)
        ├── main.ts                                         # Bootstraps the Lit app via acquireVsCodeApi()
        ├── styles/theme.css                                # CSS custom properties, hybrid theming
        ├── components/
        │   ├── pinflow-runs-app.ts                         # Root component
        │   ├── pinflow-runs-app.spec.ts
        │   ├── pinflow-run-card.ts                         # Single card
        │   ├── pinflow-run-card.spec.ts
        │   ├── pinflow-lifecycle-pill.ts                   # 4-state status pill (incl. 'unknown' fallback)
        │   ├── pinflow-lifecycle-pill.spec.ts
        │   ├── pinflow-runs-header.ts                      # "X runs" + future filter slot
        │   └── pinflow-empty-state.ts                      # Shown when runs.length === 0
        └── (no provider file here — webview directory contains browser-runtime code only)
```

### Data flow

```
extension.ts (refreshAll, every 3s)
  └── runEvidence: PinFlowRunEvidence[]
      └── runsWebviewProvider.postRuns(runEvidence)
          └── webview.postMessage({ type: 'runs:update', runs })
              └── pinflow-runs-app.runs = runs   (@property, triggers re-render)
                  └── repeat(runs, run => html`<pinflow-run-card .run=${run}>`)

User clicks a card
  └── pinflow-run-card dispatches click event
      └── pinflow-runs-app sends webview-postMessage
          └── { type: 'run:open-prompt', runId }
              └── extension.ts onDidReceiveMessage handler
                  └── invokes existing pinflow.openEvidenceFile command
                      with the run's promptPath
```

### Webview lifecycle

1. User opens the PinFlow Activity-Bar container.
2. VS Code instantiates `RunsWebviewProvider`.
3. `resolveWebviewView`:
   - Sets `webview.options.localResourceRoots` to `[extensionUri/dist/runs-webview]`.
   - Sets `webview.options.retainContextWhenHidden = true` so hide/show does not re-trigger the handshake or lose Lit state.
   - Sets `webview.html` with computed nonce + CSP + asset URIs through `webview.asWebviewUri(...)`.
   - Subscribes to `webview.onDidReceiveMessage` via the provided `Disposable[]` so listeners are cleaned up when the view is torn down.
   - Stores reference to the webview internally; **does NOT post anything yet** — webview JS is still loading and the message would be dropped.
4. Webview JavaScript loads, calls `const vscode = acquireVsCodeApi()`, registers `window.addEventListener('message', ...)`, then posts `{ type: 'webview:ready' }`.
5. Extension responds with `{ type: 'webview:init-ack', runs, settings: { timeFormat } }` containing the latest cached runs and active settings — this is the FIRST message the webview ever receives.
6. Subsequent `refreshAll` ticks call `provider.postRuns(...)` which sends `{ type: 'runs:update', runs }` only if a webview is currently resolved. Settings changes (via `vscode.workspace.onDidChangeConfiguration`) trigger `{ type: 'settings:update', settings }`.
7. On `webview.onDidDispose`, the provider clears its webview reference so subsequent `postRuns` calls become no-ops until next `resolveWebviewView`.

## Build Pipeline

### `vite.webview.config.ts`

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/runs-webview',
  build: {
    outDir: '../../dist/runs-webview',
    emptyOutDir: true,
    minify: 'terser',
    rollupOptions: {
      input: 'src/runs-webview/index.html',
      output: {
        entryFileNames: 'main.js',
        assetFileNames: '[name].[ext]',
        manualChunks: { lit: ['lit'] },
      },
      treeshake: { moduleSideEffects: false },
    },
  },
});
```

### `project.json` (excerpt — new target)

```json
"build:webview": {
  "executor": "nx:run-commands",
  "outputs": ["{projectRoot}/dist/runs-webview"],
  "inputs": ["{projectRoot}/src/runs-webview/**", "{projectRoot}/vite.webview.config.ts"],
  "options": {
    "command": "vite build --config vite.webview.config.ts && node scripts/check-webview-bundle-size.mjs",
    "cwd": "{projectRoot}"
  }
}
```

`build` gets `dependsOn: ["^build", "build:webview"]`. The `package:vsix` script also runs `build:webview` first.

### `scripts/check-webview-bundle-size.mjs`

Walks all files under `dist/runs-webview/` (JS, CSS, woff2 fonts), gzips each in-memory via `node:zlib`, sums the total gzipped size, fails (`process.exit(1)`) if total > 150 KB. Logs the per-file breakdown + total on success for trend visibility.

### `.vscodeignore`

```diff
+ src/runs-webview/**
+ vite.webview.config.ts
+ scripts/check-webview-bundle-size.mjs
- dist/runs-webview/**
```

(`-` lines mean "ensure this is NOT excluded".)

## Components

### `<pinflow-runs-app>`

- Root component, registered as `pinflow-runs-app`.
- `@property({ attribute: false }) runs: PinFlowRunEvidence[] = []`.
- Receives runs via `postMessage` listener registered on `connectedCallback`, sends `webview:ready` on connect.
- Renders `<pinflow-runs-header>`, then either `<pinflow-empty-state>` or `repeat(runs, run => run.runId, run => html\`<pinflow-run-card .run=\${run}>\`)`.
- Listens for `pinflow-card:click` events from cards and forwards them as `run:open-prompt` messages to the extension.

### `<pinflow-run-card>`

- `@property({ attribute: false }) run!: PinFlowRunEvidence`.
- Layout: header row (annotation-id + relative time + provider icon), body line (summary text, truncated to one line), footer row (lifecycle pill).
- Click on card body dispatches `pinflow-card:click` custom event with `{ runId }` detail.
- Time format follows `pinflow.timeFormat` setting (24h / 12h) — read from initial `webview:init-ack` message and re-applied on theme/setting changes.

### `<pinflow-lifecycle-pill>`

- `@property() state: 'processing' | 'processed' | 'failed' | 'unknown'`.
- Mapping function: `mapStatusToPillState(summary.status: string | undefined): PillState` returns one of the 4 states with `'unknown'` as fallback for any unrecognized or missing value. The mapping reuses the same 3 known values currently handled in the deleted `runs-view-model.ts` (`'processing'`, `'processed'`, `'failed'`).
- Renders surface + border + icon + optional pulse animation per state:

| State | Surface | Border | Icon | Animation |
|---|---|---|---|---|
| `processing` | `--pf-status-running` 14% | `--pf-status-running` 50% | `loading~spin` | subtle pulse 1.5s |
| `processed` | `--pf-status-done` 14% | `--pf-status-done` 50% | `check` | — |
| `failed` | `--pf-status-failed` 14% | `--pf-status-failed` 50% | `error` | — |
| `unknown` | `--pf-bg-elevated` | `--pf-border` | `circle-outline` | — |

- The `'unknown'` fallback is a safety net: if the runner ever introduces new status values (`'pending'`, `'cancelled'`, etc.), the pill renders an inert grey state instead of crashing or hiding. Future packages can extend the union explicitly.
- Icons via local `@vscode/codicons` font (no external assets).

### `<pinflow-runs-header>`

- Static for 3B-1: shows `${runs.length} runs` text. Filter slot reserved (no-op in 3B-1).

### `<pinflow-empty-state>`

- Centered illustration + text "No runs yet. Trigger a workflow from the Actions view." (matches the German copy used elsewhere if the user prefers — confirmed German in 3A → keep German here too: "Noch keine Runs. Workflow aus der Actions-Ansicht starten.").

## Message-Passing Protocol

### Source of truth: `src/core/views/runs-webview-messages.ts`

Lives in `core/views/` (not in `runs-webview/`) so the host-side provider can import it without crossing into the webview-bundle directory.

```ts
import type { PinFlowRunEvidence } from '../run-evidence.js';

export interface RunsWebviewSettings {
  readonly timeFormat: '24h' | '12h';
}

export type ExtToWebviewMessage =
  | { readonly type: 'webview:init-ack'; readonly runs: readonly PinFlowRunEvidence[]; readonly settings: RunsWebviewSettings }
  | { readonly type: 'runs:update'; readonly runs: readonly PinFlowRunEvidence[] }
  | { readonly type: 'settings:update'; readonly settings: RunsWebviewSettings };

export type WebviewToExtMessage =
  | { readonly type: 'webview:ready' }
  | { readonly type: 'run:open-prompt'; readonly runId: string }
  | { readonly type: 'run:open-evidence-file'; readonly filePath: string };

export function isExtToWebviewMessage(value: unknown): value is ExtToWebviewMessage { /* ... */ }
export function isWebviewToExtMessage(value: unknown): value is WebviewToExtMessage { /* ... */ }
```

Imported by both `runs-webview-provider.ts` (host-side) and `runs-webview/main.ts` (webview-side). Single source of truth.

### Handshake

1. Webview JS calls `acquireVsCodeApi()`, registers `window.addEventListener('message', ...)`, posts `webview:ready`.
2. Extension responds with `webview:init-ack` carrying current cached runs AND current settings (`timeFormat`).
3. Subsequent ticks send `runs:update`. Settings changes send `settings:update` separately (so we don't re-send the runs array on every settings tick).

### CSP header (built into `webview.html`)

```
default-src 'none';
script-src 'nonce-${nonce}';
style-src 'unsafe-inline' ${webview.cspSource};
font-src ${webview.cspSource};
img-src ${webview.cspSource} data:;
```

`'unsafe-inline'` for styles is required because Lit components emit inline `<style>` blocks per shadow DOM. This is standard for Lit + Webview.

## Theming (Hybrid C)

### `src/runs-webview/styles/theme.css`

```css
:root {
  /* VS Code theme variables — automatically reflect user theme */
  --pf-bg: var(--vscode-editor-background);
  --pf-bg-elevated: var(--vscode-sideBar-background);
  --pf-text: var(--vscode-foreground);
  --pf-text-muted: var(--vscode-descriptionForeground);
  --pf-border: var(--vscode-panel-border);
  --pf-focus: var(--vscode-focusBorder);

  /* PinFlow brand accents (fixed) — port from packages/pinflow-overlay/src/styles/theme.ts */
  --pf-accent: #a66f3d;
  --pf-accent-soft: rgba(166, 111, 61, 0.12);
  --pf-status-running: #f59e0b;
  --pf-status-done: #10b981;
  --pf-status-failed: #ef4444;
  --pf-status-pending: #b6a796;

  /* Card surfaces blend VS Code BG with brand accent */
  --pf-card-surface: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--pf-accent) 8%);
  --pf-card-shadow: 0 4px 14px color-mix(in srgb, var(--vscode-foreground) 6%, transparent);

  --pf-radius: 12px;
  --pf-space: 12px;
}

/* color-mix() fallback */
@supports not (color: color-mix(in srgb, white, black)) {
  :root {
    --pf-card-surface: rgba(166, 111, 61, 0.06);
    --pf-card-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  }
}

/* High-contrast theme override */
@media (prefers-contrast: more) {
  :root {
    --pf-card-surface: var(--vscode-editor-background);
    --pf-border: var(--vscode-contrastBorder);
    --pf-accent: var(--vscode-contrastActiveBorder);
    --pf-status-running: var(--vscode-charts-yellow);
    --pf-status-done: var(--vscode-charts-green);
    --pf-status-failed: var(--vscode-errorForeground);
  }
}
```

VS Code emits `vscode.window.onDidChangeActiveColorTheme` automatically — the `--vscode-*` variables in the webview update without explicit message-passing. No theme-state needed in `messages.ts`.

## Tests

### Lit-component unit tests (vitest + happy-dom)

| File | Coverage |
|---|---|
| `pinflow-run-card.spec.ts` | Renders correct annotation-id, relative time, summary text. Click event dispatches `pinflow-card:click` with correct `runId`. |
| `pinflow-lifecycle-pill.spec.ts` | All 5 states render correct icon + correct CSS classes. State change triggers re-render. |
| `pinflow-runs-app.spec.ts` | Empty state when `runs = []`. Card list when `runs` non-empty. `repeat()` keys cards by `runId`. Stress test: 80 runs renders without throw (no strict timing assertion — happy-dom timing is unreliable; real-browser perf checked manually in smoke). |
| `pinflow-runs-header.spec.ts` | Static "X runs" text reflects `runs.length`. |
| `pinflow-empty-state.spec.ts` | Renders the German copy. |

### Provider tests (vitest, mock `vscode.WebviewView`)

| File | Coverage |
|---|---|
| `runs-webview-provider.spec.ts` | `resolveWebviewView` sets HTML with correct CSP + nonce. `postRuns()` calls `webview.postMessage` with `{ type: 'runs:update', runs }`. `onDidReceiveMessage` for `run:open-prompt` invokes `pinflow.openEvidenceFile`. Handshake: receiving `webview:ready` triggers `webview:init-ack`. |

### Message-passing tests

| File | Coverage |
|---|---|
| `messages.spec.ts` | Type guards `isExtToWebviewMessage` / `isWebviewToExtMessage` accept valid shapes, reject malformed. JSON round-trip preserves all fields. |

### Test count delta

- New tests added (Lit components + provider + messages): **+22**.
- Tests deleted with `runs-view-model.spec.ts` (14) and `group-runs-by-date.spec.ts` (5): **-19**.
- Net pinflow-vscode delta: **+3 tests**, ending at 87 (current 84).
- pinflow-relay: unchanged.

### What is not unit-tested

- Real Webview rendering inside VS Code (would require `@vscode/test-electron`).
- Theme integration, CSP correctness, font loading.

These are covered by manual smoke testing.

## Risk Resolutions

| Risk | Resolution |
|---|---|
| **Vite-Build-Pipeline conflict with Nx** | Separate `vite.webview.config.ts`; Nx target `build:webview` with explicit `inputs` / `outputs`; `build` and `package:vsix` declare `dependsOn: ["build:webview"]`. Cache invalidation is precise. |
| **CSP blocks legitimate assets** | All assets local. Codicons font bundled via `@vscode/codicons` npm package. CSP explicit per resource type. All asset URLs through `webview.asWebviewUri()`. No external network requests. |
| **Bundle > 100 KB** | Vite `manualChunks: { lit: ['lit'] }`; tree-shake; terser minification; build-time guard `scripts/check-webview-bundle-size.mjs` sums total gzipped size of `dist/runs-webview/**` (JS + CSS + fonts) and fails if > 150 KB. |
| **Re-render performance** | Lit `repeat()` directive (keyed reconciliation). Performance budget asserted in `pinflow-runs-app.spec.ts`: 80 runs render in <16ms. Test fails if budget breached. |
| **`color-mix()` browser support** | VS Code engine `^1.90.0` ⇒ Chromium ≥ 124 (color-mix supported since 111). Defensive `@supports not (color: color-mix(...))` fallback in `theme.css`. |
| **High-Contrast theme unreadable** | `@media (prefers-contrast: more)` block in `theme.css` overrides surfaces, border, accent, status colors with VS Code's HC variables (`--vscode-contrastBorder`, `--vscode-contrastActiveBorder`, `--vscode-charts-*`, `--vscode-errorForeground`). Smoke test runs in 4 modes (Default Light, Default Dark, HC Light, HC Dark). |

## Manual Smoke Test (final verification gate)

1. Build the VSIX: `corepack pnpm --filter pinflow-vscode package:vsix`.
2. Install the VSIX in a VS Code window. Reload.
3. Open the PinFlow Activity-Bar.
4. **Empty state:** workspace with no runs. Confirm "Noch keine Runs. Workflow aus der Actions-Ansicht starten." renders.
5. **Run cards:** trigger `PinFlow: Start Workflow`. Card appears within the next 3-second refresh tick after the agent has produced the first summary. (Agent runtime varies — could be seconds to minutes; the 3-second bound is the tick frequency, not end-to-end latency.) Confirm header (annotation-id + time + provider icon), body (summary one-liner), pill at bottom.
6. **Lifecycle transition:** wait for the run to complete. Confirm pill transitions to `processed` (success) or `failed` (error). The `processing` state with pulse is visible only when the runner explicitly emits that status mid-run; if the agent goes straight from "no summary" to "summary processed", the pill skips processing.
7. **Click target:** click a card. Confirm `prompt.md` opens in the editor.
8. **Theme respect — Default Dark:** confirm webview adapts.
9. **Theme respect — Default Light:** confirm webview adapts.
10. **Theme respect — High Contrast Dark:** confirm pills use VS Code HC chart colors and border is sharp.
11. **Theme respect — High Contrast Light:** same.
12. **Bundle size sanity:** check console for the size message logged by `check-webview-bundle-size.mjs` during build. The script measures the total gzipped size of `dist/runs-webview/**` (JS + CSS + fonts), not just `main.js`. Should be well under 150 KB.
13. **No regression:** Status view still shows Relay/Runner/Workspace/Preview. Actions view still shows commands. First-Run toast still fires correctly.

## Verification Gates

```bash
corepack pnpm nx test pinflow-vscode
corepack pnpm nx build pinflow-vscode
corepack pnpm nx run pinflow-vscode:build:webview
corepack pnpm nx lint pinflow-vscode
git -C /home/domi/eventbaer/dev/pinflow diff --check
```

All five must be green. Then run the manual smoke test.

## Out of Scope (parked, restated)

- **Live-log streaming inline** — Package 3B-2.
- **Diff viewer** — Package 3B-3.
- **Filter / sort / search** — later (likely 3B-3 or 4+).
- **Run-detail drawer or detail page** — later.
- **State stores beyond Lit `@property`** — later if needed.
- **Marketplace publish** — gated until 3B-3 ships at minimum.
