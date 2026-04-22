# PinFlow Theme And Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent manual theme system to PinFlow and prepare the queue/dispatch workflow so Light/Dark themes, channel selection, and queue behavior can evolve without redesigning the overlay.

**Architecture:** Implement this in two deliberate layers. First, extend the overlay shell with a stable theme model, persisted theme selection, and theme-aware assets. Second, add the UI and state contracts for dispatch modes, queue concurrency, project defaults, and session overrides before wiring in deeper provider automation.

**Tech Stack:** Lit web components, TypeScript, PinFlow overlay store/controller pattern, browser local persistence, Markdown roadmap docs

---

### Task 1: Codify the new product direction in roadmap docs

**Files:**
- Modify: `docs/roadmaps/02-pinflow-overlay-ui.md`
- Modify: `docs/roadmaps/03-pinflow-agent-workflow.md`
- Test: `docs/roadmaps/02-pinflow-overlay-ui.md`
- Test: `docs/roadmaps/03-pinflow-agent-workflow.md`

- [ ] **Step 1: Add theme-system scope to the overlay roadmap**

Document:

- `Light = Paper Glow`
- `Dark = deliberate companion theme`
- manual persistent switching
- theme-aware logos/assets

- [ ] **Step 2: Add dispatch/queue controls to the workflow roadmap**

Document:

- project defaults
- session overrides
- one active channel per session
- dispatch modes
- configurable concurrency
- auto-continuation modes

- [ ] **Step 3: Review the updated roadmaps for overlap and contradictions**

Check that:

- theme behavior stays in roadmap `02`
- queue/dispatch behavior stays in roadmap `03`
- no provider-specific implementation details leak into the roadmap prematurely

- [ ] **Step 4: Commit**

```bash
git add docs/roadmaps/02-pinflow-overlay-ui.md docs/roadmaps/03-pinflow-agent-workflow.md
git commit -m "docs: refine theme and dispatch roadmaps"
```

### Task 2: Add theme state as a first-class overlay concept

**Files:**
- Modify: `packages/pinflow-overlay/src/core/overlay-store.ts`
- Modify: `packages/pinflow-overlay/src/core/store-controller.ts`
- Modify: `packages/pinflow-overlay/src/styles/theme.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-sidebar.ts`
- Test: `packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Define a stable theme enum/type and state fields**

Add a product-facing theme model that supports:

- `light`
- `dark`

Include:

- current theme
- setter action
- initialization path

- [ ] **Step 2: Persist the selected theme locally**

Use a local persistence mechanism so the chosen theme survives reloads and restarts.

Persist only the intended user preference, not transient UI noise.

- [ ] **Step 3: Split theme tokens into light/dark variants**

Refactor `theme.ts` so theme tokens can switch modes without duplicating component structure.

Keep the current Paper Glow system as the `light` source of truth.

- [ ] **Step 4: Expose a small manual theme toggle in the sidebar shell**

Add a compact UI control that switches themes without overwhelming the main annotation flow.

- [ ] **Step 5: Verify**

Run:

```bash
corepack pnpm exec vitest run packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts --config packages/pinflow-overlay/vite.config.ts
corepack pnpm exec nx lint pinflow-overlay
corepack pnpm exec nx build pinflow-overlay
```

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-overlay/src/core/overlay-store.ts packages/pinflow-overlay/src/core/store-controller.ts packages/pinflow-overlay/src/styles/theme.ts packages/pinflow-overlay/src/components/ds-sidebar.ts
git commit -m "feat: add persistent overlay theme selection"
```

### Task 3: Prepare theme-aware branding assets

**Files:**
- Modify: `packages/pinflow-overlay/src/components/logo/index.ts`
- Modify: `packages/pinflow-overlay/src/components/logo/logo-svg.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-header.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-tab.ts`
- Test: `packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Define a theme-aware logo selection path**

The logo layer should be able to choose between:

- light asset/variant
- dark asset/variant

without forcing the rest of the shell to know asset internals.

- [ ] **Step 2: Wire the active overlay theme into the logo rendering path**

The header and collapsed tab should both render the correct variant for the active theme.

- [ ] **Step 3: Keep graceful fallbacks**

If final brand assets are not yet available, keep the current vector system as a fallback path.

- [ ] **Step 4: Verify**

Run:

```bash
corepack pnpm exec vitest run packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts --config packages/pinflow-overlay/vite.config.ts
corepack pnpm exec nx lint pinflow-overlay
corepack pnpm exec nx build pinflow-overlay
```

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-overlay/src/components/logo/index.ts packages/pinflow-overlay/src/components/logo/logo-svg.ts packages/pinflow-overlay/src/components/ds-header.ts packages/pinflow-overlay/src/components/ds-tab.ts
git commit -m "feat: support theme-aware pinflow branding"
```

### Task 4: Introduce the queue and dispatch settings model

