# PinFlow Technical Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current PinFlow fork into a technically reliable product line by fixing versioning, fixture installation, and preview reliability first, then aligning package/tooling surfaces, and finally evaluating deeper namespace migration.

**Architecture:** Execute the migration in three deliberate phases. Phase A fixes the technical identity and current-build preview path so local installs stop drifting back to stale Domscribe artifacts. Phase B aligns package metadata, tooling surfaces, and workflow docs with PinFlow. Phase C is an optional deeper namespace migration that only proceeds if the Phase A/B posture proves insufficient.

**Tech Stack:** Nx monorepo, pnpm, Verdaccio local registry, Vitest, TypeScript, Node scripts, PinFlow test fixtures, Markdown docs

---

### Task 1: Align roadmap docs with the approved technical migration

**Files:**
- Modify: `docs/roadmaps/04-pinflow-platform-evolution.md`
- Modify: `docs/roadmaps/05-pinflow-cleanup-plan.md`
- Test: `docs/superpowers/specs/2026-04-22-pinflow-technical-migration-design.md`
- Test: `docs/roadmaps/04-pinflow-platform-evolution.md`
- Test: `docs/roadmaps/05-pinflow-cleanup-plan.md`

- [ ] **Step 1: Update the platform roadmap so it no longer contradicts the new migration decision**

Replace the current `Now / Soon / Later` posture in `docs/roadmaps/04-pinflow-platform-evolution.md` with:

