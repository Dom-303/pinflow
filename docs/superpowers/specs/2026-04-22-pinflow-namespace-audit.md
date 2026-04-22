# PinFlow Namespace Audit

## Purpose

This audit captures the remaining `domscribe` namespace surfaces after Phase A and Phase B of the PinFlow technical migration.

The goal is not to rename everything immediately. The goal is to decide, with evidence, which namespace surfaces are:

- worth renaming soon
- better left for later
- safe to keep indefinitely

This keeps Phase C deliberate instead of emotional.

## Current Conclusion

PinFlow no longer needs a blind full-rename as the next move.

The current recommendation is:

- keep the deep technical compatibility layer intact for now
- rename only the highest-confusion surfaces in a later targeted pass
- avoid a one-shot move from `domscribe` to `pinflow` across packages, CLI, MCP, artifacts, and repo internals

Phase C should therefore begin as an audit and prioritization phase, not as a big-bang namespace rewrite.

## Decision Matrix

| Namespace surface | Examples | Visibility | Recommendation | Why |
| --- | --- | --- | --- | --- |
| npm package scopes | `@domscribe/react`, `@domscribe/overlay`, `@domscribe/mcp` | High for installers and docs | Rename later | Real users see them, but changing scope now would break install flows, fixture wiring, and all integration docs at once |
| CLI binary names | `domscribe`, `domscribe-mcp` | High | Rename soon | These are product-facing and create more confusion than internal folder names, but they need a compatibility and alias plan first |
| MCP server key and tool namespace | `domscribe` server key, `domscribe.query.bySource` | High | Rename later | Visible in agent setup, but changing it now would break plugin manifests and live workflows without enough gain yet |
| Artifact and config directory names | `.domscribe/`, `domscribe.config.json` | Medium | Rename later | Users can see them, but they are persistent state and migration-sensitive; they need an upgrade path, not a search-and-replace |
| Source-level API identifiers | `withDomscribe`, `DomscribeWebpackPlugin`, `domscribe()` Vite helpers | High for integrators | Rename later | Valuable to align eventually, but must be shipped with aliases or migration guidance to avoid breaking existing setups |
| Repo package and target names | `packages/domscribe-*`, `domscribe-test-fixtures`, Nx project names | Low outside contributors | Keep | These are internal repo mechanics; renaming them now adds churn with little user benefit |
| Demo fixture copy and labels | `Domscribe Tests`, fixture metadata, smoke test logs | Medium in local preview | Rename soon | These are visible in demo and preview flows and are one of the easiest ways to reduce perceived fork confusion |
| Historical attribution and origin references | links to `patchorbit/domscribe`, origin notes in docs | Medium | Keep | These are intentional provenance markers and should remain as attribution |
| Coverage/reporting artifact names | `domscribe-coverage.json`, report prefixes | Low to medium | Rename later | Useful cleanup, but not blocking product use or preview reliability |

## Remaining `@domscribe/*` Scope Inventory

The following package scopes still exist and are currently intentional:

- `@domscribe/core`
- `@domscribe/manifest`
- `@domscribe/relay`
- `@domscribe/runtime`
- `@domscribe/overlay`
- `@domscribe/react`
- `@domscribe/vue`
- `@domscribe/next`
- `@domscribe/nuxt`
- `@domscribe/transform`
- `@domscribe/mcp`
- `@domscribe/test-fixtures`

### Why they still exist

- Phase A fixed versioning, install stamps, and preview reproducibility without changing public package scope
- Phase B aligned product-facing wording while preserving the current install contract
- all framework examples, fixture apps, plugin manifests, and MCP setup still depend on these names

### Recommendation

Rename later, not now.

If scope renaming happens, it should be a dedicated migration with:

- dual-publish or alias strategy
- docs migration
- fixture migration
- plugin manifest migration
- explicit install-path verification

## Remaining `.domscribe/` Artifact Uses

Current artifact uses include:

- `.domscribe/annotations/`
- `.domscribe/manifest.jsonl`

### Why they still exist

- they are already part of the runtime and relay assumptions
- annotations and manifest files are persistent local state
- changing them without migration support would risk breaking local queues and live previews

### Recommendation

Rename later.

Any rename here should ship with:

- one-time migration or fallback lookup
- backward-compatible read path during transition
- updated cleanup guidance

## Remaining CLI Names

Current CLI names:

- `domscribe`
- `domscribe-mcp`

### Why they still exist

- they are the active compatibility entrypoints in package manifests and docs
- plugin manifests still resolve `@domscribe/mcp`
- they provide the least risky path while the product line stabilizes

### Recommendation

Rename soon, but only after a compatibility plan exists.

This is the strongest candidate for the first true Phase C implementation because the command line is highly product-visible and comparatively bounded.

Recommended migration shape:

- introduce `pinflow` and `pinflow-mcp`
- keep `domscribe` and `domscribe-mcp` as compatibility aliases for a while
- update README and plugin docs to prefer the new commands only after the aliases exist

## Remaining MCP Namespace Uses

Current MCP surfaces:

- plugin manifest server key: `domscribe`
- tool names like `domscribe.query.bySource`
- package install path `@domscribe/mcp`

### Why they still exist

- they are part of the current agent integration contract
- changing them now would ripple into every plugin manifest and workflow example
- the value is real, but the blast radius is larger than the immediate payoff

### Recommendation

Rename later.

This should be bundled with a real MCP compatibility transition, not done ahead of it.

## Remaining Source-Level API Names

Examples:

