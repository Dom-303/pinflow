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

- Overall: Phase 1 build-focus tasks are implemented; Phase 2A queue/claim,
  Phase 2B verification API, Phase 3A dispatch/channel contract work, and
  Phase 3B browser-session awareness are implemented on branch
  `codex/phase1-golden-path-complete`. Phase 3C Vue/Nuxt parity and Phase 3D
  doctor diagnostics are implemented on the same branch. The remaining
  roadmap work is now a manual local preview review, then release/tag/publish
  only after approval.
- Latest completed step: Release preparation. README, RELEASE.md, and
  CHANGELOG now mention the Golden Path demo check; the release candidate has
  fresh repo-level and demo-level verification, but no public release has been
  created yet.
- Latest verification: `env NX_DAEMON=false corepack pnpm run build:all`
  passed outside the sandbox for 12 projects, running `lint`, `test`, `build`,
  and `typecheck`. The direct WebSocket suite also passed outside the sandbox:
  `npx vitest run packages/pinflow-relay/src/server/ws-server.spec.ts`
  reported 5/5 tests passing. The same WebSocket test still cannot bind
  `127.0.0.1` inside the sandbox (`listen EPERM`), and the broad Nx run cannot
  start plugin workers inside the sandbox, so both checks need normal local
  permissions. Package E focused verification passed with
  `npx vitest run packages/pinflow-overlay/src/core/agent-summary.spec.ts packages/pinflow-overlay/src/components/paper-glow-ui.spec.ts`,
  `npx tsc -p packages/pinflow-overlay/tsconfig.lib.json --noEmit`, and
  `git diff --check`. `npx tsc -p packages/pinflow-overlay/tsconfig.spec.json --noEmit`
  still reports pre-existing test mock typing issues in
  `paper-glow-ui.spec.ts` and `overlay-store.undo.spec.ts`. Package 5 focused
  verification passed with
  `npx vitest run packages/pinflow-test-fixtures/shared/pinflow-preview.spec.ts packages/pinflow-test-fixtures/shared/fixture-installer.spec.ts`,
  `corepack pnpm run pinflow:preview -- --prepare-only`, and
  `corepack pnpm -C packages/pinflow-test-fixtures exec playwright test sixty-second-demo.spec.ts`.
  The reusable target also passed with
  `corepack pnpm nx demo-e2e pinflow-test-fixtures`; focused lint and
  TypeScript checks passed with
  `npx eslint packages/pinflow-test-fixtures/e2e/sixty-second-demo.spec.ts` and
  `npx tsc -p packages/pinflow-test-fixtures/tsconfig.spec.json --noEmit`.
  Package 6 release-prep verification passed with
  `corepack pnpm run release:check` and
  `corepack pnpm nx demo-e2e pinflow-test-fixtures`.
- UI status: the approved small overlay UI update for package E has been
  implemented. No broader overlay redesign was made.

### Remaining Work Order

| Order | Package                              | Status         | Scope                                                                                                    |
| ----- | ------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------- |
| 1     | Roadmap cleanup and verification     | Done           | Corrected stale roadmap statuses, ran local verification, and recorded the result here.                  |
| 2     | 60-second demo definition            | Done           | Defined the first React/Vite demo flow and expected fixture behavior.                                    |
| 3     | Overlay agent-summary planning       | Done           | Approved a small plan for existing annotation cards and workflow panel, without adding a new UI surface. |
| 4     | Overlay agent-summary implementation | Done           | Added compact agent summaries to existing annotation cards and agent attention to the workflow panel.    |
| 5     | Demo/fixture automation              | Done           | Added the Golden Path fixture element, source-query/HMR E2E, demo target, and stale-package guardrails.  |
| 6     | Release preparation                  | Done           | Final checks passed, install/release docs and changelog mention the Golden Path demo check.              |
| 7     | Local preview review                 | In progress    | Start the local PinFlow preview for manual inspection before release/tag/publish.                        |
| 8     | Public demo or benchmark             | Optional later | Only after the core loop and release candidate are reliable.                                             |

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
- 2026-04-29: Added manifest freshness reporting for `query.bySource`, including
  `manifest_stale`, per-file freshness metadata, and repair hints when source
  files are newer than the manifest.
- 2026-04-29: Added runtime privacy coverage and tightened redaction so
  props/state strings are redacted before truncation and camelCase sensitive
  fields like `sessionToken` are redacted.
- 2026-04-29: Hardened `data-ds` ID stability so HMR/Fast Refresh can reuse
  nearby IDs when source positions move slightly without reusing one old ID for
  multiple moved elements.
- 2026-04-29: Added the same source-exact agent rule to Codex/Claude-facing
  docs: query PinFlow before visual frontend edits and re-query after editing
  when possible.
- 2026-04-29: Started Phase 2A by formalizing the backend annotation queue with
  `claimed`, claim/lease metadata, expired-lease requeueing, readable
  `errorDetails`, retry counts, and MCP/status docs so parallel agents can see
  when work is already taken.
- 2026-04-29: Added Phase 2B verification API: `pinflow.annotation.verify`,
  `POST /api/v1/annotations/:id/verify`, persisted latest verification results,
  and minimal before/after DOM tag/text/attribute comparison.