```md
## Now

- execute `Phase A` of the PinFlow technical migration
- make preview and fixture installs resolve current PinFlow builds reliably
- treat versioning, package exports, and local registry behavior as active product work

## Soon

- align package and tooling surfaces with PinFlow
- reduce visible `Domscribe` friction in daily development flows
- document the canonical PinFlow preview/install path

## Later

- decide whether deep namespace moves like `@pinflow/*` are worth the churn
- evaluate whether `.domscribe/` and MCP names should move with the product
- keep deep renames optional until evidence proves they are needed
```

- [ ] **Step 2: Update the cleanup roadmap so it defers cleanup until after the technical migration**

Add a short note near the top of `docs/roadmaps/05-pinflow-cleanup-plan.md`:

```md
## Migration Prerequisite

Before running cleanup aggressively, finish the technical migration phases that make PinFlow preview/install flows reliable. Cleanup should not erase clues or tooling that are still needed to stabilize the new PinFlow product line.
```

- [ ] **Step 3: Review both docs against the migration spec**

Check:

- roadmap `04` no longer says “avoid premature deep namespace changes” as if no migration is happening
- roadmap `05` still keeps cleanup last
- neither roadmap promises Phase C before Phase A is verified

- [ ] **Step 4: Commit**

```bash
git add docs/roadmaps/04-pinflow-platform-evolution.md docs/roadmaps/05-pinflow-cleanup-plan.md
git commit -m "docs: align platform roadmaps with pinflow migration"
```

### Task 2: Introduce a first-class PinFlow workspace identity and install stamp

**Files:**
- Create: `packages/domscribe-test-fixtures/shared/workspace-identity.ts`
- Create: `packages/domscribe-test-fixtures/shared/workspace-identity.spec.ts`
- Modify: `packages/domscribe-test-fixtures/shared/fixture-installer.ts`
- Test: `packages/domscribe-test-fixtures/shared/workspace-identity.spec.ts`

- [ ] **Step 1: Write the failing workspace-identity tests**

Create `packages/domscribe-test-fixtures/shared/workspace-identity.spec.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildInstallStampValue,
  getInstallStampFilename,
  parseWorkspaceIdentity,
} from './workspace-identity.js';

describe('workspace identity', () => {
  it('builds a pinflow-specific install stamp filename', () => {
    expect(getInstallStampFilename()).toBe('.pinflow-install-stamp');
  });

  it('parses the root package identity into product and version', () => {
    expect(
      parseWorkspaceIdentity({
        name: 'pinflow',
        version: '0.6.0-pinflow.0',
      }),
    ).toEqual({
      productSlug: 'pinflow',
      version: '0.6.0-pinflow.0',
    });
  });

  it('builds a stable install stamp value', () => {
    expect(
      buildInstallStampValue({
        productSlug: 'pinflow',
        version: '0.6.0-pinflow.0',
      }),
    ).toBe('pinflow@0.6.0-pinflow.0');
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-test-fixtures/shared/workspace-identity.spec.ts --config packages/domscribe-test-fixtures/vite.config.ts
```

Expected:

- FAIL because `workspace-identity.ts` does not exist yet

- [ ] **Step 3: Implement the minimal workspace identity helper**

Create `packages/domscribe-test-fixtures/shared/workspace-identity.ts` with:

```ts
export interface WorkspaceIdentity {
  productSlug: string;
  version: string;
}

export function parseWorkspaceIdentity(input: {
  name?: string;
  version?: string;
}): WorkspaceIdentity {
  return {
    productSlug: (input.name ?? 'pinflow').trim() || 'pinflow',
    version: (input.version ?? '0.0.0').trim() || '0.0.0',
  };
}

export function getInstallStampFilename(): string {
  return '.pinflow-install-stamp';
}

export function buildInstallStampValue(identity: WorkspaceIdentity): string {
  return `${identity.productSlug}@${identity.version}`;
}
```

- [ ] **Step 4: Refactor the fixture installer to use the new helper**

In `packages/domscribe-test-fixtures/shared/fixture-installer.ts`:

- replace `STAMP_FILENAME = '.domscribe-install-stamp'`
- stop comparing the stamp to raw version only
- read the root package identity through the new helper
- write the stamp as `pinflow@<version>`

The resulting core logic should look like:

```ts
const identity = readWorkspaceIdentity(workspaceRoot);
const stampValue = buildInstallStampValue(identity);

if (isCurrent(fixtureDir, stampValue)) {
  log(`Skipped (${stampValue} already installed)`);
  return { action: 'skipped' };
}

log(`Installing (${stampValue})...`);
```

- [ ] **Step 5: Run the focused test again**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-test-fixtures/shared/workspace-identity.spec.ts --config packages/domscribe-test-fixtures/vite.config.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add packages/domscribe-test-fixtures/shared/workspace-identity.ts packages/domscribe-test-fixtures/shared/workspace-identity.spec.ts packages/domscribe-test-fixtures/shared/fixture-installer.ts
git commit -m "feat: add pinflow workspace identity for fixture installs"
```

### Task 3: Move the repo to a real PinFlow version line

**Files:**
- Modify: `package.json`
- Modify: `packages/*/package.json`
- Modify: `scripts/sync-versions.mjs`
- Test: `package.json`
- Test: `packages/domscribe-overlay/package.json`

- [ ] **Step 1: Write a failing test or assertion target for the version posture**

Create a shell verification step:

```bash
node -e "const pkg=require('./package.json'); if(pkg.version !== '0.6.0-pinflow.0') process.exit(1)"
```

Expected before the change:

- FAIL because the root version is still `0.5.2`

- [ ] **Step 2: Move the root package to the first PinFlow version line**

In `package.json`, change:

```json
"name": "pinflow",
"version": "0.6.0-pinflow.0",
"description": "PinFlow is a visual UI-to-code workflow tool for marking running interfaces, queuing changes, and routing them into coding-agent workflows."
```

- [ ] **Step 3: Sync workspace package versions to the same product line**

Update the package version field across the published packages to:

```json
"version": "0.6.0-pinflow.0"
```

Do not rename every package scope yet. Keep `@domscribe/*` for now, but move their version line to the PinFlow release series.

- [ ] **Step 4: Update the post-version sync script to keep PinFlow plugin manifests aligned**

In `scripts/sync-versions.mjs`, keep the existing behavior but make sure it covers the currently retained plugin manifests and reports `PinFlow`-era versions without depending on old Cursor-specific assumptions.

- [ ] **Step 5: Verify the version posture**

Run:

```bash
node -e "const pkg=require('./package.json'); if(pkg.name !== 'pinflow' || pkg.version !== '0.6.0-pinflow.0') process.exit(1)"
node -e "const pkg=require('./packages/domscribe-overlay/package.json'); if(pkg.version !== '0.6.0-pinflow.0') process.exit(1)"
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add package.json packages/*/package.json scripts/sync-versions.mjs
git commit -m "chore: start the pinflow version line"
```

### Task 4: Fix local package export surfaces required by the preview flow

**Files:**
- Modify: `packages/domscribe-react/package.json`
- Modify: `packages/domscribe-transform/package.json`
- Modify: `packages/domscribe-overlay/project.json`
- Test: `packages/domscribe-react/package.json`
- Test: `packages/domscribe-transform/package.json`

- [ ] **Step 1: Add a failing resolution check for subpath exports**

Run:

```bash
node -e "import('@domscribe/react/vite').then(()=>process.exit(0)).catch(()=>process.exit(1))"
```

and

```bash
node -e "import('@domscribe/transform/plugins/vite').then(()=>process.exit(0)).catch(()=>process.exit(1))"
```

Expected before the fix:

- FAIL in the current local-package preview path

- [ ] **Step 2: Add the source-level export maps needed for local package consumption**

In `packages/domscribe-react/package.json`, add:

```json
"exports": {
  "./package.json": "./package.json",
  ".": {
    "types": "./src/index.ts",
    "import": "./src/index.ts",
    "default": "./src/index.ts"
  },
  "./vite": {
    "types": "./src/vite/index.ts",
    "import": "./src/vite/index.ts",
    "default": "./src/vite/index.ts"
  },
  "./webpack": {
    "types": "./src/webpack/index.ts",
    "import": "./src/webpack/index.ts",
    "default": "./src/webpack/index.ts"
  }
}
```

In `packages/domscribe-transform/package.json`, add matching source-level exports for:

- `./plugins/vite`
- `./plugins/webpack`
- `./plugins/turbopack`
- `./webpack-loader`
- `./turbopack-loader`

- [ ] **Step 3: Keep the overlay asset copying intact**

Preserve the existing asset-copy behavior in `packages/domscribe-overlay/project.json` so the PinFlow icon assets continue to land in `dist/`.

- [ ] **Step 4: Verify export resolution through the built packages**

Run:

```bash
corepack pnpm exec nx build domscribe-react domscribe-transform domscribe-overlay
node -e "import('./dist/packages/domscribe-react/vite/index.js').then(()=>console.log('ok'))"
node -e "import('./dist/packages/domscribe-transform/plugins/vite/index.js').then(()=>console.log('ok'))"
```

Expected:

- all commands succeed

- [ ] **Step 5: Commit**

```bash
git add packages/domscribe-react/package.json packages/domscribe-transform/package.json packages/domscribe-overlay/project.json
git commit -m "fix: expose pinflow preview exports for local packages"
```

### Task 5: Create the canonical PinFlow preview refresh flow

**Files:**
- Create: `scripts/pinflow-preview.mjs`
- Modify: `package.json`
- Modify: `README.md`
- Test: `scripts/pinflow-preview.mjs`

- [ ] **Step 1: Write the failing preview contract as a shell script expectation**

Define the desired flow:

```bash
node scripts/pinflow-preview.mjs --fixture vite-v5-react-18-ts --prepare-only
```

Expected after implementation:

- builds current packages
- publishes the current PinFlow version line to the local registry
- reinstalls the requested fixture
- prints the exact dev command to run or starts it directly

- [ ] **Step 2: Implement the orchestration script**

Create `scripts/pinflow-preview.mjs` with a sequence like:

```js
run('corepack pnpm exec nx local-registry');
run('corepack pnpm run registry:publish:only');
run(`FIXTURE_ID=${fixtureId} corepack pnpm exec tsx packages/domscribe-test-fixtures/scripts/install-fixture.ts`);
run(`corepack pnpm dev --host 0.0.0.0 --port ${port}`, { cwd: fixtureDir });
```

Use argument parsing only for:

- fixture id
- port
- `--prepare-only`

- [ ] **Step 3: Add package.json entrypoints**

In `package.json`, add scripts like:

```json
"pinflow:preview": "node scripts/pinflow-preview.mjs",
"pinflow:preview:vite-react": "node scripts/pinflow-preview.mjs --fixture vite-v5-react-18-ts --port 4301"
```

- [ ] **Step 4: Document the canonical preview path**

In `README.md`, add a short section:

```md
## Local Preview

