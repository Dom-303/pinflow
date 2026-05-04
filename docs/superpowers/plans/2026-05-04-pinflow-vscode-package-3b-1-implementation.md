# PinFlow VS Code Extension — Package 3B-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `pinflow.runs` Tree-View with a Lit-based Webview that renders runs as editorial cards with status pills. Establish the Webview infrastructure (build pipeline, message-passing, CSP, theming) for 3B-2 (live log) and 3B-3 (diff viewer).

**Spec source:** `docs/superpowers/specs/2026-05-04-pinflow-vscode-package-3b-1-design.md`.

**Tech Stack:** TypeScript 5 (ESM, `nodenext`), Lit 3, Vite 7, `@vscode/codicons`, Vitest + happy-dom, Nx, pnpm. No new runtime dependencies for the host side.

---

## Aesthetic Direction (binding for all implementer subagents)

This is not "make it look nice" boilerplate — these are decisions baked into specific lines of CSS and component JSX. Subagents implementing visual components MUST follow this section literally.

### Tone

Editorial calm. Think NYT-magazine card layouts, not Material Design feeds. The IDE is already dense; the dashboard is a curated reading space.

### Differentiation (memorable moment)

When a run's status transitions to `processed`, a 600ms gold gradient sweep moves left-to-right across the top edge of the card. Like ink drying or a wax seal forming. **One signature moment, one location.** Implemented via CSS `@keyframes` triggered on Lit's `updated()` lifecycle when state changes from non-`processed` to `processed`.

### Typography (binding rules)

- **Annotation-ID** (the prominent identifier on each card): `font-family: var(--vscode-editor-font-family)` — uses the user's chosen coding font (JetBrains Mono, Fira Code, Cascadia, SF Mono, etc.). Each user gets their own font in their cards.
- **Body text** (summary one-liner, header counts): `font-family: var(--vscode-font-family)` — VS Code's UI font.
- **NEVER** ship a custom @font-face for any text. The codicons font is the only embedded font.
- **NEVER** use Inter, Roboto, Arial, or `system-ui` as a primary stack — use VS Code's variables exclusively.

### Color & accents

- Background, foreground, borders, focus: VS Code variables (`--vscode-*`).
- Brand accent: PinFlow gold `#a66f3d` (token `--pf-accent`). Used only in: lifecycle pill outer ring, card left-edge marker (2px), vertical hairline divider in card header.
- Card surface: `color-mix(in srgb, var(--vscode-editor-background) 92%, var(--pf-accent) 8%)` with `@supports` rgba fallback.
- Status colors: warm `#f59e0b` (running), sage `#10b981` (done), soft `#ef4444` (failed). HC mode swaps to VS Code's `--vscode-charts-*` and `--vscode-errorForeground`.

### Spatial composition (card layout)

```
┌─┬──────────────────────────────────────┐
│ │  ANN-ID-LARGE-CODING-FONT  │  3:24p  │  ← header row
│ │  ─ vertical gold hairline ─          │
│ │                                      │
│ │  Summary text spanning full width    │  ← body
│ │  truncated to one line               │
│ │                                      │
│ │                       ┌──────────┐   │  ← lifecycle pill bottom-RIGHT
│ │                       │ ● done   │   │     (the unexpected choice)
│ │                       └──────────┘   │
└─┴──────────────────────────────────────┘
 ↑
 2px gold accent line (the "ink line")
```

### Motion (binding rules)

- **Initial card render:** stagger-fade-in. Card N has `animation-delay: calc(var(--index) * 50ms)`. First card animates immediately, last cards arrive ~500ms later for a list of 10.
- **Processing pulse:** `pinflow-lifecycle-pill[state="processing"]` pulses opacity 0.7→1.0→0.7 over 1.5s, infinite.
- **Hover lift:** card translates `-2px` Y, gains `--pf-card-shadow` deeper variant. 150ms ease.
- **Gold sweep on `processed`:** 600ms `linear-gradient(90deg, transparent 0%, var(--pf-accent) 50%, transparent 100%)` moves left-to-right on a `::before` pseudo-element on the card. Triggered when Lit's `updated()` detects transition to `processed`.
- **All motion respects `prefers-reduced-motion: reduce`** — wraps every animation in `@media (prefers-reduced-motion: no-preference)`.

### Surface details

- Cards have a 4% SVG noise overlay for paper grain (data-URI SVG, no external request).
- Card border: 1px `var(--pf-border)`, radius `var(--pf-radius)` (12px).
- Card padding: `var(--pf-space)` (12px) horizontal, slightly less vertical.

---

## Phase 0 — Pre-flight

### Task 0: Confirm baseline is green

**Files:** none

- [ ] **Step 1: Confirm we are on the correct branch**

Run: `git -C /home/domi/eventbaer/dev/pinflow rev-parse --abbrev-ref HEAD`
Expected: `main`.

- [ ] **Step 2: Confirm HEAD is at the spec sharpening commit**

Run: `git -C /home/domi/eventbaer/dev/pinflow log --oneline -1`
Expected: starts with `c7fe3ef docs: sharpen 3b-1 spec after self-review`.

- [ ] **Step 3: Confirm working tree clean**

Run: `git -C /home/domi/eventbaer/dev/pinflow status --porcelain`
Expected: empty.

- [ ] **Step 4: Run baseline quality gate**

Run: `corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode,pinflow-relay`
Expected: all green. Record current test count: pinflow-vscode 84, pinflow-relay 421.

---

## Phase 1 — Build Infrastructure

### Task 1: Add Lit + Codicons + Vitest helpers as deps

**Files:**
- Modify: `packages/pinflow-vscode/package.json`
- Modify: `pnpm-lock.yaml` (auto-generated)

- [ ] **Step 1: Add `lit`, `@vscode/codicons`, `happy-dom` to `dependencies` / `devDependencies`**

Edit `packages/pinflow-vscode/package.json`. Append to existing keys:

```jsonc
"dependencies": {
  // existing entries kept as-is, then:
  "lit": "^3.1.0",
  "@vscode/codicons": "^0.0.36"
},
"devDependencies": {
  // existing entries kept as-is, then:
  "happy-dom": "^15.11.6"
}
```

(Use the same Lit version as `pinflow-overlay` — verify with `grep '"lit"' packages/pinflow-overlay/package.json` and match.)

- [ ] **Step 2: Install**

Run: `corepack pnpm install`
Expected: pnpm-lock.yaml updates, no warnings about peer deps.

- [ ] **Step 3: Smoke-import in TypeScript to verify resolution**

Create a temporary `packages/pinflow-vscode/src/runs-webview/temp.ts` containing `import { LitElement } from 'lit';` then run `corepack pnpm nx typecheck pinflow-vscode`. Expected: clean. Then DELETE `temp.ts`.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/package.json pnpm-lock.yaml
git commit -m "chore(vscode): add lit, codicons, happy-dom deps for runs webview"
```

---

### Task 2: Create `vite.webview.config.ts` + bundle-size guard

**Files:**
- Create: `packages/pinflow-vscode/vite.webview.config.ts`
- Create: `packages/pinflow-vscode/scripts/check-webview-bundle-size.mjs`
- Create: `packages/pinflow-vscode/src/runs-webview/index.html` (minimal stub for Vite to find an entry point)
- Create: `packages/pinflow-vscode/src/runs-webview/main.ts` (minimal stub)

- [ ] **Step 1: Create `vite.webview.config.ts`**

```ts
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/runs-webview'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/runs-webview'),
    emptyOutDir: true,
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/runs-webview/index.html'),
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks: { lit: ['lit'] },
      },
      treeshake: { moduleSideEffects: false },
    },
  },
});
```

- [ ] **Step 2: Create the bundle-size guard script**

`packages/pinflow-vscode/scripts/check-webview-bundle-size.mjs`:

```js
#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../dist/runs-webview');
const LIMIT_BYTES = 150 * 1024;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    }),
  );
  return files.flat();
}

