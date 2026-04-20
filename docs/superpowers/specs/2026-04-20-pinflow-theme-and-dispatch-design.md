# PinFlow Theme And Dispatch Design

## Goal

Define the next product-shaping layer for PinFlow after the Paper Glow overlay refresh:

- a first-class `Light` and `Dark` theme system
- persistent manual theme selection
- a queue-aware dispatch workflow for `Codex` and `Claude`
- operator controls for sending, batching, and auto-continuation

This design is intentionally product-first. It clarifies behavior, UI posture, and configuration boundaries before deeper implementation work begins.

## Scope

This design covers:

- the visible theme model in the overlay
- where theme and workflow controls should live in the UI
- how dispatch modes should behave
- how queue progression should work
- how project defaults and session overrides should interact

This design does not yet cover:

- direct provider API integration details
- authentication/token transport for Codex or Claude
- retries, billing, or provider-specific execution plumbing
- deep internal namespace renames away from `domscribe`

## Product Intent

PinFlow should feel like a calm, high-trust operator surface for visual change requests, not a chaotic agent dashboard.

The UI should let someone:

1. mark elements and write changes quickly
2. understand what is queued, active, and completed
3. decide how aggressively work is dispatched
4. switch providers without rewriting the workflow model

The product should stay local-first, inspectable, and provider-flexible.

## Theme Model

### Theme Set

PinFlow has two explicit themes:

- `Light`
- `Dark`

`Light` is the current approved `Paper Glow` direction.

`Dark` should be a deliberate companion surface, not a simple inversion. It should preserve the same editorial calm, soft hierarchy, and premium restraint while shifting into a darker workspace palette.

### Theme Switching

Theme switching is manual in the first implementation.

There is no system-theme auto-detection in this phase.

The active theme should persist across reloads and restarts, so if the user switches to `Dark`, PinFlow stays in `Dark` until changed again.

### Theme Assets

PinFlow should support theme-aware branding assets:

- a light-mode logo
- a dark-mode logo

The asset system should be simple enough that logo replacement does not require rewriting the rest of the overlay.

## Workflow Model

### Core Mental Model

Annotations are not just comments. They are queueable work items.

Each work item can be:

- stored locally
- shown in a visible queue
- dispatched through one active channel
- updated with progress and result state

The user should be able to operate PinFlow in a low-friction way:

- collect work
- release work
- inspect work
- continue working while the queue progresses

### Channels

PinFlow supports multiple channels conceptually, but only one active channel is used per session.

Planned channels:

- `Codex`
- `Claude`
- `Queue only` / local-only hold mode

This keeps the model simple while still allowing practical switching when one provider becomes less convenient.

## Dispatch Modes

PinFlow should support three main send modes:

### 1. Manual Collection

Annotations accumulate in the queue until the user explicitly starts sending them.

### 2. Immediate Send

Each annotation is sent as soon as it is submitted, as long as queue capacity allows it.

### 3. Automatic Threshold Send

Annotations accumulate until a configured threshold is reached, for example `3` or `5`, and then the next batch is released automatically.

## Queue Progression

### Concurrency

The number of simultaneously active work items should be configurable from `1` to `10`.

Default:

- `3`

### Auto-Continuation

When active items finish, PinFlow should be able to pull the next items from the waiting queue automatically.

This should be configurable because not every session wants the same level of automation.

### Batch Release Modes

The operator should be able to choose between:

- `Manual send`
- `Confirm before each batch`
- `Fully automatic continuation`

Default behavior should lean toward automatic continuation so the queue keeps moving without unnecessary babysitting.

## Configuration Boundaries

### Project Defaults

Each project should be able to define defaults for:

- preferred channel
- dispatch mode
- threshold size
- maximum concurrent active items
- auto-continuation behavior
- theme default

### Session Overrides

Sessions should be able to temporarily override selected runtime behavior without permanently changing the stored project defaults.

Most important session-level controls:

- active channel
- pause/resume queue execution
- temporary send behavior override

This creates a useful distinction:

- project settings describe the normal posture
- session settings describe the temporary operating mode

## UI Posture

### Sidebar

The main sidebar should contain only the controls needed during live work:

- active channel
- dispatch mode
- queue summary
- immediate actions like send, pause, or release next batch

### Session / Automation Surface

Deeper controls should live behind a secondary entry point, such as a small settings or automation button.

That surface can hold:

- threshold size
- concurrency
- auto-continuation behavior
- per-session overrides
- provider-specific knobs later

This keeps the annotation flow calm while still giving power users the control they want.

## Non-Goals

This phase is not trying to:

- build full provider execution integrations immediately
- turn the sidebar into a complex orchestration console
- allow different annotations in the same session to target different providers
- infer hidden behavior from system settings

## Recommended Delivery Order

### First

- theme model
- persistent theme toggle
- theme-aware assets

### Second

- queue control model in docs and UI framing
- visible channel and dispatch controls
- queue summaries and batch semantics

### Third

- real dispatcher behavior
- auto-threshold send
- auto-continuation
- session overrides

## Exit Criteria

- `Light` and `Dark` are clearly defined as first-class product surfaces
- the UI control model for theme and dispatch is explicit
- project defaults and session overrides are separated conceptually
- queue behavior is understandable before provider plumbing is implemented