Use `pnpm run pinflow:preview:vite-react` to build the current PinFlow packages, refresh the fixture install, and start the canonical local preview.
```

- [ ] **Step 5: Verify the preview flow end-to-end**

Run:

```bash
corepack pnpm run pinflow:preview:vite-react
curl -I http://localhost:4301/
```

Expected:

- the preview host responds `200 OK`
- the overlay shows current PinFlow branding rather than stale Domscribe UI

- [ ] **Step 6: Commit**

```bash
git add scripts/pinflow-preview.mjs package.json README.md
git commit -m "feat: add canonical pinflow preview flow"
```

### Task 6: Close Phase A with a reproducibility verification pass

**Files:**
- Test: `packages/domscribe-test-fixtures/shared/workspace-identity.spec.ts`
- Test: `packages/domscribe-overlay/src/core/dispatch-config.spec.ts`
- Test: `packages/domscribe-overlay/src/core/overlay-store.dispatch.spec.ts`
- Test: `packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts`

- [ ] **Step 1: Run the focused migration and overlay tests**

Run:

```bash
corepack pnpm exec vitest run packages/domscribe-test-fixtures/shared/workspace-identity.spec.ts --config packages/domscribe-test-fixtures/vite.config.ts
corepack pnpm exec vitest run packages/domscribe-overlay/src/core/dispatch-config.spec.ts packages/domscribe-overlay/src/core/overlay-store.dispatch.spec.ts packages/domscribe-overlay/src/components/paper-glow-ui.spec.ts --config packages/domscribe-overlay/vite.config.ts
```

- [ ] **Step 2: Run package-level lint and build**

Run:

```bash
corepack pnpm exec nx lint domscribe-overlay
corepack pnpm exec nx build domscribe-react domscribe-transform domscribe-overlay
```

- [ ] **Step 3: Run the canonical preview refresh flow one more time**

Run:

```bash
corepack pnpm run pinflow:preview:vite-react
curl -I http://localhost:4301/
```

Expected:

- `200 OK`
- current PinFlow UI visible in the fixture

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete phase a of the pinflow technical migration"
```