const files = await walk(ROOT);
let total = 0;
const breakdown = [];
for (const file of files) {
  const buf = await readFile(file);
  const gz = gzipSync(buf).length;
  total += gz;
  breakdown.push({ file: path.relative(ROOT, file), gz });
}

breakdown.sort((a, b) => b.gz - a.gz);
console.log('runs-webview bundle (gzipped):');
for (const { file, gz } of breakdown) {
  console.log(`  ${(gz / 1024).toFixed(1).padStart(7)} KB  ${file}`);
}
console.log(`  ${'-'.repeat(30)}`);
console.log(`  ${(total / 1024).toFixed(1).padStart(7)} KB  TOTAL`);

if (total > LIMIT_BYTES) {
  console.error(
    `\nBundle exceeds limit: ${(total / 1024).toFixed(1)} KB > ${LIMIT_BYTES / 1024} KB`,
  );
  process.exit(1);
}
```

- [ ] **Step 3: Create stub entry-point files** (so Vite has something to build for the next task)

`packages/pinflow-vscode/src/runs-webview/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>PinFlow Runs</title>
    <link rel="stylesheet" href="./styles/theme.css" />
  </head>
  <body>
    <pinflow-runs-app></pinflow-runs-app>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

`packages/pinflow-vscode/src/runs-webview/main.ts`:

```ts
// Bootstraps the Lit app — fully populated in Task 5.
console.log('pinflow-runs webview loaded');
```

`packages/pinflow-vscode/src/runs-webview/styles/theme.css`:

```css
/* Populated in Task 6. */
```

- [ ] **Step 4: Run Vite build manually to verify**

Run: `cd packages/pinflow-vscode && corepack pnpm exec vite build --config vite.webview.config.ts`
Expected: succeeds, produces `dist/runs-webview/main.js` and `dist/runs-webview/index.html`. Run the bundle-size guard: `node scripts/check-webview-bundle-size.mjs` — expect total well under 150 KB.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/vite.webview.config.ts \
        packages/pinflow-vscode/scripts/check-webview-bundle-size.mjs \
        packages/pinflow-vscode/src/runs-webview/index.html \
        packages/pinflow-vscode/src/runs-webview/main.ts \
        packages/pinflow-vscode/src/runs-webview/styles/theme.css
git commit -m "feat(vscode): scaffold vite webview build pipeline + size guard"
```

---

### Task 3: Wire Nx target + `.vscodeignore` updates

**Files:**
- Modify: `packages/pinflow-vscode/project.json`
- Modify: `packages/pinflow-vscode/.vscodeignore`

- [ ] **Step 1: Add `build:webview` target**

Edit `packages/pinflow-vscode/project.json`. Inside the `targets` block, add (or merge with existing build target):

```json
"build:webview": {
  "executor": "nx:run-commands",
  "outputs": ["{projectRoot}/dist/runs-webview"],
  "inputs": [
    "{projectRoot}/src/runs-webview/**",
    "{projectRoot}/vite.webview.config.ts",
    "{projectRoot}/scripts/check-webview-bundle-size.mjs"
  ],
  "options": {
    "command": "vite build --config vite.webview.config.ts && node scripts/check-webview-bundle-size.mjs",
    "cwd": "{projectRoot}"
  }
}
```

Modify the existing `build` target to add `"build:webview"` to `dependsOn` (alongside `^build`).

- [ ] **Step 2: Update `.vscodeignore`**

Edit `packages/pinflow-vscode/.vscodeignore`. Add lines:

```
# Webview source — only the bundled output ships
src/runs-webview/**
vite.webview.config.ts
scripts/check-webview-bundle-size.mjs
```

If there's already a `dist/**` exclude, add an UN-exclude for runs-webview:

```
!dist/runs-webview/**
```

- [ ] **Step 3: Verify the target runs**

Run: `corepack pnpm nx run pinflow-vscode:build:webview`
Expected: green; bundle-size script logs the per-file breakdown + total.

- [ ] **Step 4: Verify `nx build pinflow-vscode` triggers the webview build**

Run: `corepack pnpm nx reset && corepack pnpm nx build pinflow-vscode`
Expected: both `build:webview` and the tsc build run; output includes `dist/runs-webview/main.js` and `dist/extension.js`.

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-vscode/project.json packages/pinflow-vscode/.vscodeignore
git commit -m "feat(vscode): wire build:webview into nx and vsix packaging"
```

---

## Phase 2 — Message Types

### Task 4: Create shared message-type module + tests

**Files:**
- Create: `packages/pinflow-vscode/src/core/views/runs-webview-messages.ts`
- Create: `packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts`

- [ ] **Step 1: Write the failing tests first (TDD)**

`packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts`:

```ts
import {
  isExtToWebviewMessage,
  isWebviewToExtMessage,
  type ExtToWebviewMessage,
  type WebviewToExtMessage,
} from './runs-webview-messages.js';

describe('runs-webview message guards', () => {
  describe('isExtToWebviewMessage', () => {
    it('accepts a valid runs:update', () => {
      expect(
        isExtToWebviewMessage({ type: 'runs:update', runs: [] }),
      ).toBe(true);
    });

    it('accepts a valid webview:init-ack with settings', () => {
      expect(
        isExtToWebviewMessage({
          type: 'webview:init-ack',
          runs: [],
          settings: { timeFormat: '24h' },
        }),
      ).toBe(true);
    });

    it('accepts a valid settings:update', () => {
      expect(
        isExtToWebviewMessage({
          type: 'settings:update',
          settings: { timeFormat: '12h' },
        }),
      ).toBe(true);
    });

    it('rejects an unknown type', () => {
      expect(
        isExtToWebviewMessage({ type: 'unknown:type', runs: [] }),
      ).toBe(false);
    });

    it('rejects a non-object', () => {
      expect(isExtToWebviewMessage('not an object')).toBe(false);
      expect(isExtToWebviewMessage(null)).toBe(false);
      expect(isExtToWebviewMessage(undefined)).toBe(false);
    });

    it('rejects init-ack missing settings', () => {
      expect(
        isExtToWebviewMessage({
          type: 'webview:init-ack',
          runs: [],
        }),
      ).toBe(false);
    });
  });

  describe('isWebviewToExtMessage', () => {
    it('accepts webview:ready', () => {
      expect(isWebviewToExtMessage({ type: 'webview:ready' })).toBe(true);
    });

    it('accepts run:open-prompt with runId', () => {
      expect(
        isWebviewToExtMessage({ type: 'run:open-prompt', runId: 'r_1' }),
      ).toBe(true);
    });

    it('accepts run:open-evidence-file with filePath', () => {
      expect(
        isWebviewToExtMessage({
          type: 'run:open-evidence-file',
          filePath: '/repo/.pinflow/runs/2026-04/r_1/diff.patch',
        }),
      ).toBe(true);
    });

    it('rejects run:open-prompt with missing runId', () => {
      expect(isWebviewToExtMessage({ type: 'run:open-prompt' })).toBe(false);
    });
  });

  describe('JSON round-trip', () => {
    it('preserves all fields of init-ack', () => {
      const message: ExtToWebviewMessage = {
        type: 'webview:init-ack',
        runs: [],
        settings: { timeFormat: '24h' },
      };
      const round = JSON.parse(JSON.stringify(message)) as unknown;
      expect(isExtToWebviewMessage(round)).toBe(true);
      expect(round).toEqual(message);
    });

    it('preserves all fields of run:open-prompt', () => {
      const message: WebviewToExtMessage = {
        type: 'run:open-prompt',
        runId: 'r_1',
      };
      const round = JSON.parse(JSON.stringify(message)) as unknown;
      expect(isWebviewToExtMessage(round)).toBe(true);
      expect(round).toEqual(message);
    });
  });
});
```

Run: `corepack pnpm nx test pinflow-vscode -- runs-webview-messages`. Expected: FAIL (file doesn't exist yet).

- [ ] **Step 2: Implement the module**

`packages/pinflow-vscode/src/core/views/runs-webview-messages.ts`:

```ts
import type { PinFlowRunEvidence } from '../run-evidence.js';

export interface RunsWebviewSettings {
  readonly timeFormat: '24h' | '12h';
}

export type ExtToWebviewMessage =
  | {
      readonly type: 'webview:init-ack';
      readonly runs: readonly PinFlowRunEvidence[];
      readonly settings: RunsWebviewSettings;
    }
  | {
      readonly type: 'runs:update';
      readonly runs: readonly PinFlowRunEvidence[];
    }
  | {
      readonly type: 'settings:update';
      readonly settings: RunsWebviewSettings;
    };

export type WebviewToExtMessage =
  | { readonly type: 'webview:ready' }
  | { readonly type: 'run:open-prompt'; readonly runId: string }
  | { readonly type: 'run:open-evidence-file'; readonly filePath: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSettings(value: unknown): value is RunsWebviewSettings {
  return (
    isObject(value) &&
    (value['timeFormat'] === '24h' || value['timeFormat'] === '12h')
  );
}

export function isExtToWebviewMessage(
  value: unknown,
): value is ExtToWebviewMessage {
  if (!isObject(value)) return false;
  const type = value['type'];
  if (type === 'runs:update') {
    return Array.isArray(value['runs']);
  }
  if (type === 'webview:init-ack') {
    return Array.isArray(value['runs']) && isSettings(value['settings']);
  }
  if (type === 'settings:update') {
    return isSettings(value['settings']);
  }
  return false;
}

export function isWebviewToExtMessage(
  value: unknown,
): value is WebviewToExtMessage {
  if (!isObject(value)) return false;
  const type = value['type'];
  if (type === 'webview:ready') return true;
  if (type === 'run:open-prompt') return typeof value['runId'] === 'string';
  if (type === 'run:open-evidence-file')
    return typeof value['filePath'] === 'string';
  return false;
}
```

- [ ] **Step 3: Run tests**

Run: `corepack pnpm nx test pinflow-vscode -- runs-webview-messages`
Expected: PASS. ~12 tests.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/runs-webview-messages.ts \
        packages/pinflow-vscode/src/core/views/runs-webview-messages.spec.ts
git commit -m "feat(vscode): add runs-webview message types and guards"
```

---

## Phase 3 — Webview Theme + Bootstrap

### Task 5: Implement `theme.css` with hybrid theming + HC + reduced-motion

**Files:**
- Modify: `packages/pinflow-vscode/src/runs-webview/styles/theme.css`

- [ ] **Step 1: Replace stub `theme.css` with full token system**

```css
/* Hybrid theming: VS Code base + PinFlow accents */
:root {
  --pf-bg: var(--vscode-editor-background);
  --pf-bg-elevated: var(--vscode-sideBar-background, var(--vscode-editor-background));
  --pf-text: var(--vscode-foreground);
  --pf-text-muted: var(--vscode-descriptionForeground);
  --pf-border: var(--vscode-panel-border, var(--vscode-widget-border));
  --pf-focus: var(--vscode-focusBorder);

  --pf-accent: #a66f3d;
  --pf-accent-soft: rgba(166, 111, 61, 0.12);
  --pf-status-running: #f59e0b;
  --pf-status-done: #10b981;
  --pf-status-failed: #ef4444;

  --pf-card-surface: color-mix(
    in srgb,
    var(--vscode-editor-background) 92%,
    var(--pf-accent) 8%
  );
  --pf-card-shadow: 0 4px 14px
    color-mix(in srgb, var(--vscode-foreground) 6%, transparent);
  --pf-card-shadow-hover: 0 8px 24px
    color-mix(in srgb, var(--vscode-foreground) 10%, transparent);

  --pf-radius: 12px;
  --pf-space: 12px;
  --pf-space-sm: 8px;
  --pf-space-xs: 4px;

  /* Paper grain overlay (4% opacity SVG noise as data URI) */
  --pf-paper-grain: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>");
}

