# 07 PinFlow Source-Exact Agent Roadmap

## Goal

Turn the positioning report into a practical build roadmap for the next
PinFlow phase: make PinFlow the source-exact runtime context layer that helps
Codex, Claude, and other MCP-compatible coding agents understand a running
frontend without guessing.

This roadmap is based on
[PinFlow Positioning and Build Focus](../reports/2026-04-25-pinflow-positioning-and-build-focus.md).

## Core Decision

PinFlow should not compete as a better browser preview, desktop app, chat UI,
or generic visual comment tool.

PinFlow should win by doing the deeper thing:

> PinFlow gives coding agents source-exact visual context from your running
> frontend.

That means the product should make this loop reliable:

1. A user or agent points at a live UI element.
2. PinFlow resolves the source file, line, component, DOM, props, state, and
   workflow context.
3. The agent edits the right source with less guessing.
4. PinFlow can re-check the same live UI place after the edit.

## Current Baseline

Recent onboarding work already moves PinFlow in the right direction:

- `pinflow init` supports Codex as a first-class agent path.
- Multiple agents can be configured in one setup run.
- Smart setup detects likely app roots, frameworks, package managers, and
  partial PinFlow installs from concrete repo evidence.
- Monorepos stay single-app-per-init while clearly showing which apps are
  detected and which are already connected.
- Smart setup avoids pretending uncertainty is certainty; ambiguous choices
  still require the user to decide.

This solves part of the setup layer. The next work should now shift toward the
runtime and agent loop itself.

## Progress Tracking

Keep this section updated after every implementation step so a new chat or
agent can continue from the roadmap without relying on conversation history.

### Phase Counts

- Phase 1: 9 build-focus tasks.
- Phase 2: 7 build-focus tasks.
- Phase 3: 6 build-focus tasks.
- Immediate next work: 5 concrete tasks.

### Current Status

- Overall: Phase 1 is in progress.
- Latest completed step: `pinflow.query.bySource` now exposes stronger
  source-match results, candidates, confidence, failure reasons, manifest
  context, browser/runtime state, path normalization, and ambiguous source-path
  candidates.
- Latest verification: focused Prettier, Vitest, TypeScript, and
  `git diff --check` passed for the changed packages.
- UI status: no visible PinFlow UI changes have been made in this roadmap step.

### Completion Log

- 2026-04-28: Created this roadmap from the positioning report and linked it
  from `docs/roadmaps/README.md`.
- 2026-04-28: Added the visible-UI approval rule to `AGENTS.md`, `CLAUDE.md`,
  and this roadmap.
- 2026-04-28: Added the `query.bySource` golden-path audit report and linked it
  from `docs/reports/README.md`.
- 2026-04-28: Hardened `query.bySource` response contracts for candidates,
  confidence, failure reasons, browser/runtime/manifest context, and MCP hints.
- 2026-04-28: Added workspace and app-root path normalization, including
  `ambiguous_source_path` with `pathCandidates` for monorepo ambiguity.
- 2026-04-28: Split runtime context failures so PinFlow can distinguish
  "element found" from "context capture failed."

## Product Principles

### 1. Source accuracy leads the UI

Preview, screenshots, DOM inspection, and browser automation will become
commodity features in agent products. PinFlow should use them where helpful,
but its moat is deterministic DOM-to-source mapping and runtime context.

This does not make the PinFlow UI secondary or disposable. The overlay and
workflow surfaces are the place where users see, trust, and control that
source-exact context. UI work is valuable when it makes the source mapping,
runtime context, annotation state, and agent handoff clearer.

### 2. React and Next are the first golden path

PinFlow should become excellent for React/Next before stretching into broad
framework parity. Vue/Nuxt support should improve after the golden path is
stable enough to demonstrate and trust.

### 3. Every uncertain answer must explain itself

When PinFlow cannot map something perfectly, the response should not feel
mysterious. It should expose candidates, confidence, stale state, missing
browser connection, route mismatch, or missing manifest information.

### 4. Agent tools need agent-readable contracts

MCP tool names, return shapes, failure reasons, and prompts should be designed
for coding agents, not just human debugging. Agents should know when to use
`pinflow.query.bySource`, what a low-confidence result means, and when to ask
the user for a click or route change.

### 5. Local and inspectable stays a feature

Annotations, queue state, config, and agent-facing artifacts should remain
understandable in the repo and browser. PinFlow should not become a hidden
automation box.