- `withDomscribe`
- `DomscribeWebpackPlugin`
- `domscribe()` plugin helper

### Why they still exist

- they are published integration APIs
- they appear throughout README examples and fixture apps
- renaming them now would turn a branding cleanup into a framework compatibility migration

### Recommendation

Rename later.

If we do this, the right move is:

- add `PinFlow`-named aliases first
- keep old names temporarily
- migrate docs and fixtures afterward

## Remaining Repo-Internal Names

Examples:

- `packages/domscribe-*`
- `domscribe-test-fixtures`
- Nx target and project names
- internal script references to those directories

### Why they still exist

- these are mostly contributor-facing, not end-user-facing
- they are deeply wired into the monorepo layout
- Phase A and B already solved the real product confusion without touching them

### Recommendation

Keep.

These only become worth renaming if:

- the repo is opened to a wider contributor base
- internal contributor confusion becomes a repeated problem
- package scope migration is already happening anyway

## Remaining Demo Fixture Branding

Examples found in fixtures:

- `Domscribe Tests`
- `Domscribe Test Fixture`
- smoke-test console labels like `[domscribe]`

### Why they still exist

- fixtures began as upstream test assets
- they were not required to solve preview correctness in Phase A
- they are now one of the most visible remaining sources of “this still looks like Domscribe”

### Recommendation

Rename soon.

This is the safest high-value cleanup to run before any deep technical namespace migration.

## What PinFlow Should Do Next

## Progress Since This Audit Started

The following visible Phase C.1 surfaces have already been moved to PinFlow wording without breaking the compatibility layer:

- preview fixture titles, sidebar labels, and smoke-test labels
- preferred CLI aliases: `pinflow` and `pinflow-mcp`
- relay setup, relay runtime logs, and MCP guidance copy
- relay README and visible CLI entrypoint wording
- repo operator docs such as `CLAUDE.md`, `domscribe-power/POWER.md`, and `gemini-extension.json`
- package-level README intros and provenance text across the main published packages
- root README wording around setup, compatibility guidance, and preferred PinFlow-facing operator language
- secondary operator/spec surfaces such as `AGENTS.md`, `TECHNICAL_SPEC.md`, and the local PinFlow skill copy
- custom adapter guidance and lightweight MCP example configs now prefer PinFlow-facing names where compatibility allows it
- active contributor rule docs under `.claude/rules/` now speak more consistently about PinFlow versus the retained compatibility layer

This means the remaining Phase C work should keep prioritizing visible confusion over deep internal churn.

### Safe next step

Run a targeted Phase C.1 pass for the highest-value visible surfaces only:

- demo fixture titles and labels
- local preview branding text
- any remaining smoke-test copy that leaks into normal preview use

### What should not happen next

Do not immediately rename:

- all `@domscribe/*` scopes
- `.domscribe/`
- `domscribe.config.json`
- MCP tool namespaces
- repo package directories

That would create more migration risk than product value at the current stage.

## Final Recommendation

Phase C should proceed in two levels:

1. `Phase C.1` — visible compatibility cleanup
   - fixture/demo branding
   - CLI alias strategy design
   - maybe new preferred command names

2. `Phase C.2` — deep namespace migration only if still justified
   - package scope
   - artifact directories
   - MCP namespace
   - source-level exported API names

At the current maturity level, PinFlow should execute `Phase C.1` first and treat `Phase C.2` as conditional.

## Current Posture After The Latest Audit

At this point, the remaining `domscribe` surfaces split cleanly into three groups:

### 1. Keep intentionally for now

These are still active compatibility contracts or core workspace mechanics:

- `@domscribe/*` package scopes
- `domscribe` / `domscribe-mcp` compatibility binaries
- MCP tool names such as `domscribe.query.bySource`
- `.domscribe/` artifacts and `domscribe.config.json`
- repo package directories and Nx project names like `packages/domscribe-*`
- TypeScript path aliases, project references, and build output paths

### 2. Reasonable to migrate later, but only as a deliberate compatibility release

These are the places where a true 100% PinFlow rename would eventually land if the product keeps stabilizing:

- package scopes from `@domscribe/*` to a future `@pinflow/*`
- source-level API exports such as `withDomscribe`, `DomscribeWebpackPlugin`, and `domscribe()`
- persistent artifact/config names such as `.domscribe/` and `domscribe.config.json`
- MCP server key and tool namespace
- CLI package identity `domscribe`

These should move only with:

- aliases or dual-entry compatibility
- migration notes and install-path guidance
- verification across fixtures and preview installs

### 3. Mostly exhausted visible cleanup

The remaining visible `Domscribe` references are now mostly:

- historical provenance, which should stay
- planning/spec documents that describe the migration itself
- technical examples that must still show the current compatibility API honestly

That means the repo is now close to the practical end of `Phase C.1`.

## Recommendation On A Full 100% Rename

A full 100% rename can make sense later, but it is not automatically the cleanest move right now.

Why not yet:

- it would turn a naming cleanup into a real compatibility migration
- it would touch install commands, published package identities, MCP setup, fixture wiring, and persistent local artifact paths
- it would create more regression surface than product value at the current maturity level

Why it may make sense later:

- if PinFlow continues as the long-term standalone product
- if you want a contributor-facing repo with no hybrid mental model left
- if you are willing to ship aliases, migration docs, and a compatibility window

So the best engineering answer is:

- `yes` to a full rename as a later product-hardening step
- `no` to doing it blindly right now just for cosmetic cleanliness

The codebase is now at the point where a deep rename should be treated like a versioned migration, not like a documentation sweep.