/* color-mix() fallback for older Chromium */
@supports not (color: color-mix(in srgb, white, black)) {
  :root {
    --pf-card-surface: rgba(166, 111, 61, 0.06);
    --pf-card-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    --pf-card-shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

/* High-contrast theme override */
@media (prefers-contrast: more) {
  :root {
    --pf-card-surface: var(--vscode-editor-background);
    --pf-border: var(--vscode-contrastBorder);
    --pf-accent: var(--vscode-contrastActiveBorder);
    --pf-status-running: var(--vscode-charts-yellow, #ffcc00);
    --pf-status-done: var(--vscode-charts-green, #00cc00);
    --pf-status-failed: var(--vscode-errorForeground, #ff0000);
    --pf-paper-grain: none;
  }
}

/* Body resets */
body {
  margin: 0;
  padding: 0;
  background: var(--pf-bg);
  color: var(--pf-text);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size, 13px);
}

* {
  box-sizing: border-box;
}
```

- [ ] **Step 2: Visual smoke check**

Run: `corepack pnpm nx run pinflow-vscode:build:webview`
Expected: green. Manually open `dist/runs-webview/index.html` in a browser to ensure no parse errors (will look unstyled — components don't exist yet).

- [ ] **Step 3: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/styles/theme.css
git commit -m "feat(vscode): implement hybrid theme tokens for runs webview"
```

---

### Task 6: Bootstrap `main.ts` with `acquireVsCodeApi()` + message wiring

**Files:**
- Modify: `packages/pinflow-vscode/src/runs-webview/main.ts`

- [ ] **Step 1: Replace stub with full bootstrap**

```ts
import './components/pinflow-runs-app.js';
import './components/pinflow-run-card.js';
import './components/pinflow-lifecycle-pill.js';
import './components/pinflow-runs-header.js';
import './components/pinflow-empty-state.js';
import {
  isExtToWebviewMessage,
  type WebviewToExtMessage,
} from '../core/views/runs-webview-messages.js';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

function postToHost(message: WebviewToExtMessage): void {
  vscode.postMessage(message);
}

const app = document.querySelector('pinflow-runs-app');
if (!app) {
  throw new Error('pinflow-runs-app element not found in DOM');
}

window.addEventListener('message', (event) => {
  if (!isExtToWebviewMessage(event.data)) return;
  const data = event.data;
  if (data.type === 'webview:init-ack') {
    (app as unknown as { runs: readonly unknown[]; settings: unknown }).runs =
      data.runs;
    (app as unknown as { settings: unknown }).settings = data.settings;
  } else if (data.type === 'runs:update') {
    (app as unknown as { runs: readonly unknown[] }).runs = data.runs;
  } else if (data.type === 'settings:update') {
    (app as unknown as { settings: unknown }).settings = data.settings;
  }
});

// Forward custom events from the Lit app to the VS Code host
app.addEventListener('pinflow-card:click', (event) => {
  const detail = (event as CustomEvent<{ runId: string }>).detail;
  if (detail?.runId) {
    postToHost({ type: 'run:open-prompt', runId: detail.runId });
  }
});

postToHost({ type: 'webview:ready' });
```

- [ ] **Step 2: Add path-mapping note for the `../core/views/...` import**

The Vite config has `root: 'src/runs-webview'`, but `import '../core/views/runs-webview-messages.js'` will be resolved by Vite via filesystem. Verify: `corepack pnpm nx run pinflow-vscode:build:webview` should succeed (Lit + messages module bundled together). If Vite complains about the relative path crossing roots, add `resolve.alias` to point `'#/messages'` to the absolute messages module path and import via the alias.

- [ ] **Step 3: Verify build works** (no test for this — provider-level tests come later)

Run: `corepack pnpm nx run pinflow-vscode:build:webview`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/main.ts
git commit -m "feat(vscode): bootstrap runs webview with vscode api + message routing"
```

---

## Phase 4 — Lit Components

### Task 7: `<pinflow-lifecycle-pill>` component

**Files:**
- Create: `packages/pinflow-vscode/src/runs-webview/components/pinflow-lifecycle-pill.ts`
- Create: `packages/pinflow-vscode/src/runs-webview/components/pinflow-lifecycle-pill.spec.ts`

- [ ] **Step 1: Write failing tests (TDD)**

`pinflow-lifecycle-pill.spec.ts`:

```ts
import './pinflow-lifecycle-pill.js';
import {
  PinflowLifecyclePill,
  mapStatusToPillState,
} from './pinflow-lifecycle-pill.js';

describe('mapStatusToPillState', () => {
  it("maps 'processing' to 'processing'", () => {
    expect(mapStatusToPillState('processing')).toBe('processing');
  });

  it("maps 'processed' to 'processed'", () => {
    expect(mapStatusToPillState('processed')).toBe('processed');
  });

  it("maps 'failed' to 'failed'", () => {
    expect(mapStatusToPillState('failed')).toBe('failed');
  });

  it("maps undefined to 'unknown'", () => {
    expect(mapStatusToPillState(undefined)).toBe('unknown');
  });

  it("maps 'pending' (unrecognized) to 'unknown'", () => {
    expect(mapStatusToPillState('pending')).toBe('unknown');
  });

  it("maps 'cancelled' (unrecognized) to 'unknown'", () => {
    expect(mapStatusToPillState('cancelled')).toBe('unknown');
  });

  it('maps an arbitrary string to unknown', () => {
    expect(mapStatusToPillState('foo-bar')).toBe('unknown');
  });
});

describe('<pinflow-lifecycle-pill>', () => {
  it('renders the four states with distinct shadow-DOM classes', async () => {
    const states = ['processing', 'processed', 'failed', 'unknown'] as const;
    for (const state of states) {
      const el = document.createElement(
        'pinflow-lifecycle-pill',
      ) as PinflowLifecyclePill;
      el.state = state;
      document.body.appendChild(el);
      await el.updateComplete;
      const root = el.shadowRoot;
      expect(root).toBeDefined();
      expect(root!.querySelector(`[data-state='${state}']`)).not.toBeNull();
      el.remove();
    }
  });

  it('updates the rendered state when the property changes', async () => {
    const el = document.createElement(
      'pinflow-lifecycle-pill',
    ) as PinflowLifecyclePill;
    el.state = 'processing';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector("[data-state='processing']")).not.toBeNull();

    el.state = 'processed';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector("[data-state='processed']")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("[data-state='processing']")).toBeNull();
    el.remove();
  });
});
```

Run: `corepack pnpm nx test pinflow-vscode -- pinflow-lifecycle-pill`. Expected: FAIL.

- [ ] **Step 2: Implement the component**

`pinflow-lifecycle-pill.ts`:

```ts
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type PillState = 'processing' | 'processed' | 'failed' | 'unknown';

const KNOWN_STATES = new Set<string>(['processing', 'processed', 'failed']);

export function mapStatusToPillState(
  status: string | undefined,
): PillState {
  if (status === undefined) return 'unknown';
  return KNOWN_STATES.has(status) ? (status as PillState) : 'unknown';
}

const STATE_LABEL: Record<PillState, string> = {
  processing: 'processing',
  processed: 'done',
  failed: 'failed',
  unknown: 'unknown',
};

const STATE_ICON: Record<PillState, string> = {
  processing: 'codicon-loading codicon-modifier-spin',
  processed: 'codicon-check',
  failed: 'codicon-error',
  unknown: 'codicon-circle-outline',
};

@customElement('pinflow-lifecycle-pill')
export class PinflowLifecyclePill extends LitElement {
  @property({ type: String }) state: PillState = 'unknown';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px 3px 8px;
      border-radius: 999px;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      line-height: 1;
      transition: opacity 200ms ease;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    [data-state='processing'] {
      background: color-mix(in srgb, var(--pf-status-running) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--pf-status-running) 50%, transparent);
      color: var(--pf-status-running);
    }
    [data-state='processed'] {
      background: color-mix(in srgb, var(--pf-status-done) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--pf-status-done) 50%, transparent);
      color: var(--pf-status-done);
    }
    [data-state='failed'] {
      background: color-mix(in srgb, var(--pf-status-failed) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--pf-status-failed) 50%, transparent);
      color: var(--pf-status-failed);
    }
    [data-state='unknown'] {
      background: var(--pf-bg-elevated);
      border: 1px solid var(--pf-border);
      color: var(--pf-text-muted);
    }
    @media (prefers-reduced-motion: no-preference) {
      [data-state='processing'] {
        animation: pulse 1.5s ease-in-out infinite;
      }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
  `;

  render() {
    const label = STATE_LABEL[this.state];
    const iconClass = STATE_ICON[this.state];
    return html`
      <span class="pill" data-state=${this.state}>
        <i class=${`codicon ${iconClass}`} aria-hidden="true"></i>
        <span>${label}</span>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-lifecycle-pill': PinflowLifecyclePill;
  }
}
```

- [ ] **Step 3: Configure vitest for happy-dom + decorator support**

If pinflow-vscode's `vite.config.ts` (the vitest one, not the webview one) doesn't already use happy-dom, set `test.environment: 'happy-dom'` in it. Verify decorator support (Lit needs `experimentalDecorators` OR Vite's built-in TS decorator handling — check `tsconfig.spec.json` and add `"experimentalDecorators": true` if missing).

- [ ] **Step 4: Run tests**

Run: `corepack pnpm nx test pinflow-vscode -- pinflow-lifecycle-pill`
Expected: PASS.

- [ ] **Step 5: Verify build**

Run: `corepack pnpm nx run pinflow-vscode:build:webview`
Expected: green; bundle stays under 150 KB.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/components/pinflow-lifecycle-pill.ts \
        packages/pinflow-vscode/src/runs-webview/components/pinflow-lifecycle-pill.spec.ts \
        packages/pinflow-vscode/vite.config.ts \
        packages/pinflow-vscode/tsconfig.spec.json
git commit -m "feat(vscode): add pinflow-lifecycle-pill component with 4 states"
```

