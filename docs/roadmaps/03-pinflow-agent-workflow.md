# 03 PinFlow Agent Workflow

## Goal

Evolve PinFlow from a local annotation tool into a reliable workflow surface that can hand tasks to `Codex` and `Claude` with better status visibility and less manual glue.

## Why Third

Automation becomes valuable only after:

- the visible product identity is clear
- the working UI is understandable
- the task lifecycle is intentionally defined

## Now

- Keep the existing annotation lifecycle working
- Formalize the queue states and meanings
- Define how agent responses should appear in the UI
- Define a neutral task model that does not depend on a single provider

## Soon

- Add a local dispatcher layer
- Support explicit routing to:
  - Codex
  - Claude
  - manual handling
- Preserve local task storage while enabling forwarding
- Add clearer response/status semantics
- Distinguish:
  - queued
  - claimed
  - in progress
  - completed
  - failed
  - archived

## Later

- Implement background queue workers
- Allow gradual automatic processing
- Add retries, failure reasons, and operator visibility
- Add optional batching or prioritization
- Support richer project-specific dispatch rules

## Important Constraint

Do not assume direct magical coupling to a consumer subscription. First define:

- the task model
- the dispatch contract
- the return channel
- the operator controls

Only then connect to specific execution paths.

## Proposed Agent Posture

PinFlow should remain:

- provider-flexible
- local-first
- queue-aware
- inspectable by the operator

It should not become a hidden black box.

## Exit Criteria

- Task flow is clearly designed
- Codex and Claude fit into the same conceptual model
- Future automation can be added without redesigning the core workflow
