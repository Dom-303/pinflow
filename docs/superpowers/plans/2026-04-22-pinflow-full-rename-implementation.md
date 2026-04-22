# PinFlow Full Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the full Domscribe-to-PinFlow migration in controlled waves until PinFlow becomes the complete technical and product identity of the repo.

**Architecture:** Treat the rename as a compatibility migration, not a cosmetic sweep. Move public contracts first, then runtime and persistent state, then repo internals, while preserving temporary aliases and verifying preview, fixtures, MCP, and workspace migration at every wave.

**Tech Stack:** Nx monorepo, pnpm, TypeScript, Vitest, Verdaccio, MCP, Fastify relay, Lit overlay, framework adapters, fixture installers, Markdown docs

## Execution Policy

- Do not start the next task until the current task has passed its stated verification.
- If a verification step fails, debug and repair in the current task instead of pushing uncertainty forward.
- Keep compatibility layers explicit. Never silently replace an old contract with a new one without either an alias or a documented breaking-wave decision.
- Prefer one coherent migration commit per task over giant mixed commits.

## Stop Conditions

Pause the migration and open a focused repair sub-plan if any of these happen:

- the canonical preview starts resolving stale or non-PinFlow output again
- fixture installation stops consuming the current workspace build
- MCP clients can no longer connect through the documented preferred path
- local artifact migration risks losing existing annotations, manifests, or queue state
- workspace renames create graph or path ambiguity that hides whether failures are naming or behavior regressions

---

### Task 1: Lock The Migration Baseline

**Files:**
- Modify: `docs/superpowers/specs/2026-04-22-pinflow-namespace-audit.md`
- Modify: `docs/roadmaps/04-pinflow-platform-evolution.md`
- Modify: `docs/roadmaps/05-pinflow-cleanup-plan.md`
- Test: `README.md`
- Test: `docs/superpowers/specs/2026-04-22-pinflow-full-rename-design.md`

- [ ] **Step 1: Update the platform roadmap so the full rename is now an explicit destination**

Add a new section to `docs/roadmaps/04-pinflow-platform-evolution.md`:

```md
## Full Rename Destination

PinFlow is no longer targeting a permanent hybrid state. The long-term destination is a complete technical and product migration away from public `domscribe` naming, executed in controlled compatibility waves.
```

- [ ] **Step 2: Update the cleanup roadmap so it follows the full rename waves**

Add to `docs/roadmaps/05-pinflow-cleanup-plan.md`:

```md
## Post-Rename Cleanup

Cleanup must now follow the full PinFlow rename waves. Deprecated `domscribe` aliases, paths, and docs should only be removed after the new PinFlow-native contracts are verified in real preview, fixture, and MCP flows.
```

- [ ] **Step 3: Add a migration-status section to the namespace audit**

Append a section to `docs/superpowers/specs/2026-04-22-pinflow-namespace-audit.md`:

```md
## Full Rename Status

The repo is now entering full-rename planning. This audit remains the source of truth for:

- what is still compatibility-only
- what moves in the next migration wave
- what is not yet safe to rename
```

- [ ] **Step 4: Verify the baseline docs are aligned**

Run:

```bash
rg -n "full rename|complete technical and product migration|Post-Rename Cleanup" docs/roadmaps docs/superpowers/specs
```

Expected:

- matching hits in the roadmap and audit docs

- [ ] **Step 5: Commit**

```bash
git add docs/roadmaps/04-pinflow-platform-evolution.md docs/roadmaps/05-pinflow-cleanup-plan.md docs/superpowers/specs/2026-04-22-pinflow-namespace-audit.md
git commit -m "docs: establish full pinflow rename baseline"
```