**Files:**
- Modify: `packages/pinflow-overlay/src/core/overlay-store.ts`
- Modify: `packages/pinflow-overlay/src/core/store-controller.ts`
- Modify: `packages/pinflow-overlay/src/services/relay-service.ts`
- Create: `packages/pinflow-overlay/src/core/dispatch-config.ts`
- Test: `packages/pinflow-overlay/src/core/dispatch-config.ts`

- [ ] **Step 1: Define the configuration model**

Create a focused configuration module that models:

- project defaults
- session overrides
- active channel
- dispatch mode
- threshold size
- concurrency
- auto-continuation mode

- [ ] **Step 2: Keep one active channel per session**

Support:

- `codex`
- `claude`
- `queue_only`

without allowing per-annotation channel fragmentation in the first version.

- [ ] **Step 3: Define concurrency and batch defaults**

Include:

- concurrency range `1..10`
- default `3`
- threshold values for automatic send

- [ ] **Step 4: Separate state from execution**

Do not implement deep provider delivery yet.

Instead, create a clean state contract that later dispatch workers can consume safely.

- [ ] **Step 5: Verify**

Run the focused tests plus overlay verification.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-overlay/src/core/dispatch-config.ts packages/pinflow-overlay/src/core/overlay-store.ts packages/pinflow-overlay/src/core/store-controller.ts packages/pinflow-overlay/src/services/relay-service.ts
git commit -m "feat: add queue and dispatch configuration model"
```

### Task 5: Add compact workflow controls to the sidebar

**Files:**
- Modify: `packages/pinflow-overlay/src/components/ds-sidebar.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-annotation-input.ts`
- Create: `packages/pinflow-overlay/src/components/ds-workflow-panel.ts`
- Create: `packages/pinflow-overlay/src/components/ds-session-settings.ts`
- Test: `packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Add a small workflow panel to the main sidebar**

It should show the constantly relevant controls:

- active channel
- dispatch mode
- queue summary
- send/pause/continue action

- [ ] **Step 2: Move deeper knobs into a session/settings surface**

The secondary settings area should handle:

- threshold
- concurrency
- auto-continuation mode
- session-only overrides

- [ ] **Step 3: Keep the annotation composition area calm**

Do not let configuration controls dominate the primary "mark and write" workflow.

- [ ] **Step 4: Verify**

Run:

```bash
corepack pnpm exec vitest run packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts --config packages/pinflow-overlay/vite.config.ts
corepack pnpm exec nx lint pinflow-overlay
corepack pnpm exec nx build pinflow-overlay
```

- [ ] **Step 5: Commit**

```bash
git add packages/pinflow-overlay/src/components/ds-sidebar.ts packages/pinflow-overlay/src/components/ds-annotation-input.ts packages/pinflow-overlay/src/components/ds-workflow-panel.ts packages/pinflow-overlay/src/components/ds-session-settings.ts
git commit -m "feat: add sidebar workflow and session controls"
```

### Task 6: Implement queue progression rules without deep provider coupling

**Files:**
- Modify: `packages/pinflow-overlay/src/core/overlay-store.ts`
- Modify: `packages/pinflow-overlay/src/services/relay-service.ts`
- Test: `packages/pinflow-overlay/src/core/dispatch-config.ts`
- Test: `packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Implement send-mode behavior**

Support:

- manual collection
- immediate send
- automatic threshold send

- [ ] **Step 2: Implement batch progression behavior**

Support:

- manual send
- confirm before each batch
- fully automatic continuation

- [ ] **Step 3: Respect queue backpressure**

Do not exceed the configured active concurrency.

When work completes, only release more items if the current mode allows it.

- [ ] **Step 4: Keep the queue locally inspectable**

Make sure waiting, active, and completed work remain understandable in local state.

- [ ] **Step 5: Verify**

Run overlay verification plus focused queue-behavior tests.

- [ ] **Step 6: Commit**

```bash
git add packages/pinflow-overlay/src/core/overlay-store.ts packages/pinflow-overlay/src/services/relay-service.ts packages/pinflow-overlay/src/core/dispatch-config.ts packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts
git commit -m "feat: add configurable queue progression behavior"
```

### Task 7: Finish docs and adoption guidance

**Files:**
- Modify: `README.md`
- Modify: `docs/roadmaps/03-pinflow-agent-workflow.md`
- Modify: `docs/roadmaps/04-pinflow-platform-evolution.md`
- Test: `README.md`

- [ ] **Step 1: Document theme behavior**

Explain:

- manual toggle
- persistence
- theme-aware assets

- [ ] **Step 2: Document workflow behavior**

Explain:

- project defaults
- session overrides
- active channel per session
- dispatch modes
- queue concurrency

- [ ] **Step 3: Keep compatibility disclaimers intact**

Do not imply that the technical `pinflow` namespace has already been renamed.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/roadmaps/03-pinflow-agent-workflow.md docs/roadmaps/04-pinflow-platform-evolution.md
git commit -m "docs: document theme and dispatch behavior"
```
