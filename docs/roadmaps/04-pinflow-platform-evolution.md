# 04 PinFlow Platform Evolution

## Goal

Generalize PinFlow into a reusable multi-project tool without losing the strengths of the current PinFlow foundation.

## Why Fourth

Generalization is valuable, but it should follow product clarity and working automation. Doing it too early would increase abstraction cost without enough evidence.

## Now

- Execute `Phase A` of the PinFlow technical migration
- Make preview and fixture installs resolve current PinFlow builds reliably
- Treat versioning, package exports, and local registry behavior as active product work

## Soon

- Align package and tooling surfaces with PinFlow
- Reduce visible `PinFlow` friction in daily development flows
- Document the canonical PinFlow preview and install path
- Improve configuration guidance for different app roots and monorepo layouts

## Later

- Decide whether deep namespace moves like `@pinflow/*` are worth the churn
- Evaluate whether `.pinflow/` and MCP names should move with the product
- Split product-facing docs from lower-level architecture docs if needed
- Consider publishing strategy and versioning posture for the fork

## Namespace Strategy

### Keep for Phase A

- package names
- CLI names
- artifact directory names
- internal schemas and many technical identifiers

### Change Later Only If Worth It

- npm scope
- CLI command names
- MCP namespace names
- internal artifact folder names

## Decision Rule

Only do deeper renames when one of these becomes true after Phase A and Phase B are stable:

- the old namespace causes real user confusion
- the branded fork becomes independently distributed
- technical naming is blocking adoption or onboarding

## Exit Criteria

- PinFlow is clearly usable across many projects
- The repo has a stable PinFlow preview and install posture
- Future namespace decisions are deliberate rather than emotional

## Full Rename Destination

PinFlow is no longer targeting a permanent hybrid state. The long-term destination is a complete technical and product migration away from public `pinflow` naming, executed in controlled compatibility waves.