## Phase 1: Golden Path Reliability

### Purpose

Make the smallest impressive loop work extremely well:

React/Next app -> click UI -> source mapping -> runtime context ->
annotation -> `query.bySource` -> agent edit target.

### Build Focus

- [ ] Harden stable `data-ds` identity across HMR, Fast Refresh, and small source
      moves.
- [ ] Make manifest staleness visible and actionable.
- [x] Normalize source paths across app roots, workspaces, and monorepos.
- [x] Upgrade `pinflow.query.bySource` into the central source-to-live-UI tool.
- [x] Return candidates and confidence when multiple live elements match.
- [x] Return specific failure reasons when a source location is not rendered.
- [ ] Keep React/Next props and state capture small, serializable, and redacted.
- [x] Preserve capture failure reasons instead of silently omitting unavailable
      runtime context.
- [ ] Write agent rules that tell Codex and Claude to query PinFlow before visual
      frontend edits.

### Acceptance Criteria

- In a React/Next fixture, a click on a visible element resolves to a source
  file, line, component name, DOM snapshot, and runtime context.
- `pinflow.query.bySource` can start from that source location and find the
  live element again without another user click.
- If multiple matches exist, the response lists candidates with clear
  confidence instead of choosing blindly.
- If no match exists, the response explains the likely reason: browser not
  connected, route not open, manifest stale, source not found, or element not
  currently rendered.
- Redaction is on by default for sensitive values in props/state.
- Codex and Claude setup docs/rules show the same expected edit loop.

### Keep Out Of Scope

- Broad Vue/Nuxt parity.
- Multi-browser-session routing.
- A new visual regression system.
- A provider-specific dispatcher.
- Large unrelated overlay redesigns. Targeted UI improvements are in scope
  when they make the source-exact loop easier to see, trust, or control.

Visible PinFlow UI changes still need explicit user approval before editing.
An implementer should first explain what would change in the surface, copy,
layout, or workflow, then wait for confirmation.

## Phase 2: Agent Workflow And Verification

### Purpose

Turn source-exact context into controlled agent work, then verify that the edit
hit the right live UI place.

### Build Focus

- [ ] Formalize queue states: queued, claimed, processing, processed, failed, and
      archived.
- [ ] Add a simple claim/lease model so parallel agents do not process the same
      annotation invisibly.
- [ ] Show agent response summaries, failure reasons, and next action in the
      overlay.
- [ ] Keep annotation artifacts local and readable.
- [ ] Add re-capture for an existing annotation after an edit.
- [ ] Add a minimal comparison between pre-edit and post-edit DOM/text/attribute
      context.
- [ ] Define the first verification API only around the golden path before
      generalizing.

### Acceptance Criteria

- A user can collect multiple visual change requests and see which are queued,
  claimed, in progress, done, failed, or archived.
- Two agents cannot silently claim the same task without visible lease state.
- A failed agent handoff leaves a readable failure reason and a retry path.
- After an agent edit, PinFlow can re-query the same source/element context and
  show what changed.
- The verification response can say when it is confident, uncertain, or unable
  to verify.

### Keep Out Of Scope

- Fully automatic background workers as the default path.
- Complex batching rules before the simple queue is trustworthy.
- A full diff/review workspace.
- Browser automation that bypasses source-exact context.

## Phase 3: Platform Breadth

### Purpose

Only after the golden path and workflow are trustworthy, broaden PinFlow into a
more complete multi-agent, multi-framework tool.

### Build Focus

- [ ] Add a provider-neutral dispatch contract for Codex, Claude, and manual
      handling.
- [ ] Support session-level channel selection without mutating project defaults.
- [ ] Improve Vue/Nuxt parity using lessons from the React/Next golden path.
- [ ] Model multiple routes/tabs as explicit sessions instead of implicit global
      state.
- [ ] Strengthen `pinflow doctor` checks for relay health, browser connection,
      manifest presence, app root, framework package, and setup status.
- [ ] Consider public demos or benchmarks only after the core loop is reliable.

### Acceptance Criteria

- Codex, Claude, and manual handling fit the same task model.
- Users can see which agent/channel is active for the current session.
- Vue/Nuxt return the same class of source/runtime answers as React/Next, even
  if individual framework fields differ.
- Multi-route or multi-tab ambiguity is visible and explainable.
- `pinflow doctor` can tell a user why PinFlow is not connected before they
  need to debug by hand.

### Keep Out Of Scope

