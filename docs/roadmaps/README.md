# PinFlow Roadmaps

This folder captures the staged transition from upstream `pinflow` to the visible product direction `PinFlow`.

## Guiding Principle

PinFlow should become a neutral, multi-project visual review and change workflow for live web apps, centered on:

- point-and-tell UI review
- source-mapped implementation workflows
- Codex and Claude as primary agent paths
- gradual automation instead of risky over-engineering

Core claim:

> Pin it, flow it, ship it.

## Recommended Execution Order

1. [01-pinflow-brand-foundation.md](./01-pinflow-brand-foundation.md)
2. [02-pinflow-overlay-ui.md](./02-pinflow-overlay-ui.md)
3. [03-pinflow-agent-workflow.md](./03-pinflow-agent-workflow.md)
4. [04-pinflow-platform-evolution.md](./04-pinflow-platform-evolution.md)

## Rename Strategy

PinFlow should be introduced in three layers:

1. Visible brand layer now
2. Product workflow and UI layer next
3. Deep technical namespace layer later, only if it becomes worth the cost

That means:

- rename the visible product first
- keep internal `pinflow` namespaces for now
- avoid mass-renaming package names, CLI names, and artifact folders until there is a concrete reason

## Scope Discipline

This roadmap intentionally avoids:

- a full internal namespace rename in the first pass
- heavy automation before the queue and dispatch model is designed
- building a bespoke platform before the existing product surface has been productized
