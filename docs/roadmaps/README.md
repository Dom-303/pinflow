# PinFlow Roadmaps

This folder captures the staged transition from the Domscribe foundation to the
visible product direction `PinFlow`.

## Guiding Principle

PinFlow should become the source-exact runtime context layer for visual
frontend work with coding agents. It is not positioned as a replacement for
Claude Code Desktop, Codex Desktop, or any other browser-preview workspace.
Those tools can preview and edit apps; PinFlow tells them exactly what they are
looking at.

The release focus is centered on:

- source-exact UI-to-code mapping
- source-to-live-UI queries through `pinflow.query.bySource`
- framework-aware runtime context
- repo-local annotation and queue workflow
- Codex, Claude, and generic MCP clients as agent paths
- gradual automation instead of risky over-engineering

Core claim:

> PinFlow gives coding agents source-exact visual context from your running
> frontend.

The detailed positioning note is
[PinFlow Positioning and Build Focus](../reports/2026-04-25-pinflow-positioning-and-build-focus.md).

## Recommended Execution Order

1. [01-pinflow-brand-foundation.md](./01-pinflow-brand-foundation.md)
2. [02-pinflow-overlay-ui.md](./02-pinflow-overlay-ui.md)
3. [03-pinflow-agent-workflow.md](./03-pinflow-agent-workflow.md)
4. [04-pinflow-platform-evolution.md](./04-pinflow-platform-evolution.md)
5. [05-pinflow-cleanup-plan.md](./05-pinflow-cleanup-plan.md)
6. [06-pinflow-finalization-checklist.md](./06-pinflow-finalization-checklist.md)

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