(Adjust the `git add` line if vite.config.ts and tsconfig.spec.json didn't actually need changes.)

---

### Task 8: `<pinflow-run-card>` component (with editorial layout + gold sweep)

**Files:**
- Create: `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.ts`
- Create: `packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
import './pinflow-run-card.js';
import { PinflowRunCard } from './pinflow-run-card.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';

function makeRun(overrides: Partial<PinFlowRunEvidence> = {}): PinFlowRunEvidence {
  return {
    annotationId: 'ann_abc',
    runId: 'r_1',
    summary: { status: 'processed', startedAt: '2026-05-04T10:00:00Z' },
    summaryPath: '/repo/.pinflow/runs/r_1/summary.json',
    promptPath: '/repo/.pinflow/runs/r_1/prompt.md',
    transcriptPath: null,
    diffPath: null,
    hasDiff: false,
    changedFiles: [],
    additions: 0,
    deletions: 0,
    ...overrides,
  };
}

describe('<pinflow-run-card>', () => {
  it('renders the annotation id in the editor-font slot', async () => {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ annotationId: 'ann_xyz' });
    el.timeFormat = '24h';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.annotation-id')!.textContent).toContain(
      'ann_xyz',
    );
    el.remove();
  });

  it('falls back to runId when annotationId is missing', async () => {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ annotationId: undefined, runId: 'r_42' });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.annotation-id')!.textContent).toContain('r_42');
    el.remove();
  });

  it('dispatches pinflow-card:click with runId on click', async () => {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ runId: 'r_clicked' });
    document.body.appendChild(el);
    await el.updateComplete;
    const events: Array<CustomEvent<{ runId: string }>> = [];
    el.addEventListener('pinflow-card:click', (e) =>
      events.push(e as CustomEvent<{ runId: string }>),
    );
    el.shadowRoot!
      .querySelector<HTMLElement>('.card')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(events).toHaveLength(1);
    expect(events[0].detail.runId).toBe('r_clicked');
    el.remove();
  });

  it('renders the lifecycle pill with mapped state', async () => {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ summary: { status: 'failed' } });
    document.body.appendChild(el);
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('pinflow-lifecycle-pill') as
      | (HTMLElement & { state: string })
      | null;
    expect(pill).not.toBeNull();
    expect(pill!.state).toBe('failed');
    el.remove();
  });
});
```

Run tests — expect FAIL.

- [ ] **Step 2: Implement the component**

```ts
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './pinflow-lifecycle-pill.js';
import { mapStatusToPillState } from './pinflow-lifecycle-pill.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

@customElement('pinflow-run-card')
export class PinflowRunCard extends LitElement {
  @property({ attribute: false }) run!: PinFlowRunEvidence;
  @property({ attribute: false }) timeFormat: RunsWebviewSettings['timeFormat'] = '24h';
  @property({ type: Number }) index = 0;

  static styles = css`
    :host {
      display: block;
      --stagger-delay: calc(var(--card-index, 0) * 50ms);
    }
    .card {
      position: relative;
      background: var(--pf-card-surface);
      background-image: var(--pf-paper-grain);
      background-blend-mode: overlay;
      border: 1px solid var(--pf-border);
      border-radius: var(--pf-radius);
      padding: 10px 14px 12px 16px;
      cursor: pointer;
      box-shadow: var(--pf-card-shadow);
      transition: transform 150ms ease, box-shadow 150ms ease;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 12px;
      bottom: 12px;
      width: 2px;
      background: var(--pf-accent);
      border-radius: 2px;
    }
    @media (prefers-reduced-motion: no-preference) {
      :host {
        animation: card-fade-in 350ms ease-out both;
        animation-delay: var(--stagger-delay);
      }
      .card:hover {
        transform: translateY(-2px);
        box-shadow: var(--pf-card-shadow-hover);
      }
      .card[data-just-processed]::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--pf-accent) 50%,
          transparent 100%
        );
        animation: gold-sweep 600ms ease-out;
      }
    }
    @keyframes card-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes gold-sweep {
      from { transform: translateX(-100%); }
      to { transform: translateX(100%); }
    }
    .header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--pf-space);
    }
    .annotation-id {
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: 13px;
      font-weight: 600;
      color: var(--pf-text);
      letter-spacing: 0.01em;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .header-divider {
      width: 1px;
      align-self: stretch;
      background: var(--pf-accent);
      opacity: 0.5;
      margin: 2px 4px;
    }
    .time {
      font-family: var(--vscode-font-family);
      font-size: 11px;
      color: var(--pf-text-muted);
      white-space: nowrap;
    }
    .summary {
      margin-top: 6px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      color: var(--pf-text-muted);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .footer {
      margin-top: 8px;
      display: flex;
      justify-content: flex-end;
    }
  `;

  private previousState: string | undefined = undefined;

  protected updated(changed: Map<string, unknown>): void {
    if (!changed.has('run')) return;
    const prev = changed.get('run') as PinFlowRunEvidence | undefined;
    const previousStatus = prev?.summary?.status;
    const currentStatus = this.run?.summary?.status;
    if (
      currentStatus === 'processed' &&
      previousStatus !== undefined &&
      previousStatus !== 'processed'
    ) {
      const card = this.shadowRoot?.querySelector<HTMLElement>('.card');
      if (card) {
        card.dataset['justProcessed'] = '';
        setTimeout(() => delete card.dataset['justProcessed'], 700);
      }
    }
    this.previousState = currentStatus;
  }

  private formatTime(): string {
    const iso = this.run?.summary?.startedAt;
    if (!iso) return '';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: this.timeFormat === '12h',
      });
    } catch {
      return '';
    }
  }

  private handleClick = (event: MouseEvent): void => {
    event.preventDefault();
    const runId = this.run?.runId;
    if (!runId) return;
    this.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId },
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const label = this.run?.annotationId ?? this.run?.runId ?? 'unknown';
    const summary = this.run?.summary?.label ?? '';
    const pillState = mapStatusToPillState(this.run?.summary?.status);
    return html`
      <div
        class="card"
        style=${`--card-index: ${this.index}`}
        @click=${this.handleClick}
      >
        <div class="header">
          <span class="annotation-id">${label}</span>
          <span class="header-divider"></span>
          <span class="time">${this.formatTime()}</span>
        </div>
        ${summary
          ? html`<div class="summary">${summary}</div>`
          : html`<div class="summary">&nbsp;</div>`}
        <div class="footer">
          <pinflow-lifecycle-pill .state=${pillState}></pinflow-lifecycle-pill>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-run-card': PinflowRunCard;
  }
}
```

- [ ] **Step 3: Run tests**

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.ts \
        packages/pinflow-vscode/src/runs-webview/components/pinflow-run-card.spec.ts
git commit -m "feat(vscode): add pinflow-run-card with editorial layout + gold sweep"
```

