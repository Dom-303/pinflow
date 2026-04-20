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
- Define the operator controls for sending, batching, and auto-continuation before building automation

## Soon

- Add a local dispatcher layer
- Support explicit routing to:
  - Codex
  - Claude
  - manual handling
- Preserve local task storage while enabling forwarding
- Add clearer response/status semantics
- Add configurable dispatch modes:
  - manual collection
  - immediate send
  - automatic send after a threshold
- Add queue concurrency controls with a configurable default
- Add automatic continuation so the next batch starts when active work finishes
- Support per-session channel selection while keeping project defaults
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
- Add approval gates such as "confirm before each batch"
- Allow session overrides without mutating permanent project defaults

## Important Constraint

Do not assume direct magical coupling to a consumer subscription. First define:

- the task model
- the dispatch contract
- the return channel
- the operator controls
- the queue backpressure rules
- the session-vs-project configuration boundary

Only then connect to specific execution paths.

## Proposed Agent Posture

PinFlow should remain:

- provider-flexible
- local-first
- queue-aware
- inspectable by the operator
- controllable at both project and session level

It should not become a hidden black box.

## Planned Control Model

### Project Defaults

- default channel
- default dispatch mode
- default queue threshold
- default maximum concurrent work items
- default auto-continuation behavior

### Session Overrides

- active channel for the current work session
- optional override of send behavior for the current session only
- optional manual pause/resume of queue execution

### Working Constraints

- one active channel per session
- configurable concurrency from `1` to `10`
- default concurrency of `3`
- queue remains local-first and inspectable

## Exit Criteria

- Task flow is clearly designed
- Codex and Claude fit into the same conceptual model
- Future automation can be added without redesigning the core workflow
- Queue behavior, dispatch behavior, and operator control boundaries are explicit before implementation