### Task 7: Execute Phase B package and tooling surface alignment

**Files:**
- Modify: `README.md`
- Modify: `.plugin/plugin.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: package metadata files that still surface old Domscribe wording

- [ ] **Step 1: Inventory visible PinFlow-vs-Domscribe leftovers**

Run:

```bash
rg -n "Domscribe|domscribe" README.md .plugin .claude-plugin .codex-plugin packages/*/package.json
```

- [ ] **Step 2: Remove product-facing leftovers that are now misleading**

Keep technical identifiers where needed, but update:

- descriptions
- preview commands
- workflow language
- product naming in manifests

- [ ] **Step 3: Verify docs and metadata consistency**

Check:

- README commands still work
- plugin manifests share the same PinFlow version line
- no obvious old product wording remains in normal onboarding paths

- [ ] **Step 4: Commit**

```bash
git add README.md .plugin/plugin.json .claude-plugin/plugin.json .codex-plugin/plugin.json packages/*/package.json
git commit -m "chore: align pinflow package and tooling surfaces"
```

### Task 8: Prepare the Phase C namespace decision as an explicit audit

**Files:**
- Create: `docs/superpowers/specs/2026-04-22-pinflow-namespace-audit.md`
- Test: `docs/roadmaps/04-pinflow-platform-evolution.md`

- [ ] **Step 1: Write the audit inventory**

Document:

- all remaining `@domscribe/*` scopes
- `.domscribe/` artifact uses
- CLI names
- MCP names
- why each one still exists after Phase A/B

- [ ] **Step 2: Decide what is product-visible versus purely technical**

For each remaining namespace use, mark:

- keep
- rename soon
- rename later
- never rename

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-22-pinflow-namespace-audit.md
git commit -m "docs: audit remaining domscribe namespaces"
```