- 2026-04-29: Started Phase 3A by adding provider-neutral dispatch metadata to
  annotations and `pinflow.annotation.process`, including session-local channel
  selection for Codex, Claude, manual handling, and other MCP-compatible agents.
- 2026-04-29: Added Phase 3B browser-session awareness: WS clients announce
  session metadata, the relay tracks connected sessions, `query.bySource`
  exposes multiple tab/route ambiguity, and agents can retry with a specific
  `sessionId`.
- 2026-04-29: Started Phase 3C Vue/Nuxt parity by adding a guarded Vue/Vite
  runtime init fallback for SSR-style setups and passing Nuxt runtime/capture
  options into the client Vue adapter.
- 2026-04-29: Added Phase 3D doctor diagnostics: `pinflow doctor` now checks
  app/root setup, framework/package setup, manifest, relay health, browser
  connection, and common MCP config files with clear repair hints.
- 2026-04-29: Defined the first 60-second demo flow around the existing
  React/Vite TypeScript preview fixture, including source/runtime expectations,
  post-edit verification expectations, non-goals, and the later automation path
  for package F.
- 2026-04-29: Planned the overlay agent-summary follow-up for package E:
  extend existing annotation cards and the existing workflow panel with compact
  agent/channel, error, verification, and next-step information. No UI code was
  changed in this planning step.
- 2026-04-29: Implemented the approved overlay agent-summary follow-up:
  annotation cards now expose agent/channel, failure, verification, and
  next-step details, and the workflow panel now surfaces compact agent attention
  for failed, waiting, or running work.
- 2026-04-29: Verified package E with focused overlay tests, overlay lib
  TypeScript, and `git diff --check`. The full overlay spec TypeScript check
  still has older mock typing cleanup left.
- 2026-04-29: Added package 5 demo/fixture automation: the React/Vite
  TypeScript fixture now has a stable Golden Path element, the preview local
  registry no longer proxies PinFlow packages from npm, fixture preview installs
  force a fresh same-workspace package install, and
  `sixty-second-demo.spec.ts` verifies source mapping, live runtime
  `query.bySource`, HMR text update, and re-query.
- 2026-04-29: Completed package 6 release preparation without publishing:
  README, RELEASE.md, and CHANGELOG now call out the Golden Path demo check,
  `corepack pnpm run release:check` passed, and
  `corepack pnpm nx demo-e2e pinflow-test-fixtures` passed.

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

- [x] Harden stable `data-ds` identity across HMR, Fast Refresh, and small source
      moves.
- [x] Make manifest staleness visible and actionable.
- [x] Normalize source paths across app roots, workspaces, and monorepos.
- [x] Upgrade `pinflow.query.bySource` into the central source-to-live-UI tool.
- [x] Return candidates and confidence when multiple live elements match.
- [x] Return specific failure reasons when a source location is not rendered.
- [x] Keep React/Next props and state capture small, serializable, and redacted.
- [x] Preserve capture failure reasons instead of silently omitting unavailable
      runtime context.
- [x] Write agent rules that tell Codex and Claude to query PinFlow before visual
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

- [x] Formalize queue states: queued, claimed, processing, processed, failed, and
      archived.
- [x] Add a simple claim/lease model so parallel agents do not process the same
      annotation invisibly.
- [x] Show agent response summaries, failure reasons, and next action in the
      overlay.
- [x] Keep annotation artifacts local and readable.
- [x] Add re-capture for an existing annotation after an edit.
- [x] Add a minimal comparison between pre-edit and post-edit DOM/text/attribute
      context.
- [x] Define the first verification API only around the golden path before
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

- [x] Add a provider-neutral dispatch contract for Codex, Claude, and manual
      handling.
- [x] Support session-level channel selection without mutating project defaults.
- [x] Improve Vue/Nuxt parity using lessons from the React/Next golden path.
- [x] Model multiple routes/tabs as explicit sessions instead of implicit global
      state.
- [x] Strengthen `pinflow doctor` checks for relay health, browser connection,
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

Status: done. See
[`2026-04-29-pinflow-60-second-demo-definition.md`](../reports/2026-04-29-pinflow-60-second-demo-definition.md).

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

Status: done. Implemented as `pinflow doctor`, with `/status` exposing browser
connection/session data for the browser-connected check.

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

Status: done. Added the same source-exact rule to `skills/pinflow/SKILL.md`,
`pinflow-power/POWER.md`, `packages/pinflow-mcp/README.md`, `AGENTS.md`, and
`CLAUDE.md`.

Codex and Claude should get the same simple instruction:

> For visual frontend work, ask PinFlow for source/runtime context before
> editing, and re-query or refresh after editing when possible.

Done when the install/setup path places this rule where the agent actually sees
it.

### 5. Add Confidence And Failure Tests

Status: mostly done for Phase 1 and Phase 3B. Covered multiple source matches,
ambiguous source paths, stale manifest, source file not found, source line not
found, no browser connected, element not rendered, runtime timeout, context
capture failure, multiple browser sessions, and missing explicit browser
session targets.

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