- Own desktop app as the main product.
- Own full browser.
- Own large chat interface.
- Generic artifact platform.
- Public comparison pages before the golden path demo is strong.

These guardrails do not mean "no polished UI." They mean PinFlow should not
turn into a replacement workspace for Claude or Codex. The existing PinFlow
surface should continue to become clearer, calmer, and more useful around the
source-exact workflow.

## Immediate Next Work

These are the highest-value small steps to take from this roadmap.

### 1. Define The 60-Second Demo

Status: not started.

Create a small demo script and fixture expectation for:

1. click a visible React/Next element
2. show source, component, DOM, props, state
3. create an annotation
4. let an agent query by source before editing
5. edit the right file
6. HMR updates the app
7. PinFlow re-captures and shows the changed runtime context

Done when the demo is specific enough that missing product pieces become
obvious.

### 2. Audit `pinflow.query.bySource`

Status: done. See
[`2026-04-28-query-by-source-golden-path-audit.md`](../reports/2026-04-28-query-by-source-golden-path-audit.md).

Compare the current tool response to the required contract:

- source match
- rendered state
- candidates
- confidence
- failure reasons
- route/session context
- stale manifest signal

Done when the gap list is concrete and testable.

### 3. Specify `pinflow doctor`

Status: not started.

Keep the first version boring and useful:

- relay reachable
- browser connected
- manifest present
- app root known
- framework adapter installed
- config marker present
- MCP server config visible for selected agents

Done when each check has one clear success state and one clear user-facing
repair hint.

### 4. Tighten Agent Rules

Status: not started.

Codex and Claude should get the same simple instruction:

> For visual frontend work, ask PinFlow for source/runtime context before
> editing, and re-query or refresh after editing when possible.

Done when the install/setup path places this rule where the agent actually sees
it.

### 5. Add Confidence And Failure Tests

Status: partially done for `query.bySource`; still open for stale manifest,
wrong route/session, and broader runtime edge cases.

Before adding clever detection, add tests for honest uncertainty:

- multiple matching elements
- stale manifest
- closed or wrong route
- source file not found
- no browser connected
- runtime context unavailable

Done when PinFlow can fail in a way that helps the user recover.

## Technical Gap Checklist

Use this as the lightweight backlog filter.

### Manifest And Source Identity

- Stable IDs through HMR/Fast Refresh.
- Manifest stale state.
- Source path normalization for monorepos and app roots.
- Candidate/confidence model for ambiguous mappings.
- Clear mismatch reasons for source line drift.

### Runtime Context

- React/Next props/state golden path.
- Redaction defaults for sensitive values.
- Serialization limits for large or circular data.
- Capture failure reasons.
- Later Vue/Nuxt parity.

### Source-To-Live Query

- `pinflow.query.bySource` result contract.
- Rendered false reasons.
- Multiple candidates.
- Browser/route/session awareness.
- Agent-readable tool descriptions and examples.

### Annotation Workflow

- Queue state definitions.
- Claim/lease state.
- Retry and failure reasons.
- Visible agent responses.
- Local readable artifacts.

### Verification

- Pre-edit capture.
- Post-edit re-capture.
- DOM/text/attribute comparison.
- Uncertain verification state.
- Optional Playwright bridge later.

### Setup And Diagnosis

- Smart init.
- Manual init fallback.
- `pinflow doctor`.
- Relay health.
- Browser connection.
- Manifest presence.
- App root and monorepo diagnosis.
- Agent MCP setup visibility.

## Overengineering Guardrails

Do not add a larger system when a small explicit contract will do.

- Preserve and improve the existing PinFlow UI where it supports trust,
  control, and clarity in the source-exact workflow.
- Ask for user approval before changing visible UI, layout, styling, copy, or
  workflow surfaces.
- Prefer one golden path fixture over many shallow demos.
- Prefer explicit failure reasons over automatic guessing.
- Prefer one source query response contract over several near-duplicate APIs.
- Prefer local readable artifacts over hidden background state.
- Prefer a simple doctor command over a self-healing setup engine.
- Prefer React/Next excellence over broad framework symmetry.
- Prefer user-visible uncertainty over false confidence.

## Roadmap Decision Rule

A planned task should move forward only if it strengthens at least one of:

1. source-exact DOM-to-code mapping
2. deeper runtime context
3. better MCP/agent use
4. more reliable annotation/task workflow
5. faster real project setup and diagnosis
6. stronger post-edit verification

Everything else can wait.
