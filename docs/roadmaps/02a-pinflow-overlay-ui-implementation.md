# PinFlow Overlay UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current overlay into a visibly `PinFlow` working surface with German-first UI copy, while also making the repo-facing README clearly acknowledge that PinFlow is built on top of the original PinFlow foundation.

**Architecture:** This phase updates user-facing product language and light visual presentation only. Internal package scopes, runtime IDs, config file names, MCP namespaces, and CLI commands remain `pinflow` for compatibility.

**Tech Stack:** Lit web components, TypeScript, shared overlay theme tokens, Markdown docs

---

### Task 1: Tighten the phase-2 roadmap

**Files:**
- Modify: `docs/roadmaps/02-pinflow-overlay-ui.md`

- [ ] **Step 1: Add README/docs attribution scope**

Make the roadmap explicitly cover the paired README/docs update so the phase matches the agreed scope:

```md
- Add a matching README/docs note near the top that `PinFlow` is built on top of the original `PinFlow` foundation, with an upstream link
```

- [ ] **Step 2: Keep technical rename limits explicit**

Verify the roadmap still excludes:

- `@pinflow/*`
- `.pinflow/`
- MCP tool names
- CLI commands like `pinflow init`

Expected: Phase 2 stays product-facing, not structural.

### Task 2: Rebrand the overlay shell

**Files:**
- Modify: `packages/pinflow-overlay/src/components/ds-header.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-tab.ts`
- Modify: `packages/pinflow-overlay/src/styles/theme.ts`

- [ ] **Step 1: Swap visible brand text to PinFlow**

Replace the visible `pinflow` brand label in the overlay header with `PinFlow` and update close/open button labels to German.

- [ ] **Step 2: Align comments and theme notes with PinFlow where they are developer-facing and local to the overlay**

Do not rename tokens or package APIs, but make the overlay theme comments and visible shell feel like a PinFlow surface.

Expected: collapsed and expanded overlay surfaces visibly feel like PinFlow.

### Task 3: Translate the working surface

**Files:**
- Modify: `packages/pinflow-overlay/src/components/ds-sidebar.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-annotation-input.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-picker-overlay.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-element-preview.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-context-panel.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-tooltip.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-annotation-list.ts`
- Modify: `packages/pinflow-overlay/src/components/ds-annotation-item.ts`

- [ ] **Step 1: Translate all visible interaction labels to German**

Examples:

```text
Annotations -> Anmerkungen
Connected -> Verbunden
Disconnected -> Nicht verbunden
Describe the change you want... -> Beschreibe die gewuenschte Aenderung...
```

- [ ] **Step 2: Use neutral assistant wording**

Replace visible `Agent` labels with a product-neutral term such as `Assistent`, so the overlay works for both `Codex` and `Claude`.

- [ ] **Step 3: Keep the behavior intact**

Do not change the annotation lifecycle, selection flow, or relay logic in this phase.

Expected: the overlay is fully usable in German without changing how it works.

### Task 4: Clarify README positioning

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add explicit upstream acknowledgment near the top**

Add a short note high in the README that PinFlow is built from and on top of the original PinFlow codebase, with a direct link:

```md
> PinFlow is our productized adaptation of the original [PinFlow](https://github.com/patchorbit/pinflow) foundation.
```

- [ ] **Step 2: Keep setup instructions technically accurate**

Do not rename `npx pinflow init`, `@pinflow/*`, or `.pinflow`.

Expected: the README is honest about provenance while still reading like a PinFlow product page.

### Task 5: Verify phase 2

**Files:**
- Verify only

- [ ] **Step 1: Check git status**

Run:

```bash
git status --short
```

Expected: only intended phase-2 files changed.

- [ ] **Step 2: Check visible PinFlow/German overlay strings**

Run:

```bash
rg -n "PinFlow|Anmerkungen|Verbunden|Nicht verbunden|Beschreibe die gewünschte Änderung|Assistent" packages/pinflow-overlay/src README.md docs/roadmaps
```

Expected: visible overlay and README surfaces reflect the new language.

- [ ] **Step 3: Verify technical compatibility stays intact**

Run:

```bash
rg -n "@pinflow|\\.pinflow|pinflow init|pinflow\\." README.md packages package.json -S
```

Expected: technical `pinflow` names remain intact where compatibility depends on them.
