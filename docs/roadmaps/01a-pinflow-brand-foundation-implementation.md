# PinFlow Brand Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the fork visibly to `PinFlow`, remove Cursor-first surfaces, and keep the internal `pinflow` technical foundation intact.

**Architecture:** This phase only changes outward-facing product identity and repo metadata. Internal package scopes, CLI names, MCP namespaces, and artifact folder names remain unchanged so the fork stays compatible with upstream architecture and future merges.

**Tech Stack:** Markdown docs, JSON plugin manifests, GitHub repository metadata, git remotes

---

### Task 1: Tighten the phase-1 roadmap

**Files:**
- Modify: `docs/roadmaps/01-pinflow-brand-foundation.md`

- [ ] **Step 1: Add explicit GitHub and Cursor scope to the roadmap**

Add visible rename scope for the branded fork and cursor removal so the roadmap matches the actual work:

```md
- Rename the GitHub fork presentation to `PinFlow`
- Point visible repo links at the branded fork instead of upstream Patch Orbit URLs where appropriate
- Remove Cursor-specific plugin/marketplace surfaces from the fork
```

- [ ] **Step 2: Confirm phase-1 keeps technical namespaces intact**

Verify the roadmap still explicitly excludes:

- `@pinflow/*`
- `.pinflow/`
- MCP tool namespaces
- CLI command names

Expected: those internal names remain deferred to later phases.

### Task 2: Rebrand visible repo metadata

**Files:**
- Modify: `AGENTS.md`
- Modify: `.codex-plugin/plugin.json`
- Modify: `.plugin/plugin.json`
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Update visible naming to PinFlow**

Replace visible `PinFlow` product references with `PinFlow` in onboarding/meta files while keeping technical `pinflow` internals where needed.

- [ ] **Step 2: Update descriptions toward the new product**

Use wording aligned to the product direction:

```text
PinFlow is a visual review and change workflow for live web apps, built on top of the PinFlow source-mapped runtime foundation.
```

- [ ] **Step 3: Point repo links at the branded fork**

Update visible `homepage` / `repository` URLs to the branded GitHub repo once renamed.

Expected: metadata surfaces present `PinFlow` first.

### Task 3: Rebrand the README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace visible title and hero naming**

Update the README hero from `PinFlow` to `PinFlow` and include the claim:

```md
<h1 align="center">PinFlow</h1>
<p align="center"><strong>Pin it, flow it, ship it.</strong></p>
```

- [ ] **Step 2: Re-focus agent messaging**

Adjust the visible README framing so `Codex` and `Claude` are the primary named paths, while keeping the tool generally MCP-compatible.

- [ ] **Step 3: Remove Cursor-first marketing surfaces**

Remove Cursor badges, install blocks, and plugin references from the README.

- [ ] **Step 4: Keep technical setup examples intact**

Do not rename package imports such as `@pinflow/react` or config examples such as `pinflow()`.

Expected: the README reads like a PinFlow product page built on a PinFlow technical core.

### Task 4: Remove Cursor plugin surfaces from the fork

**Files:**
- Delete: `.cursor-plugin/plugin.json`
- Delete: `.cursor-plugin/marketplace.json`

- [ ] **Step 1: Remove the Cursor plugin manifest**

Delete the Cursor plugin manifest from the fork.

- [ ] **Step 2: Remove the Cursor marketplace file**

Delete the Cursor marketplace file from the fork.

- [ ] **Step 3: Verify no first-class Cursor surface remains**

Search for `Cursor` in the repo-facing metadata and README.

Run: `rg -n "Cursor|cursor.directory" README.md .plugin .claude-plugin .codex-plugin AGENTS.md docs/roadmaps`

Expected: no primary product surface still promotes Cursor.

### Task 5: Rename the GitHub repo and sync remotes

**Files:**
- Modify: git remote config

- [ ] **Step 1: Rename the GitHub fork**

Rename the GitHub fork from `Dom-303/pinflow` to `Dom-303/pinflow`.

- [ ] **Step 2: Update local remotes**

Ensure local `origin` points to the renamed fork and `upstream` still points to `patchorbit/pinflow`.

Run:

```bash
git remote -v
```

Expected:

```text
origin   git@github.com:Dom-303/pinflow.git
upstream https://github.com/patchorbit/pinflow.git
```

### Task 6: Verify phase 1

**Files:**
- Verify only

- [ ] **Step 1: Check git status**

Run:

```bash
git status --short
```

Expected: only intended PinFlow brand-foundation files changed.

- [ ] **Step 2: Check visible PinFlow naming**

Run:

```bash
rg -n "PinFlow|Pin it, flow it, ship it" README.md AGENTS.md .plugin .claude-plugin .codex-plugin docs/roadmaps
```

Expected: visible product surfaces now lead with PinFlow.

- [ ] **Step 3: Check technical namespace preservation**

Run:

```bash
rg -n "@pinflow|\\.pinflow|pinflow\\(" README.md package.json packages -S
```

Expected: technical namespace is still intact for compatibility.
