# PinFlow Full Rename Design

## Goal

Complete the transition from the current hybrid `PinFlow` / `domscribe` state to a fully productized `PinFlow` codebase, while preserving the proven behavior, architecture, and migration safety of the original foundation.

This is not a cosmetic rename. It is a controlled compatibility migration that must end in:

- `PinFlow` as the only public product identity
- a reliable local preview path that resolves the current PinFlow build
- no product-facing dependency on old `domscribe` names
- preservation of the core runtime, relay, overlay, transform, and fixture behavior that already works

## Why This Must Happen

The current hybrid state was a good intermediate strategy, but it is no longer the right destination.

The repo now has:

- visible PinFlow branding
- partially updated tooling and onboarding
- deep technical names that still point to `domscribe`
- multiple compatibility layers that are useful now, but expensive to build on forever

Every additional feature added on top of the hybrid state increases later rename cost in:

- docs
- APIs
- package names
- fixture install flows
- MCP wiring
- persistent local artifact paths

The correct next step is therefore not “more cleanup”. It is a real migration project.

## Non-Negotiable Outcome

The desired end state is a **complete PinFlow version**, not a permanent fork that still behaves like Domscribe internally.

That means:

- the code should still preserve the good parts of the original system
- but the active product identity, install paths, integration examples, and operator workflow should all become PinFlow-native

## Core Constraints

The migration must:

- not lose proven functionality from the original system
- not break the ability to preview and test the current PinFlow build locally
- not destroy existing queue/overlay/runtime behavior while renaming infrastructure
- preserve a migration path for current compatibility users during the rename window
- separate “rename for clarity” from “rewrite behavior”

## What Is In Scope

This design covers the full rename path across:

- npm package scopes
- CLI identities
- MCP server key and tool namespace
- source-level API exports
- persistent local artifact names
- repo package directories and project identities
- TypeScript path aliases and internal workspace wiring
- fixture generators, smoke tests, preview installers, and publish/install flows
- onboarding docs and integration examples

## What Is Out Of Scope

This design does not add new product features such as:

- provider execution APIs
- remote dispatch infrastructure
- billing/auth
- new runtime capabilities unrelated to the rename

Those can continue after the migration baseline is stable.

## Design Decision

We will do the full rename, but as a **multi-wave migration with temporary compatibility**, not as a destructive one-shot replacement.

### Why This Is Better Than A Big-Bang Rename

A one-shot rename would mix too many failure modes together:

- package install failures
- fixture install failures
- MCP connection failures
- preview/runtime failures
- persistent artifact migration failures
- broken docs and examples

If all of these move at once, diagnosis becomes slower and more fragile.

### Why This Is Better Than Staying Hybrid

Staying hybrid would:

- keep mental overhead high
- keep preview/debug flows harder than they need to be
- turn each future feature into double-maintenance
- preserve a product identity that never fully lands

## Migration Strategy

The migration should happen in seven waves.

## Wave 0: Freeze And Baseline

### Purpose

Create a hard baseline so the rename can be verified against a known-good system.

### Required Outcomes

- green verification for the current canonical preview flow
- saved inventory of all remaining `domscribe` surfaces
- explicit classification of what will rename now, what gets aliases, and what migrates later in the sequence

## Wave 1: Dual Public Identity

### Purpose

Introduce `PinFlow` as the preferred technical identity everywhere public while keeping compatibility aliases alive.

### Targets

- new package scopes prepared or introduced
- `pinflow` / `pinflow-mcp` as canonical binaries
- docs, plugins, and onboarding prefer only PinFlow naming
- old binaries continue to work during the migration window

### Rules

- old public names may remain as aliases
- new work must prefer the PinFlow identity
- no new docs should introduce fresh `domscribe` user-facing language

## Wave 2: Public API Rename

### Purpose

Rename source-level framework exports and integration APIs so framework users no longer code against `Domscribe`-named helpers.

