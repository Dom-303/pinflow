# 04 PinFlow Platform Evolution

## Goal

Generalize PinFlow into a reusable multi-project tool without losing the strengths of the current Domscribe foundation.

## Why Fourth

Generalization is valuable, but it should follow product clarity and working automation. Doing it too early would increase abstraction cost without enough evidence.

## Now

- Keep the repo as a branded fork built on top of Domscribe
- Preserve compatibility with the existing architecture
- Avoid premature deep namespace changes

## Soon

- Support clearer multi-project setup docs
- Improve configuration guidance for different app roots and monorepo layouts
- Make Codex onboarding as first-class as the existing agent surfaces
- Formalize what belongs to upstream compatibility and what belongs to PinFlow-specific product behavior

## Later

- Decide whether package namespaces should ever be renamed
- Decide whether `.domscribe/` should become a branded artifact folder
- Decide whether the MCP namespace should stay `domscribe` or receive a PinFlow layer
- Split product-facing docs from lower-level architecture docs if needed
- Consider publishing strategy and versioning posture for the fork

## Namespace Strategy

### Keep for Now

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

Only do deeper renames when one of these becomes true:

- the old namespace causes real user confusion
- the branded fork becomes independently distributed
- technical naming is blocking adoption or onboarding

## Exit Criteria

- PinFlow is clearly usable across many projects
- The repo has a stable fork posture
- Future namespace decisions are deliberate rather than emotional