---

### Task 9: `<pinflow-runs-app>`, `<pinflow-runs-header>`, `<pinflow-empty-state>`

**Files:**
- Create: 3 components + their `.spec.ts` files

- [ ] **Step 1: Implement `<pinflow-runs-header>`** (trivial)

```ts
// pinflow-runs-header.ts
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('pinflow-runs-header')
export class PinflowRunsHeader extends LitElement {
  @property({ type: Number }) count = 0;

  static styles = css`
    :host {
      display: block;
      padding: 8px 14px 4px;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      color: var(--pf-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  `;

  render() {
    return html`<span>${this.count} run${this.count === 1 ? '' : 's'}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-runs-header': PinflowRunsHeader;
  }
}
```

- [ ] **Step 2: Implement `<pinflow-empty-state>`**

German copy per spec consistency:

```ts
import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('pinflow-empty-state')
export class PinflowEmptyState extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: var(--pf-text-muted);
      font-family: var(--vscode-font-family);
      font-size: 12px;
      line-height: 1.6;
    }
    .accent {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid var(--pf-accent);
      opacity: 0.6;
      margin-bottom: 16px;
    }
    .body {
      max-width: 240px;
    }
  `;

  render() {
    return html`
      <div class="accent" aria-hidden="true"></div>
      <div class="body">
        Noch keine Runs.
        <br />Workflow aus der Actions-Ansicht starten.
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-empty-state': PinflowEmptyState;
  }
}
```

- [ ] **Step 3: Implement `<pinflow-runs-app>` (root)**

```ts
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './pinflow-runs-header.js';
import './pinflow-empty-state.js';
import './pinflow-run-card.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

