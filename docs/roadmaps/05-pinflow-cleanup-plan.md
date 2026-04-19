# 05 PinFlow Cleanup Plan

## Goal

Clean up the PinFlow fork after the product direction, overlay UX, and agent workflow are stable enough that we can safely remove leftover upstream complexity.

## Why Last

Cleanup should follow productization, not precede it. Right now the upstream Domscribe structure still gives us useful compatibility, test coverage, and release machinery. Removing pieces too early would increase risk and reduce our ability to compare against upstream behavior.

## Cleanup Targets To Review Later

### 1. Fork and repo hygiene

- confirm the repository is detached from the fork network
- confirm visibility and access settings match the intended distribution stage
- remove obsolete branch or remote assumptions from docs

### 2. Branding leftovers

- remaining visible `Domscribe` references that are no longer needed
- old screenshots, logos, and docs assets
- wording that no longer matches the PinFlow product identity

### 3. Agent surfaces

- remove any remaining secondary agent surfaces we do not want to support
- keep only the provider paths that still matter
- simplify onboarding around the final supported agent set

### 4. Verdaccio and local publish pipeline

The current repo includes `.verdaccio/` and local registry scripts for release and fixture pipelines.

Keep for now if we still rely on:

- local package publishing for integration tests
- black-box fixture installation
- release simulation in CI or local testing

Remove or simplify later only if:

- PinFlow no longer uses the local registry workflow
- fixture installation is replaced with a simpler strategy
- the maintenance cost exceeds the testing value

### 5. Test fixtures and legacy support surface

- review which fixture matrices we still care about
- review whether all framework/bundler combinations are still part of the product direction
- remove dead test permutations only after replacing their confidence with something else

### 6. Internal namespace review

- review whether `@domscribe/*`, `domscribe` CLI names, and `.domscribe/` still make sense
- only rename deeper technical namespaces if the product has clearly outgrown the old naming

## Verdaccio Assessment

Right now Verdaccio is not random clutter. It is part of the local registry and fixture pipeline, visible in:

- `package.json`
- `.verdaccio/config.yml`
- `packages/domscribe-test-fixtures/*`

That means:

- it is a valid cleanup candidate later
- it is not a good early deletion target now

## Exit Criteria

- the repo is smaller without losing important confidence
- all retained tooling has a clear reason to exist
- product-facing and internal surfaces both feel intentional
