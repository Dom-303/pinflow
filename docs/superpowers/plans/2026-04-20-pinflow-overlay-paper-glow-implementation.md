# PinFlow Overlay Paper Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the PinFlow overlay into the approved `Paper Glow` design language while keeping the current `domscribe` technical foundation intact.

**Architecture:** The implementation stays inside the existing `@domscribe/overlay` package and focuses on visual presentation, hierarchy, and small wording refinements only. We will first lock the user-facing Paper Glow contract with component tests, then update shared theme tokens and component surfaces in layers: shell, input/focus surfaces, and annotation history surfaces.

**Tech Stack:** Lit web components, TypeScript, shared CSS custom properties in `theme.ts`, Vitest with `happy-dom`, Nx build/lint/test targets via `corepack pnpm`

---

### Task 1: Add a Paper Glow UI contract test

**Files:**
- Create: `packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts`
- Modify: `packages/domscribe-overlay/vite.config.ts` (only if the new spec needs explicit environment comments or setup; otherwise no code change)
- Test: `packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Write the failing test for visible Paper Glow text and structure**

```ts
/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { html, render } from 'lit';
import './ds-header.js';
import './ds-annotation-input.js';
import './ds-sidebar.js';

describe('Paper Glow UI contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders PinFlow branding in the header', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-header></ds-header>`, host);

    const header = host.querySelector('ds-header') as HTMLElement & {
      shadowRoot: ShadowRoot;
    };

    expect(header.shadowRoot.textContent).toContain('PinFlow');
    expect(header.shadowRoot.textContent).toContain('Schliessen');
  });

  it('renders German-first annotation input copy', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
    };
    const textarea = input.shadowRoot.querySelector('textarea');

    expect(textarea?.getAttribute('placeholder')).toBe(
      'Verbinde mit Relay...',
    );
  });
});
```

- [ ] **Step 2: Run the spec to verify the current code does not yet cover the new visual contract fully**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
```

Expected: FAIL initially because the test file is new and at least one assertion will need setup/mocking or implementation follow-up.

- [ ] **Step 3: Add minimal store mocking inside the spec so rendering is deterministic**

```ts
import { vi } from 'vitest';

vi.mock('../core/store-controller.js', () => ({
  StoreController: class {
    store = {
      setMode: vi.fn(),
      enterCaptureMode: vi.fn(),
      submitAnnotation: vi.fn().mockResolvedValue(undefined),
    };

    state = {
      selectedElement: null,
      annotations: [],
      relayConnected: false,
      mode: 'expanded',
      tabOffsetY: 50,
    };
  },
}));

vi.mock('../core/event-manager.js', () => ({
  EventManager: {
    getInstance: () => ({
      enableCapture: vi.fn(),
    }),
  },
}));
```

- [ ] **Step 4: Run the spec to verify it passes**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
```

Expected: PASS with 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts
git commit -m "test: add pinflow paper glow ui contract"
```

### Task 2: Refresh shared theme tokens and sidebar shell

**Files:**
- Modify: `packages/domscribe-overlay/src/styles/theme.ts`
- Modify: `packages/domscribe-overlay/src/components/ds-sidebar.ts`
- Modify: `packages/domscribe-overlay/src/components/ds-header.ts`
- Test: `packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Update theme tokens toward warm Paper Glow surfaces**

Replace the current dark-shell token block in `theme.ts` with a warm light foundation:

```ts
    --ds-bg-app: #f3efe8;
    --ds-bg-primary: #f7f3ec;
    --ds-bg-secondary: rgba(255, 251, 244, 0.86);
    --ds-bg-tertiary: #fffdfa;
    --ds-bg-hover: #f3ede4;
    --ds-bg-active: #ece4d8;

    --ds-text-primary: #312b25;
    --ds-text-secondary: #6f6458;
    --ds-text-tertiary: #8d8175;
    --ds-text-accent: #b27d4f;

    --ds-brand-primary: #c79564;
    --ds-brand-secondary: #b78253;
    --ds-brand-light: #e1bf98;

    --ds-highlight: rgba(199, 149, 100, 0.14);
    --ds-highlight-border: #c79564;
    --ds-highlight-glow: 0 0 26px rgba(215, 178, 127, 0.22);

    --ds-border-primary: #e7dfd2;
    --ds-border-secondary: #efe7dc;
    --ds-border-focus: #c79564;

    --ds-shadow-sm: 0 4px 10px rgba(92, 71, 48, 0.05);
    --ds-shadow-md: 0 10px 24px rgba(92, 71, 48, 0.08);
    --ds-shadow-lg: 0 18px 40px rgba(92, 71, 48, 0.10);
    --ds-shadow-xl: 0 28px 60px rgba(92, 71, 48, 0.12);

    --ds-radius-md: 12px;
    --ds-radius-lg: 18px;
```

- [ ] **Step 2: Run the UI contract spec to verify the token refactor did not break the render contract**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
```

Expected: PASS.

- [ ] **Step 3: Rebuild the sidebar shell and header around the new surface language**

Update `ds-sidebar.ts` and `ds-header.ts` styles so the shell feels like a soft paper workspace:

```ts
      :host {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 12px;
        right: 12px;
        bottom: 12px;
        width: var(--ds-sidebar-width);
        background:
          radial-gradient(circle at top right, rgba(245, 222, 192, 0.72), transparent 34%),
          linear-gradient(180deg, rgba(255, 252, 247, 0.96) 0%, rgba(246, 242, 234, 0.96) 100%);
        border: 1px solid var(--ds-border-primary);
        border-radius: 24px;
        box-shadow: var(--ds-shadow-xl);
        overflow: hidden;
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px 16px 12px;
      }

      .action-zone {
        gap: var(--ds-space-md);
        padding: 16px;
        background: rgba(255, 251, 244, 0.72);
        backdrop-filter: blur(12px);
        border-top: 1px solid rgba(231, 223, 210, 0.9);
      }
```

```ts
      :host {
        display: block;
        padding: 16px 16px 12px;
        background: rgba(255, 251, 244, 0.84);
        backdrop-filter: blur(12px);
      }

      .brand-name {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.03em;
      }

      .btn-icon:hover {
        background: rgba(215, 178, 127, 0.14);
      }
```

- [ ] **Step 4: Run lint and build for the overlay package**

Run:

```bash
corepack pnpm exec nx lint domscribe-overlay
corepack pnpm exec nx build domscribe-overlay
```

Expected: both commands succeed.

- [ ] **Step 5: Commit**

```bash
git add packages/domscribe-overlay/src/styles/theme.ts packages/domscribe-overlay/src/components/ds-sidebar.ts packages/domscribe-overlay/src/components/ds-header.ts
git commit -m "feat: add paper glow shell styling"
```

### Task 3: Redesign the annotation input and selected-element focus area

**Files:**
- Modify: `packages/domscribe-overlay/src/components/ds-annotation-input.ts`
- Modify: `packages/domscribe-overlay/src/components/ds-element-preview.ts`
- Modify: `packages/domscribe-overlay/src/components/ds-context-panel.ts`
- Test: `packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Extend the test to assert the input remains the primary visual workspace**

Append this test:

```ts
  it('keeps the annotation input as the primary action surface', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
    };

    expect(input.shadowRoot.textContent).toContain('Anmerkung senden');
    expect(input.shadowRoot.textContent).toContain('Mit Strg+Enter senden');
  });
```

- [ ] **Step 2: Run the focused spec to verify the new assertion fails before the redesign**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
```

Expected: FAIL because the input copy is present only in attributes and not yet surfaced strongly enough for the test contract.

- [ ] **Step 3: Implement the Paper Glow input shell and calmer element preview**

Update `ds-annotation-input.ts`:

```ts
      .input-wrapper {
        background: rgba(255, 253, 250, 0.92);
        border: 1px solid var(--ds-border-primary);
        border-radius: 20px;
        box-shadow: var(--ds-shadow-md);
        overflow: hidden;
        transition:
          border-color var(--ds-transition-fast),
          box-shadow var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      .input-wrapper:focus-within {
        border-color: var(--ds-border-focus);
        box-shadow:
          0 0 0 4px rgba(215, 178, 127, 0.12),
          var(--ds-shadow-lg);
        transform: translateY(-1px);
      }

      .action-bar {
        padding: 10px 14px 14px;
        border-top: 1px solid rgba(239, 231, 220, 0.92);
        background: linear-gradient(180deg, rgba(255, 253, 250, 0) 0%, rgba(250, 245, 237, 0.86) 100%);
      }

      .submit-btn {
        width: 34px;
        height: 34px;
        border-radius: 14px;
        box-shadow: 0 10px 20px rgba(199, 149, 100, 0.24);
      }
```

Update `ds-element-preview.ts`:

```ts
      :host {
        display: block;
        background: linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(252,248,241,0.92) 100%);
        border: 1px solid var(--ds-border-primary);
        border-radius: 18px;
        box-shadow: var(--ds-shadow-md);
        overflow: hidden;
      }

      .tag-name {
        color: #8e6844;
      }

      .component-name {
        color: var(--ds-text-secondary);
      }
```

Update `ds-context-panel.ts`:

```ts
      .section {
        padding-top: 10px;
        border-top: 1px solid rgba(231, 223, 210, 0.85);
      }

      .section-count {
        background: rgba(236, 228, 216, 0.72);
        color: var(--ds-text-secondary);
      }
```

- [ ] **Step 4: Run the focused spec, package lint, and package build**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
corepack pnpm exec nx lint domscribe-overlay
corepack pnpm exec nx build domscribe-overlay
```

Expected: all commands succeed.

- [ ] **Step 5: Commit**

```bash
git add packages/domscribe-overlay/src/components/ds-annotation-input.ts packages/domscribe-overlay/src/components/ds-element-preview.ts packages/domscribe-overlay/src/components/ds-context-panel.ts packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts
git commit -m "feat: redesign paper glow input surfaces"
```

### Task 4: Soften annotation history, assistant responses, and status treatment

**Files:**
- Modify: `packages/domscribe-overlay/src/components/ds-annotation-list.ts`
- Modify: `packages/domscribe-overlay/src/components/ds-annotation-item.ts`
- Modify: `packages/domscribe-overlay/src/components/ds-sidebar.ts`
- Test: `packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Add a failing test for calm status language and assistant rendering**

Append this test:

```ts
  it('uses calm German status and assistant wording in annotation cards', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-annotation-item
        .annotation=${{
          metadata: {
            id: 'ann_1',
            timestamp: new Date().toISOString(),
            status: 'processed',
          },
          interaction: {
            selectedElement: { tagName: 'BUTTON' },
          },
          context: {
            userMessage: 'Button kleiner machen',
            manifestSnapshot: [
              {
                file: 'src/components/Button.tsx',
                start: { line: 12, column: 1 },
              },
            ],
            runtimeContext: {},
          },
          agentResponse: {
            message: 'Button kompakter umgesetzt',
          },
        }}
      ></ds-annotation-item>`,
      host,
    );

    const item = host.querySelector('ds-annotation-item') as HTMLElement & {
      shadowRoot: ShadowRoot;
    };
    item.click();

    expect(item.shadowRoot.textContent).toContain('Erledigt');
    expect(item.shadowRoot.textContent).toContain('Assistent');
  });
```

- [ ] **Step 2: Run the focused spec to confirm the annotation card contract fails before styling cleanup**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
```

Expected: FAIL because the test needs annotation card support and the expanded-card interaction/setup will need refinement.

- [ ] **Step 3: Implement calmer annotation groups, note-like cards, and quieter status**

Update `ds-annotation-list.ts`:

```ts
      .status-group {
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.42);
        border: 1px solid rgba(233, 225, 212, 0.8);
      }

      .status-header {
        padding: 14px 16px;
        background: transparent;
      }

      .status-header:hover {
        background: rgba(243, 237, 228, 0.82);
      }
```

Update `ds-annotation-item.ts`:

```ts
      .card,
      .collapsed-row {
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid rgba(233, 225, 212, 0.88);
        border-radius: 18px;
        box-shadow: var(--ds-shadow-sm);
      }

      .agent-response {
        margin-top: var(--ds-space-sm);
        padding: 12px 14px;
        background: linear-gradient(180deg, rgba(250, 245, 237, 0.88) 0%, rgba(255, 252, 246, 0.92) 100%);
        border: 1px solid rgba(234, 224, 210, 0.95);
        border-radius: 16px;
      }

      .action-bar {
        gap: 6px;
        padding: 10px 14px;
        border-top: 1px solid rgba(239, 231, 220, 0.92);
      }

      .action-btn {
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(255, 251, 244, 0.78);
      }
```

Update `ds-sidebar.ts` status styling:

```ts
      .status-bar {
        justify-content: flex-start;
        padding-top: 4px;
        color: var(--ds-text-secondary);
      }

      .status-dot.connected {
        background: #b98a5b;
      }

      .status-dot.disconnected {
        background: #c7b8aa;
      }
```

- [ ] **Step 4: Run the focused spec and the package-wide test/lint/build checks**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
corepack pnpm exec nx test domscribe-overlay
corepack pnpm exec nx lint domscribe-overlay
corepack pnpm exec nx build domscribe-overlay
```

Expected: all commands succeed.

- [ ] **Step 5: Commit**

```bash
git add packages/domscribe-overlay/src/components/ds-annotation-list.ts packages/domscribe-overlay/src/components/ds-annotation-item.ts packages/domscribe-overlay/src/components/ds-sidebar.ts packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts
git commit -m "feat: soften paper glow annotation history"
```

### Task 5: Final integration pass, docs sync, and release-ready verification

**Files:**
- Modify: `docs/roadmaps/02-pinflow-overlay-ui.md`
- Modify: `docs/roadmaps/02a-pinflow-overlay-ui-implementation.md`
- Modify: `README.md` (only if Paper Glow wording needs a short note; otherwise no change)
- Verify: `packages/domscribe-overlay/src/**/*`

- [ ] **Step 1: Mark the Paper Glow design decision in the overlay roadmap docs**

Add a short note to the Phase 2 docs:

```md
- Approved visual direction: `Paper Glow` (`70% Notion / 30% Loop`)
- Implementation focus: warm light surfaces, soft shadows, calm hierarchy, gentle action glow
```

- [ ] **Step 2: Run the final verification suite from the repo root**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
corepack pnpm exec nx test domscribe-overlay
corepack pnpm exec nx lint domscribe-overlay
corepack pnpm exec nx build domscribe-overlay
git status --short
```

Expected:

- Vitest passes
- Nx test passes
- Nx lint passes
- Nx build passes
- `git status --short` shows only the intended Paper Glow implementation files

- [ ] **Step 3: Commit**

```bash
git add docs/roadmaps/02-pinflow-overlay-ui.md docs/roadmaps/02a-pinflow-overlay-ui-implementation.md README.md packages/domscribe-overlay/src
git commit -m "feat: ship pinflow paper glow overlay refresh"
```