### Targets

- `withDomscribe` to PinFlow-native wrapper naming
- `DomscribeWebpackPlugin` to PinFlow-native plugin naming
- `domscribe()` plugin helper to PinFlow-native helper naming

### Rules

- old API names must remain as temporary aliases first
- examples and fixtures should move to the new APIs before old names are retired

## Wave 3: MCP And Agent Contract Rename

### Purpose

Remove the old product identity from the agent-facing contract.

### Targets

- MCP server key
- MCP tool namespace
- plugin manifests
- example configs
- local MCP helper configs

### Rules

- dual registration may exist temporarily if practical
- the final state should expose PinFlow-first MCP names

## Wave 4: Persistent Artifact Migration

### Purpose

Rename local on-disk product state without breaking existing workspaces.

### Targets

- `.domscribe/`
- `domscribe.config.json`
- lock files and install stamps that still carry the old product identity

### Rules

- must include fallback read path
- must include one-time migration or lazy migration
- must not strand existing local annotations or manifest data

## Wave 5: Workspace And Repo Interior Rename

### Purpose

Make the repo internals match the product identity.

### Targets

- `packages/domscribe-*`
- Nx project names
- TS path aliases
- build outputs and project references
- generator paths and fixture package naming

### Rules

- do this only after the public contract and persistent state are stable
- otherwise contributors will fight path churn while debugging user-facing breakage

## Wave 6: Cleanup Window

### Purpose

Remove old aliases only after the new identity has proven itself.

### Targets

- deprecated CLI aliases
- deprecated source-level aliases
- deprecated MCP aliases
- deprecated docs and examples

## Compatibility Model

The migration should use a shrinking compatibility envelope:

1. introduce PinFlow names
2. keep old names working
3. switch docs/examples to PinFlow only
4. verify fixtures, preview, MCP, and install flows
5. remove old names later in a dedicated cleanup window

This avoids accidental lock-in while keeping the migration reversible during early waves.

## Verification Model

Each wave must prove three things before the next wave begins:

### 1. Local Preview

- canonical preview flow starts cleanly
- current PinFlow UI appears, not stale artifacts
- fixture reinstall path still works

### 2. Public Contract

- install commands or aliases resolve correctly
- framework examples still compile
- MCP clients can connect through the intended names

### 3. Existing State

- existing local annotations/manifests/configs are still readable
- no migration step destroys repo-local working state

## Wave Gates

No wave is allowed to declare success unless all of the following are true:

- the wave-specific verification commands are green
- the canonical local preview still resolves the current PinFlow build
- compatibility promises introduced in that wave are actually test-covered or explicitly documented
- the next wave does not need to guess whether the previous wave really landed

If a wave leaves the repo in a partially migrated state without clear compatibility or verification, that wave is not complete.

## Decision Rules During Implementation

When an implementation detail is ambiguous, prefer the choice that:

- keeps PinFlow as the forward-facing default
- preserves old behavior temporarily through aliases rather than hidden breakage
- minimizes irreversible state migration before compatibility is proven
- keeps the preview and fixture pipeline debuggable

If a rename looks clean on paper but weakens the ability to diagnose preview, fixture, or MCP failures, it should move to a later wave instead of being forced early.

## Success Criteria

The migration is complete when:

- the preferred and default identity everywhere public is `PinFlow`
- no new contributor or user needs to learn `domscribe` first
- existing local workspaces can migrate without losing queue/annotation/manifest state
- local preview, fixture install, and agent setup all run through PinFlow-native flows
- remaining old names, if any, are only temporary compatibility shims with explicit removal plans

## Final Recommendation

Proceed with the full rename.

But do it as:

- a compatibility-preserving migration
- a wave-based implementation
- a verification-heavy program
- not a repo-wide search-and-replace

That is the cleanest route to a true `PinFlow` product without throwing away the value already built on top of the original foundation.