@customElement('pinflow-runs-app')
export class PinflowRunsApp extends LitElement {
  @property({ attribute: false }) runs: readonly PinFlowRunEvidence[] = [];
  @property({ attribute: false }) settings: RunsWebviewSettings = { timeFormat: '24h' };

  static styles = css`
    :host {
      display: block;
      padding: 0 0 16px;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 8px;
    }
  `;

  render() {
    if (this.runs.length === 0) {
      return html`<pinflow-empty-state></pinflow-empty-state>`;
    }
    return html`
      <pinflow-runs-header .count=${this.runs.length}></pinflow-runs-header>
      <div class="list">
        ${repeat(
          this.runs,
          (run) => run.runId ?? run.summaryPath,
          (run, index) => html`
            <pinflow-run-card
              .run=${run}
              .timeFormat=${this.settings.timeFormat}
              .index=${index}
            ></pinflow-run-card>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-runs-app': PinflowRunsApp;
  }
}
```

- [ ] **Step 4: Tests for all three** (compact)

```ts
// pinflow-runs-app.spec.ts
import './pinflow-runs-app.js';
import { PinflowRunsApp } from './pinflow-runs-app.js';

describe('<pinflow-runs-app>', () => {
  it('renders empty-state when runs is empty', async () => {
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('pinflow-empty-state')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('pinflow-run-card')).toBeNull();
    el.remove();
  });

  it('renders one card per run', async () => {
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    el.runs = [
      { runId: 'r_1', summary: { status: 'processed' }, summaryPath: '/p1' } as never,
      { runId: 'r_2', summary: { status: 'failed' }, summaryPath: '/p2' } as never,
    ];
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('pinflow-run-card').length).toBe(2);
    el.remove();
  });

  it('renders 80 cards without throwing (stress test)', async () => {
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    el.runs = Array.from({ length: 80 }, (_, i) => ({
      runId: `r_${i}`,
      summary: { status: 'processed' },
      summaryPath: `/p${i}`,
    })) as never[];
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('pinflow-run-card').length).toBe(80);
    el.remove();
  });
});

// pinflow-runs-header.spec.ts
import './pinflow-runs-header.js';
import { PinflowRunsHeader } from './pinflow-runs-header.js';

describe('<pinflow-runs-header>', () => {
  it('renders singular for count of 1', async () => {
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.count = 1;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('1 run');
    expect(el.shadowRoot!.textContent).not.toContain('1 runs');
    el.remove();
  });

  it('renders plural for count of 0 or > 1', async () => {
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.count = 5;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('5 runs');
    el.remove();
  });
});

// pinflow-empty-state.spec.ts
import './pinflow-empty-state.js';
import { PinflowEmptyState } from './pinflow-empty-state.js';

describe('<pinflow-empty-state>', () => {
  it('renders the German copy', async () => {
    const el = document.createElement('pinflow-empty-state') as PinflowEmptyState;
    document.body.appendChild(el);
    await el.updateComplete;
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('Noch keine Runs');
    expect(text).toContain('Actions');
    el.remove();
  });
});
```

- [ ] **Step 5: Verify all webview tests + build**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx run pinflow-vscode:build:webview`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/runs-webview/components/
git commit -m "feat(vscode): add runs-app shell, header, and empty-state components"
```

---

## Phase 5 — Provider + Extension Wiring

### Task 10: `RunsWebviewProvider` (host-side)

**Files:**
- Create: `packages/pinflow-vscode/src/core/views/runs-webview-provider.ts`
- Create: `packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts`
- Modify: `packages/pinflow-vscode/src/vscode.d.ts` (add WebviewView, WebviewViewProvider stubs if missing)

- [ ] **Step 1: Extend `vscode.d.ts` minimally**

Add (only if not already present):

```ts
export interface WebviewView {
  readonly webview: Webview;
  readonly visible: boolean;
  readonly viewType: string;
  show(preserveFocus?: boolean): void;
  onDidDispose(listener: () => void, thisArgs?: unknown, disposables?: Disposable[]): Disposable;
}

export interface WebviewViewProvider {
  resolveWebviewView(
    webviewView: WebviewView,
    context: { readonly state: unknown },
    token: { readonly isCancellationRequested: boolean },
  ): void | Thenable<void>;
}

export interface Webview {
  html: string;
  options: { localResourceRoots?: readonly Uri[]; enableScripts?: boolean };
  readonly cspSource: string;
  asWebviewUri(localResource: Uri): Uri;
  postMessage(message: unknown): Thenable<boolean>;
  onDidReceiveMessage(
    listener: (message: unknown) => unknown,
    thisArgs?: unknown,
    disposables?: Disposable[],
  ): Disposable;
}

export namespace window {
  function registerWebviewViewProvider(
    viewType: string,
    provider: WebviewViewProvider,
    options?: { webviewOptions?: { retainContextWhenHidden?: boolean } },
  ): Disposable;
}
```

- [ ] **Step 2: Write the provider tests (TDD)**

```ts
// runs-webview-provider.spec.ts
import { vi } from 'vitest';
import { RunsWebviewProvider } from './runs-webview-provider.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';

function createMockWebview() {
  const messages: unknown[] = [];
  let messageHandler: ((m: unknown) => void) | null = null;
  const webview = {
    html: '',
    options: {},
    cspSource: 'vscode-webview://test',
    asWebviewUri: vi.fn((u: { fsPath: string }) => ({
      toString: () => `vscode-webview-uri:${u.fsPath}`,
    })),
    postMessage: vi.fn(async (m: unknown) => {
      messages.push(m);
      return true;
    }),
    onDidReceiveMessage: vi.fn(
      (handler: (m: unknown) => void) => {
        messageHandler = handler;
        return { dispose: vi.fn() };
      },
    ),
  };
  return {
    webview,
    messages,
    sendFromWebview: (m: unknown) => messageHandler?.(m),
  };
}

function createMockView(webview: ReturnType<typeof createMockWebview>['webview']) {
  return {
    webview,
    visible: true,
    viewType: 'pinflow.runs',
    show: vi.fn(),
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
  };
}

const sampleRun: PinFlowRunEvidence = {
  annotationId: 'ann_1',
  runId: 'r_1',
  summary: { status: 'processed' },
  summaryPath: '/repo/.pinflow/runs/r_1/summary.json',
  promptPath: '/repo/.pinflow/runs/r_1/prompt.md',
  transcriptPath: null,
  diffPath: null,
  hasDiff: false,
  changedFiles: [],
  additions: 0,
  deletions: 0,
};