### Task 2: Introduce PinFlow-Native Package Scope Aliases

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.base.json`
- Modify: `packages/domscribe-*/package.json`
- Create: `packages/pinflow-compat/README.md`
- Test: `tsconfig.base.json`
- Test: `packages/domscribe-react/package.json`
- Test: `packages/domscribe-transform/package.json`

- [ ] **Step 1: Write a failing scope verification check**

Run:

```bash
node -e "const fs=require('fs'); const text=fs.readFileSync('tsconfig.base.json','utf8'); if(!text.includes('@pinflow/react')) process.exit(1)"
```

Expected:

- FAIL because `@pinflow/*` aliases do not exist yet

- [ ] **Step 2: Add parallel PinFlow path aliases to `tsconfig.base.json`**

For each current `@domscribe/*` alias, add a matching `@pinflow/*` alias pointing to the same current source path. For example:

```json
"@pinflow/core": ["packages/domscribe-core/src/index.ts"],
"@pinflow/core/*": ["packages/domscribe-core/src/*"],
"@pinflow/react": ["packages/domscribe-react/src/index.ts"],
"@pinflow/react/*": ["packages/domscribe-react/src/*"]
```

- [ ] **Step 3: Add PinFlow package metadata aliases in package docs or release notes staging**

Create `packages/pinflow-compat/README.md` with:

```md
# PinFlow Compatibility Map

During the full rename migration, PinFlow-native package aliases map onto the current compatibility packages:

- `@pinflow/core` -> `@domscribe/core`
- `@pinflow/react` -> `@domscribe/react`
- `@pinflow/vue` -> `@domscribe/vue`
- `@pinflow/transform` -> `@domscribe/transform`
- `@pinflow/runtime` -> `@domscribe/runtime`
- `@pinflow/overlay` -> `@domscribe/overlay`
- `@pinflow/relay` -> `@domscribe/relay`
- `@pinflow/mcp` -> `@domscribe/mcp`
```

- [ ] **Step 4: Verify the new alias layer exists**

Run:

```bash
node -e "const fs=require('fs'); const text=fs.readFileSync('tsconfig.base.json','utf8'); ['@pinflow/core','@pinflow/react','@pinflow/transform','@pinflow/mcp'].forEach(k=>{ if(!text.includes(k)) process.exit(1);}); console.log('pinflow aliases ok')"
```

Expected:

- `pinflow aliases ok`

- [ ] **Step 5: Commit**

```bash
git add tsconfig.base.json packages/pinflow-compat/README.md
git commit -m "feat: add pinflow package scope aliases"
```

### Task 3: Make PinFlow The Canonical CLI Package Identity

**Files:**
- Modify: `packages/domscribe-cli/package.json`
- Modify: `packages/domscribe-cli/README.md`
- Modify: `packages/domscribe-cli/src/bin/domscribe.ts`
- Modify: `packages/domscribe-cli/src/bin/pinflow.ts`
- Test: `packages/pinflow-test-fixtures/shared/pinflow-cli-aliases.spec.ts`

- [ ] **Step 1: Write the failing CLI identity check**

Run:

```bash
node -e "const pkg=require('./packages/domscribe-cli/package.json'); if(pkg.name !== 'pinflow') process.exit(1)"
```

Expected:

- FAIL because the CLI package is still named `domscribe`

- [ ] **Step 2: Rename the CLI package identity to PinFlow**

In `packages/domscribe-cli/package.json`, change:

```json
"name": "pinflow"
```

Keep compatibility bin output:

```json
"distBin": {
  "domscribe": "./bin/domscribe.js",
  "pinflow": "./bin/pinflow.js"
}
```

- [ ] **Step 3: Update the CLI README so PinFlow is the install identity**

Replace install examples with:

```md
## Install

```bash
npm install -g pinflow
```

Compatibility alias:

```bash
domscribe
```
```

- [ ] **Step 4: Keep the compatibility shim explicit in the old binary**

In `packages/domscribe-cli/src/bin/domscribe.ts`, ensure the file remains a compatibility entry and add a top comment:

```ts
// Compatibility CLI alias for the PinFlow package identity.
```

- [ ] **Step 5: Verify the CLI contract**

Run:

```bash
corepack pnpm exec vitest run packages/pinflow-test-fixtures/shared/pinflow-cli-aliases.spec.ts --config packages/pinflow-test-fixtures/vite.config.ts
corepack pnpm exec nx build domscribe-cli
node -e "const pkg=require('./packages/domscribe-cli/package.json'); if(pkg.name !== 'pinflow') process.exit(1)"
```

Expected:

- tests green
- build green

- [ ] **Step 6: Commit**

```bash
git add packages/domscribe-cli/package.json packages/domscribe-cli/README.md packages/domscribe-cli/src/bin/domscribe.ts packages/domscribe-cli/src/bin/pinflow.ts
git commit -m "feat: make pinflow the canonical cli package"
```

### Task 4: Make PinFlow The Canonical MCP Package Identity

**Files:**
- Modify: `packages/domscribe-mcp/package.json`
- Modify: `packages/domscribe-mcp/README.md`
- Modify: `.plugin/plugin.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `.mcp.json`
- Test: `packages/pinflow-test-fixtures/shared/pinflow-cli-aliases.spec.ts`

- [ ] **Step 1: Write the failing MCP identity check**

Run:

```bash
node -e "const pkg=require('./packages/domscribe-mcp/package.json'); if(pkg.name !== '@pinflow/mcp') process.exit(1)"
```

Expected:

- FAIL because the MCP package still uses `@domscribe/mcp`

- [ ] **Step 2: Rename the MCP package identity**

In `packages/domscribe-mcp/package.json`, change:

```json
"name": "@pinflow/mcp"
```

Keep binary compatibility:

```json
"distBin": {
  "domscribe-mcp": "./bin/domscribe-mcp.js",
  "pinflow-mcp": "./bin/pinflow-mcp.js"
}
```

- [ ] **Step 3: Update plugin manifests and local MCP configs**

Switch package-path references from `@domscribe/mcp` to `@pinflow/mcp`, and prefer `pinflow` as the MCP server key where config examples are PinFlow-owned.

Target example:

```json
"mcpServers": {
  "pinflow": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@pinflow/mcp"]
  }
}
```

- [ ] **Step 4: Keep a compatibility note in the MCP README**

Add:

```md
Compatibility note: `domscribe-mcp` remains as a temporary binary alias during the migration window.
```

- [ ] **Step 5: Verify the MCP package path shift**

Run:

```bash
node -e "const pkg=require('./packages/domscribe-mcp/package.json'); if(pkg.name !== '@pinflow/mcp') process.exit(1)"
node -e "const fs=require('fs'); const text=fs.readFileSync('.mcp.json','utf8'); if(!text.includes('@pinflow/mcp')) process.exit(1)"
corepack pnpm exec nx build domscribe-mcp
```

Expected:

- checks green

- [ ] **Step 6: Commit**

```bash
git add packages/domscribe-mcp/package.json packages/domscribe-mcp/README.md .plugin/plugin.json .claude-plugin/plugin.json .codex-plugin/plugin.json .mcp.json
git commit -m "feat: make pinflow the canonical mcp package"
```

### Task 5: Rename Framework-Facing Public APIs

**Files:**
- Modify: `packages/domscribe-next/src/index.ts`
- Modify: `packages/domscribe-react/src/vite/index.ts`
- Modify: `packages/domscribe-vue/src/vite/index.ts`
- Modify: `packages/domscribe-transform/src/plugins/vite/index.ts`
- Modify: framework README examples in `README.md` and package READMEs
- Test: relevant package specs for exports

- [ ] **Step 1: Introduce PinFlow-named aliases without removing old names**

Add exports like:

```ts
export { withDomscribe as withPinFlow };
export { domscribe as pinflow };
export { DomscribeWebpackPlugin as PinFlowWebpackPlugin };
```

- [ ] **Step 2: Switch product docs and examples to the new API names**

Root README and package READMEs should prefer:

```ts
import { withPinFlow } from '@pinflow/next';
import { pinflow } from '@pinflow/react/vite';
const { PinFlowWebpackPlugin } = require('@pinflow/react/webpack');
```

- [ ] **Step 3: Keep old names documented only as compatibility aliases**

Add short notes where needed:

```md
Compatibility aliases `withDomscribe`, `domscribe()`, and `DomscribeWebpackPlugin` remain temporarily available.
```

- [ ] **Step 4: Verify exports compile**

Run:

```bash
corepack pnpm exec nx build domscribe-next domscribe-react domscribe-vue domscribe-transform
```

Expected:

- build green with both old and new exported names

- [ ] **Step 5: Commit**

```bash
git add packages/domscribe-next/src/index.ts packages/domscribe-react/src/vite/index.ts packages/domscribe-vue/src/vite/index.ts packages/domscribe-transform/src/plugins/vite/index.ts README.md packages/domscribe-*/README.md
git commit -m "feat: add pinflow framework api aliases"
```

### Task 6: Rename MCP Tool And Server Namespace

**Files:**
- Modify: `packages/domscribe-relay/src/mcp/**/*`
- Modify: plugin manifests
- Modify: MCP prompt docs
- Test: `packages/domscribe-relay/src/mcp/**/*.spec.ts`

- [ ] **Step 1: Introduce PinFlow-first MCP namespace registration**

Register tools under a PinFlow namespace, for example:

```ts
pinflow.query.bySource
pinflow.manifest.query
pinflow.annotation.process
pinflow.status
```

Keep old `domscribe.*` registrations as temporary aliases if the current MCP framework allows dual registration.

- [ ] **Step 2: Switch all product-owned manifests and examples to the PinFlow namespace**

Any plugin-owned onboarding should prefer:

```json
"mcpServers": {
  "pinflow": { ... }
}
```

and PinFlow-named tool examples.

- [ ] **Step 3: Update MCP prompts to call the PinFlow tool names**

Prompt examples and internal guidance should use:

```md
Call `pinflow.query.bySource` ...
```

- [ ] **Step 4: Verify relay MCP behavior**

Run:

```bash
corepack pnpm exec nx test domscribe-relay
corepack pnpm exec nx build domscribe-relay
```

Expected:

- relay tests/build green

- [ ] **Step 5: Commit**

```bash
git add packages/domscribe-relay/src/mcp packages/domscribe-relay/src/cli .plugin/plugin.json .claude-plugin/plugin.json .codex-plugin/plugin.json
git commit -m "feat: introduce pinflow mcp namespace"
```

### Task 7: Migrate Persistent Artifact Names Safely

**Files:**
- Modify: runtime, relay, transform, fixture installer, config readers/writers
- Test: preview/install specs and workspace identity specs

- [ ] **Step 1: Introduce dual-read support for old and new artifact names**

Support both:

```txt
.domscribe/
.pinflow/
domscribe.config.json
pinflow.config.json
```

Read order should prefer new names but still fall back to old names.

- [ ] **Step 2: Write lazy migration logic**

On startup or first write:

- if only old artifact exists, migrate or mirror to the new PinFlow path
- if both exist, prefer the new path

- [ ] **Step 3: Rename install stamps and lock files to PinFlow-native names**

Examples:

```txt
.pinflow-install-stamp
.pinflow/manifest.jsonl
.pinflow/relay.lock
```

- [ ] **Step 4: Verify local state survives**

Run:

```bash
corepack pnpm exec vitest run packages/pinflow-test-fixtures/shared/workspace-identity.spec.ts --config packages/pinflow-test-fixtures/vite.config.ts
corepack pnpm exec tsx scripts/pinflow-preview.ts --fixture vite-v5-react-18-ts --port 4301 --prepare-only
```

Expected:

- old state remains readable
- new state is written under PinFlow-native paths

- [ ] **Step 5: Commit**

```bash
git add packages scripts README.md
git commit -m "feat: migrate pinflow local artifact paths"
```

### Task 8: Rename Repo Interior And Workspace Wiring

**Files:**
- Modify: `packages/` directory names
- Modify: `tsconfig.json`
- Modify: `tsconfig.base.json`
- Modify: `nx.json`
- Modify: all `project.json`
- Modify: all package references/scripts
- Test: workspace builds and tests

- [ ] **Step 1: Rename package directories and project names**

Move examples such as:

```txt
packages/domscribe-core      -> packages/pinflow-core
packages/domscribe-relay     -> packages/pinflow-relay
packages/domscribe-overlay   -> packages/pinflow-overlay
```

Update every matching `project.json` name and root/sourceRoot/outputPath.

- [ ] **Step 2: Rename TS path aliases and project references**

In `tsconfig.base.json`, switch from `@domscribe/*` entries to `@pinflow/*`.

In `tsconfig.json`, update all project references to the new directory names.

- [ ] **Step 3: Update scripts, generators, and fixture tooling**

Fix:

- workspace scripts in `package.json`
- any generator or fixture paths
- any hardcoded package folder references in scripts and docs

After the directory rename, run a fresh workspace install so pnpm rewrites any
workspace symlinks that still point at the old `packages/domscribe-*` paths:

```bash
corepack pnpm install
```

- [ ] **Step 4: Verify the workspace still builds**

Run:

```bash
corepack pnpm exec nx run-many -t build --exclude pinflow-test-fixtures
corepack pnpm exec nx run-many -t lint --exclude pinflow-test-fixtures
```

Expected:

- workspace builds/lints on renamed package graph

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json tsconfig.base.json nx.json packages scripts
git commit -m "refactor: rename workspace internals to pinflow"
```

### Task 9: Rebuild Fixture And Preview Pipeline On The New Identity

**Files:**
- Modify: `packages/pinflow-test-fixtures/**/*`
- Modify: preview scripts and registry helpers
- Test: canonical preview flow and selected fixture tests

- [ ] **Step 1: Rename fixture package identity and references**

Move the fixture package and project naming to PinFlow-native equivalents while keeping generated fixture behavior stable.

- [ ] **Step 2: Update the canonical preview script to consume only PinFlow-native outputs**

The preview path should no longer depend on old `domscribe` package identities or stale fixture naming.

- [ ] **Step 3: Verify the actual local preview**

Run:

```bash
corepack pnpm exec tsx scripts/pinflow-preview.ts --fixture vite-v5-react-18-ts --port 4301
```

Expected:

- current PinFlow UI appears
- no stale Domscribe-branded fixture shell appears

- [ ] **Step 4: Run the fixture test subset**

Run:

```bash
corepack pnpm exec nx test pinflow-test-fixtures
```

or the renamed equivalent once the project is moved.

- [ ] **Step 5: Commit**

```bash
git add packages scripts
git commit -m "feat: move fixtures and preview flow to pinflow identity"
```

### Task 10: Retire Compatibility Names In A Cleanup Window

**Files:**
- Modify: package docs, aliases, deprecated exports, manifests, cleanup plan
- Test: final build/test/preview run

- [ ] **Step 1: Remove deprecated public aliases only after all previous waves are green**

Candidates:

- `domscribe`
- `domscribe-mcp`
- `domscribe.*` MCP registrations
- `withDomscribe`
- `DomscribeWebpackPlugin`
- `domscribe()`

- [ ] **Step 2: Remove stale docs and migration notes that are no longer true**

Delete or rewrite text that says:

- “current compatibility layer”
- “domscribe alias remains available”

once that is no longer accurate.

- [ ] **Step 3: Run the final verification battery**

Run:

```bash
corepack pnpm exec nx run-many -t test,lint,build
corepack pnpm exec tsx scripts/pinflow-preview.ts --fixture vite-v5-react-18-ts --port 4301 --prepare-only
```

Expected:

- all core checks green
- canonical PinFlow preview path still works

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: retire domscribe compatibility aliases"
```

## Self-Review Notes

- This plan intentionally moves public contracts before repo interiors.
- It assumes temporary alias layers are cheaper than a one-shot hard break.
- It gives the highest-risk changes dedicated waves with explicit verification.
- It is designed so the project can stop after any wave and still remain coherent.
