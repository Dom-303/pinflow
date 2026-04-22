# PinFlow Technical Migration Design

## Goal

Turn the current branded fork into a technically reliable `PinFlow` product line without breaking the useful parts of the upstream Domscribe foundation.

This migration is driven by a concrete operational problem:

- visible product surfaces already say `PinFlow`
- internal package/version/install flows still behave like `Domscribe`
- fixture installs and local preview flows keep resolving old `0.5.2` artifacts
- the current hybrid state makes further feature work riskier and more confusing

The goal is not aesthetic renaming alone. The goal is to make PinFlow reproducible, installable, previewable, and evolvable as its own tool.

## Problem Statement

PinFlow currently has a split identity:

- product branding is already moving to `PinFlow`
- package scope, release behavior, fixture stamps, and registry installs still revolve around `@domscribe/*` and the old version line

This creates several real failures:

1. local fixture previews can show stale upstream UI even after local PinFlow work is complete
2. reinstalling dependencies is not sufficient when version and registry metadata still point to the old artifact line
3. debugging the preview environment becomes harder than building the actual product
4. every new feature added on top of this hybrid state increases migration cost later

This is now a technical product problem, not just a branding cleanup problem.

## Scope

This design covers:

- technical migration strategy from hybrid fork to stable PinFlow dev line
- versioning posture needed to escape stale `0.5.2` installs
- fixture installation and preview reliability
- package/export/release behavior needed for local development
- phased rename strategy from medium-depth rebrand to deeper namespace changes

This design does not yet cover:

- direct Codex or Claude provider execution APIs
- billing/auth/credential transport
- complete MCP namespace replacement
- every single documentation rewrite in the repo

## Decision

We will follow a structured migration project with three delivery phases, executed in order.

### Recommended Path

Use a staged technical migration, not a big-bang blind rename.

That means:

- start by fixing the technical identity and install flow first
- then align package/tooling surfaces with PinFlow
- only then decide which deep internal namespaces are truly worth renaming

This gives us a decisive migration without turning the repo into a high-risk all-at-once rewrite.

## Approaches Considered

### 1. Continue the Hybrid Model

Keep visible PinFlow branding but leave internal technical identity mostly unchanged.

Rejected because:

- the preview/install problem is already costing real time
- it makes future debugging harder
- it guarantees more migration pain later

### 2. Staged Technical Migration

Run a deliberate migration project with phases for technical identity, tooling surface, and deeper namespace decisions.

Chosen because:

- it solves the actual current blocker
- it reduces preview and fixture confusion
- it preserves good upstream foundations while making PinFlow technically real

### 3. One-Shot Full Rename Everywhere

Immediately rename scope, CLI, artifacts, fixtures, MCP names, and all internals in one motion.

Rejected as the default path because:

- it is the highest-risk option
- it bundles many unrelated breakages
- it makes diagnosis harder if the migration fails halfway

## Migration Phases

## Phase A: Technical Identity And Preview Reliability

### Goal

Make PinFlow installable and previewable as a current product build rather than a stale artifact of the old Domscribe line.

### Required Outcomes

- move off the stale preview/install posture tied to the old `0.5.2` artifact reuse pattern
- establish a new version line for PinFlow so fixture installers and registry consumers can detect fresh artifacts
- make the local fixture preview reliably consume the current PinFlow build
- align install stamps, fixture metadata, and local registry expectations with the new product line
- document the canonical local preview path for PinFlow

### Likely Changes

- bump the version line to a new PinFlow-specific release marker
- adjust fixture install stamps and related cache invalidation points
- verify local publish/install scripts against the new version posture
- ensure built package exports are correct for the actual local dev flow
- remove or reduce assumptions that only made sense for upstream Domscribe release simulation

### Non-Goals For Phase A

- full package scope rename
- deep CLI rename
- deep MCP rename
- mass internal symbol rewrites

## Phase B: Package And Tooling Surface Alignment

### Goal

Make the repo, package surfaces, and tooling feel intentionally PinFlow-aligned rather than partially renamed.

### Required Outcomes

- package/export surfaces behave consistently in local development
- visible and mid-depth tool surfaces are aligned with PinFlow naming
- release and preview documentation reflect the real PinFlow workflow
- provider-facing and onboarding surfaces are clearer for Codex and Claude

### Candidate Changes

- package metadata cleanup
- export map cleanup
- local dev command naming and documentation cleanup
- fixture and preview docs rewritten around PinFlow instead of Domscribe
- remaining obvious product-surface `Domscribe` wording removed

### Non-Goals For Phase B

- mandatory npm scope rename
- mandatory `.domscribe/` artifact rename
- mandatory MCP rename

## Phase C: Deep Namespace Migration

### Goal

Decide whether PinFlow should fully sever deep technical naming from Domscribe.

### Candidate Changes

- `@domscribe/*` -> `@pinflow/*`
- CLI names
- artifact directory names such as `.domscribe/`
- MCP namespace names
- internal technical identifiers that are still product-visible

### Decision Rule

Only do this if at least one is true:

- the old namespace continues to create real confusion
- PinFlow is being distributed as its own product line
- the old namespace is now actively blocking onboarding or adoption

This phase is important, but it should be a deliberate choice, not an emotional reflex.

## Architectural Boundaries

### Keep Stable During Phase A

- the proven overlay/runtime/relay architecture
- the working queue and workflow model already introduced
- the existing monorepo structure unless it blocks the migration

### Change Aggressively During Phase A

- version posture
- install invalidation strategy
- preview reliability path
- fixture consumption of current PinFlow builds

## Validation Strategy

The migration is only successful if we can verify the new technical identity, not just believe it.

### Phase A Validation

- a fresh local fixture install resolves the new PinFlow artifact line
- local preview shows current PinFlow UI, not stale Domscribe UI
- release/install steps are repeatable from a clean fixture state
- no manual symlink hacks are required for the canonical preview flow

### Phase B Validation

- package/export surfaces behave consistently
- onboarding docs match the real commands
- no obvious product-facing Domscribe leftovers remain in the normal workflow

### Phase C Validation

- namespace changes do not break fixture install, preview, or provider workflows
- renamed identifiers are worth their churn cost

## Risks

### Main Risk

Trying to rename too much too early can create a migration that is technically noisier than the problem it solves.

### Secondary Risk

Trying to preserve too much backward compatibility can keep the hybrid problem alive and waste more time.

### Mitigation

- execute Phase A first
- verify preview/install behavior before moving deeper
- keep Phase C optional until evidence says it is worth it

## Exit Criteria

This migration is considered successful when:

- PinFlow has a reliable current-build preview path
- fixture installs no longer drift back to stale Domscribe artifacts
- versioning and local install behavior reflect PinFlow as a live product line
- the repo can support further feature work without carrying the current hybrid confusion forward