describe('RunsWebviewProvider', () => {
  it('sets options.localResourceRoots and html on resolveWebviewView', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: { fsPath: '/ext' } as never,
      onOpenPrompt: vi.fn(),
      getCurrentRuns: () => [],
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined } as never, {
      isCancellationRequested: false,
    } as never);
    expect(wb.webview.options.enableScripts).toBe(true);
    expect(wb.webview.html).toContain('<!doctype html>');
    expect(wb.webview.html).toContain('Content-Security-Policy');
    expect(wb.webview.html).toContain('script-src');
  });

  it('does NOT post anything before webview signals ready', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: { fsPath: '/ext' } as never,
      onOpenPrompt: vi.fn(),
      getCurrentRuns: () => [sampleRun],
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined } as never, {
      isCancellationRequested: false,
    } as never);
    expect(wb.webview.postMessage).not.toHaveBeenCalled();
  });

  it('responds to webview:ready with init-ack containing runs and settings', async () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: { fsPath: '/ext' } as never,
      onOpenPrompt: vi.fn(),
      getCurrentRuns: () => [sampleRun],
      getCurrentSettings: () => ({ timeFormat: '12h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined } as never, {
      isCancellationRequested: false,
    } as never);
    wb.sendFromWebview({ type: 'webview:ready' });
    expect(wb.webview.postMessage).toHaveBeenCalledWith({
      type: 'webview:init-ack',
      runs: [sampleRun],
      settings: { timeFormat: '12h' },
    });
  });

  it('postRuns sends runs:update only after view is resolved', async () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: { fsPath: '/ext' } as never,
      onOpenPrompt: vi.fn(),
      getCurrentRuns: () => [sampleRun],
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.postRuns([sampleRun]); // view not resolved yet → no-op
    expect(wb.webview.postMessage).not.toHaveBeenCalled();

    provider.resolveWebviewView(view as never, { state: undefined } as never, {
      isCancellationRequested: false,
    } as never);
    provider.postRuns([sampleRun]);
    expect(wb.webview.postMessage).toHaveBeenCalledWith({
      type: 'runs:update',
      runs: [sampleRun],
    });
  });

  it('routes run:open-prompt messages to the onOpenPrompt callback', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const onOpenPrompt = vi.fn();
    const provider = new RunsWebviewProvider({
      extensionUri: { fsPath: '/ext' } as never,
      onOpenPrompt,
      getCurrentRuns: () => [sampleRun],
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined } as never, {
      isCancellationRequested: false,
    } as never);
    wb.sendFromWebview({ type: 'run:open-prompt', runId: 'r_1' });
    expect(onOpenPrompt).toHaveBeenCalledWith(sampleRun);
  });

  it('ignores malformed messages from the webview', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const onOpenPrompt = vi.fn();
    const provider = new RunsWebviewProvider({
      extensionUri: { fsPath: '/ext' } as never,
      onOpenPrompt,
      getCurrentRuns: () => [],
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });
    provider.resolveWebviewView(view as never, { state: undefined } as never, {
      isCancellationRequested: false,
    } as never);
    wb.sendFromWebview({ type: 'invalid' });
    wb.sendFromWebview('not an object');
    expect(onOpenPrompt).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Implement the provider**

```ts
// runs-webview-provider.ts
import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import {
  isWebviewToExtMessage,
  type ExtToWebviewMessage,
  type RunsWebviewSettings,
} from './runs-webview-messages.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';

export interface RunsWebviewProviderDeps {
  readonly extensionUri: vscode.Uri;
  readonly onOpenPrompt: (run: PinFlowRunEvidence) => void;
  readonly getCurrentRuns: () => readonly PinFlowRunEvidence[];
  readonly getCurrentSettings: () => RunsWebviewSettings;
}

export class RunsWebviewProvider implements vscode.WebviewViewProvider {
  private webviewView: vscode.WebviewView | null = null;
  private cachedRuns: readonly PinFlowRunEvidence[] = [];

  constructor(private readonly deps: RunsWebviewProviderDeps) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: { readonly state: unknown },
    _token: { readonly isCancellationRequested: boolean },
  ): void {
    this.webviewView = webviewView;
    const distRoot = vscode.Uri.joinPath(
      this.deps.extensionUri,
      'dist',
      'runs-webview',
    );
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [distRoot],
    };
    webviewView.webview.html = this.buildHtml(webviewView.webview, distRoot);

    webviewView.webview.onDidReceiveMessage((message) => {
      if (!isWebviewToExtMessage(message)) return;
      if (message.type === 'webview:ready') {
        void webviewView.webview.postMessage({
          type: 'webview:init-ack',
          runs: this.deps.getCurrentRuns(),
          settings: this.deps.getCurrentSettings(),
        } satisfies ExtToWebviewMessage);
      } else if (message.type === 'run:open-prompt') {
        const run = this.deps
          .getCurrentRuns()
          .find((r) => r.runId === message.runId);
        if (run) this.deps.onOpenPrompt(run);
      }
    });

    webviewView.onDidDispose(() => {
      this.webviewView = null;
    });
  }

  postRuns(runs: readonly PinFlowRunEvidence[]): void {
    this.cachedRuns = runs;
    if (!this.webviewView) return;
    void this.webviewView.webview.postMessage({
      type: 'runs:update',
      runs,
    } satisfies ExtToWebviewMessage);
  }

  postSettings(settings: RunsWebviewSettings): void {
    if (!this.webviewView) return;
    void this.webviewView.webview.postMessage({
      type: 'settings:update',
      settings,
    } satisfies ExtToWebviewMessage);
  }

  private buildHtml(webview: vscode.Webview, distRoot: vscode.Uri): string {
    const nonce = randomBytes(16).toString('base64');
    const mainJs = webview.asWebviewUri(
      vscode.Uri.joinPath(distRoot, 'main.js'),
    );
    const litJs = webview.asWebviewUri(vscode.Uri.joinPath(distRoot, 'lit.js'));
    const indexCss = webview.asWebviewUri(
      vscode.Uri.joinPath(distRoot, 'styles', 'theme.css'),
    );
    const codiconsCss = webview.asWebviewUri(
      vscode.Uri.joinPath(distRoot, 'codicon.css'),
    );
    const cspSource = webview.cspSource;
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' ${cspSource}; font-src ${cspSource}; img-src ${cspSource} data:;" />
    <link rel="stylesheet" href="${codiconsCss}" />
    <link rel="stylesheet" href="${indexCss}" />
  </head>
  <body>
    <pinflow-runs-app></pinflow-runs-app>
    <script type="module" nonce="${nonce}" src="${litJs}"></script>
    <script type="module" nonce="${nonce}" src="${mainJs}"></script>
  </body>
</html>`;
  }
}
```

- [ ] **Step 4: Add Codicons CSS+font to the bundle**

The codicons npm package ships `codicon.css` and `codicon.ttf` / `codicon.woff2`. They need to be copied into `dist/runs-webview/` so the webview can load them.

Two options — pick the simpler one in implementation:
- (a) Vite plugin to copy `node_modules/@vscode/codicons/dist/*` into `dist/runs-webview/` during build.
- (b) Add a `prebuild:webview` step in the Nx target that runs `cp node_modules/@vscode/codicons/dist/{codicon.css,codicon.ttf} packages/pinflow-vscode/dist/runs-webview/`.

Recommended: (a) via `vite-plugin-static-copy` — adds a small npm dep but cleaner Vite integration.

If neither path works cleanly, document the divergence and choose (b).

- [ ] **Step 5: Run tests + build**

Run: `corepack pnpm nx test pinflow-vscode && corepack pnpm nx run pinflow-vscode:build:webview`
Expected: PASS, ~6 new provider tests.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/src/core/views/runs-webview-provider.ts \
        packages/pinflow-vscode/src/core/views/runs-webview-provider.spec.ts \
        packages/pinflow-vscode/src/vscode.d.ts \
        packages/pinflow-vscode/vite.webview.config.ts \
        packages/pinflow-vscode/package.json \
        pnpm-lock.yaml
git commit -m "feat(vscode): add RunsWebviewProvider with handshake and message routing"
```

---

### Task 11: Wire provider into `extension.ts` + delete Tree-View code

**Files:**
- Modify: `packages/pinflow-vscode/src/extension.ts`
- Modify: `packages/pinflow-vscode/package.json` (view type tree → webview)
- Delete: `packages/pinflow-vscode/src/core/views/runs-view-model.ts`
- Delete: `packages/pinflow-vscode/src/core/views/runs-view-model.spec.ts`
- Delete: `packages/pinflow-vscode/src/core/views/group-runs-by-date.ts`
- Delete: `packages/pinflow-vscode/src/core/views/group-runs-by-date.spec.ts`

- [ ] **Step 1: Change `pinflow.runs` view type in `package.json`**

In `contributes.views.pinflow`, change the entry for `pinflow.runs`:

```jsonc
{
  "type": "webview",
  "id": "pinflow.runs",
  "name": "Runs"
}
```

(Add `"type": "webview"` if the entry doesn't have it; `tree` is the default.)

- [ ] **Step 2: Replace `RunsTreeDataProvider` with `RunsWebviewProvider` in `extension.ts`**

Remove the import and registration of `RunsTreeDataProvider`. Add:

```ts
import { RunsWebviewProvider } from './core/views/runs-webview-provider.js';

// inside activate(), replace the existing runsProvider declaration:
const runsWebviewProvider = new RunsWebviewProvider({
  extensionUri: context.extensionUri,
  getCurrentRuns: () => latestRunEvidence,
  getCurrentSettings: () => ({
    timeFormat: vscode.workspace
      .getConfiguration('pinflow')
      .get<'24h' | '12h'>('timeFormat', '24h'),
  }),
  onOpenPrompt: (run) => {
    if (run.promptPath) {
      void vscode.commands.executeCommand(
        'pinflow.openEvidenceFile',
        run.promptPath,
      );
    }
  },
});

context.subscriptions.push(
  vscode.window.registerWebviewViewProvider(
    'pinflow.runs',
    runsWebviewProvider,
    { webviewOptions: { retainContextWhenHidden: true } },
  ),
);
```

The `latestRunEvidence` is a module-level variable assigned in `refreshAll`:

```ts
let latestRunEvidence: readonly PinFlowRunEvidence[] = [];
// inside refreshAll, after the runEvidence array is built:
latestRunEvidence = runEvidence;
runsWebviewProvider.postRuns(runEvidence);
```

Replace the existing `runsProvider.setRoots(...)` call with the `postRuns` call. Remove all references to `RunsTreeDataProvider`, `buildRunsViewTree`, `expandTimelineMarker`, `RunsViewNode`, `RunsViewGroupNode`, `RunsViewRunNode`.

Also wire `vscode.workspace.onDidChangeConfiguration` to call `runsWebviewProvider.postSettings(...)` when `pinflow.timeFormat` changes:

```ts
context.subscriptions.push(
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('pinflow.timeFormat')) {
      runsWebviewProvider.postSettings({
        timeFormat: vscode.workspace
          .getConfiguration('pinflow')
          .get<'24h' | '12h'>('timeFormat', '24h'),
      });
    }
  }),
);
```

- [ ] **Step 3: Delete the four obsolete files**

```bash
git rm packages/pinflow-vscode/src/core/views/runs-view-model.ts
git rm packages/pinflow-vscode/src/core/views/runs-view-model.spec.ts
git rm packages/pinflow-vscode/src/core/views/group-runs-by-date.ts
git rm packages/pinflow-vscode/src/core/views/group-runs-by-date.spec.ts
```

- [ ] **Step 4: Update `extension.ts` imports**

Remove the imports for `buildRunsViewTree`, `expandTimelineMarker`, the runs-view-model types. Verify with `nx typecheck pinflow-vscode`.

- [ ] **Step 5: Run full quality gate**

Run: `corepack pnpm nx run-many -t test,build,lint -p pinflow-vscode`
Expected: green. Test count: 84 (current) − 19 (deleted) + ~22 (new) = ~87.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-vscode/package.json \
        packages/pinflow-vscode/src/extension.ts
git commit -m "feat(vscode): replace runs tree-view with webview provider"
```

---

## Phase 6 — End-to-end Verification

### Task 12: Build VSIX + manual smoke test

**Files:** none

- [ ] **Step 1: Rebuild the VSIX**

Run: `corepack pnpm --filter pinflow-vscode package:vsix`
Expected: `tmp/pinflow-vscode.vsix` overwritten. The packaged file should now include `dist/runs-webview/` (main.js, lit.js, index.html, theme.css, codicon.css, codicon.woff2).

- [ ] **Step 2: Install the new VSIX**

In a separate VS Code window, install via `Extensions: Install from VSIX...`. Reload.

- [ ] **Step 3: Smoke test 1 — empty state**

Open a configured PinFlow workspace with no runs yet. Click PinFlow Activity-Bar.
Expected: "Runs" view shows "Noch keine Runs. Workflow aus der Actions-Ansicht starten." with a small gold-ringed circle accent.

- [ ] **Step 4: Smoke test 2 — first card appears**

Trigger `PinFlow: Start Workflow`. Wait for the agent to complete (seconds to minutes). The card should appear within the next 3-second refresh tick after `summary.json` is written.
Expected: card with annotation-id (in coding font), time on the right, vertical gold hairline divider, summary text below, lifecycle pill bottom-right.

- [ ] **Step 5: Smoke test 3 — gold sweep on processed**

Trigger another run that completes successfully. Watch the card transition. When status flips to `processed`, observe the 600ms gold gradient sweep across the top edge.
Expected: visible, brief, not jarring. If unclear, slow down by editing `--pf-accent` opacity for verification then revert.

- [ ] **Step 6: Smoke test 4 — click target**

Click any card. Confirm `prompt.md` opens in the editor.

- [ ] **Step 7: Smoke test 5 — theme respect**

Switch VS Code theme to Default Light, Default Dark, High Contrast Dark, High Contrast Light (Settings → Color Theme). For each:
Expected: webview adapts. Card surface stays readable. Status pills use contrasting colors. In HC modes, accents come from `--vscode-contrastBorder` etc.

- [ ] **Step 8: Smoke test 6 — reduced motion**

In OS settings, enable "Reduce motion". Reload VS Code window.
Expected: cards appear instantly without stagger fade. Pulse on processing pill is suppressed. Hover-lift is suppressed. Gold sweep is suppressed.

- [ ] **Step 9: Smoke test 7 — settings update**

Change `pinflow.timeFormat` from `24h` to `12h`. Wait ≤ 3 s.
Expected: card times re-render in 12h format (e.g. `3:24 PM` instead of `15:24`).

- [ ] **Step 10: Smoke test 8 — bundle size sanity**

Check the build output of `nx run pinflow-vscode:build:webview` for the size breakdown. Total gzipped should be well under 150 KB.

- [ ] **Step 11: Final clean-state check**

Run: `git -C /home/domi/eventbaer/dev/pinflow status --porcelain`
Expected: empty.

Run: `git -C /home/domi/eventbaer/dev/pinflow log --oneline c7fe3ef..HEAD`
Expected: ~10–11 new commits matching the phases.

- [ ] **Step 12: No push, no release until user explicit approval**

Per the same convention as 3A.

---

## Quality Gate (run any time, mandatory before reporting completion)

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

All eight must be green. The webview build is the new gate — bundle-size guard inside it can fail builds independently of TypeScript errors.
