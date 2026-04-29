# PinFlow Agent Autostart Analysis

Date: 2026-04-29

## Short finding

The current PinFlow handoff is technically correct for MCP, but it is not a
true autostart loop.

PinFlow can create annotations, store them in the relay, and release them for
pickup. The MCP server exposes `pinflow.annotation.process`, which claims the
next annotation when an MCP-connected coding agent calls it. The missing piece
is that MCP does not make the agent wake up and process work by itself.

So the current chain is:

1. Browser overlay creates an annotation.
2. Overlay/relay marks it as released for pickup.
3. A connected agent must call `pinflow.annotation.process`.
4. The agent implements the change and updates the annotation status.

The failing user experience happens between step 2 and 3: PinFlow is waiting,
but no active worker is pulling the released work.

## Evidence

- The MCP tool is pull-based:
  `packages/pinflow-relay/src/mcp/tools/annotation-process.tool.ts`
  exposes `pinflow.annotation.process`, and only that tool claims work.
- The MCP adapter is stdio-based:
  `packages/pinflow-relay/src/mcp/mcp-adapter.ts` registers tools for an MCP
  client, but it does not run an autonomous loop.
- The CLI MCP command starts a server for the agent:
  `packages/pinflow-relay/src/cli/commands/mcp.command.ts` starts the MCP
  adapter and connects it to the relay, but it does not execute tasks itself.
- On the checked local Codex setup, `codex mcp list` reported no configured MCP
  servers. That means this Codex session cannot currently see PinFlow MCP tools.

## Product implication

There are two different product modes, and PinFlow needs to name them clearly.

| Mode             | What it means                                                                                                                           | Current support     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| MCP handoff      | PinFlow releases work. A coding agent can pick it up via MCP when asked or when its host supports proactive behavior.                   | Mostly implemented  |
| Autostart runner | PinFlow runs a local worker that actively pulls released work and starts a provider command such as Codex/Claude with the right prompt. | Stage 1 implemented |

The current UI should not imply true autostart unless an autostart runner is
actually connected.

## Recommended target architecture

Add a provider-neutral `pinflow runner` layer.

The runner should:

1. Connect to the same local relay as the browser overlay.
2. Poll or subscribe for released annotations.
3. Claim work through the same process endpoint as MCP.
4. Build a deterministic prompt from the annotation context.
5. Execute a configured provider command in the app root.
6. Store the agent response and final status back in the relay.

The first version is command-template based instead of hardcoding one provider:

```bash
pinflow runner --provider codex
```

The default Codex preset runs:

```bash
codex exec --full-auto --skip-git-repo-check -
```

The PinFlow task prompt is passed through stdin. PinFlow does not call OpenAI or
other model APIs directly in this path. Billing, credits, and limits belong to
the locally authenticated agent client.

Custom providers can use:

```bash
pinflow runner --provider custom --command my-agent --arg run --arg '{prompt}'
```

Codex, Claude, and other providers can continue to become presets over the same
runner contract.

## UI changes needed

- If no MCP/runner is connected, show "Kein Agent verbunden" or "Runner fehlt",
  not just "Wartet auf Agent".
- If MCP is configured but no autonomous runner exists, label it as "Freigegeben"
  instead of implying that work is already running.
- Keep the opened queue compact: show only a few items, page the rest, and move
  detailed history into the Verlauf panel.
- Show a single top-level next action:
  - "Jetzt senden" for manual handoff
  - "Runner starten" when autostart is configured but inactive
  - "Wartet auf Uebernahme" only when an agent/runner is actually connected

## Immediate conclusion

The reliable solution is not to make the browser dispatch route more aggressive.
The reliable solution is to add a real local runner, while keeping MCP handoff as
the lighter integration path.

## Implemented in Stage 1

- Added `pinflow runner`.
- Added a provider-neutral runner core.
- Added Codex and Claude command presets.
- Added custom command support.
- Added deterministic prompt generation from annotation context.
- Runner claims released work, marks it `processing`, runs the local command,
  then marks it `processed` or `failed`.
- Added focused tests for command resolution, prompt generation, runner status
  transitions, and CLI registration.

## Implemented in Stage 2

- Added a runner heartbeat endpoint:
  `POST /api/v1/runners/heartbeat`.
- Added runner diagnostics to `/status`.
- Runner now reports `idle` and `processing` while it is alive.
- The overlay polls relay status and stores runner presence locally.
- Queue messaging now distinguishes:
  - `Runner fehlt`
  - `Runner bereit`
  - `Runner arbeitet`
- The active run panel now uses the real runner connection state instead of
  implying that an agent is always present.

## Implemented in Stage 3

- Onboarding now explains that the dev server config can start the local runner
  automatically.
- Codex setup selects the `codex` runner provider for the generated config
  snippet.
- Claude Code setup selects the `claude` runner provider for the generated
  config snippet.
- Other/manual agents get a custom runner hint instead of a fake preset.
- `pinflow doctor` now checks runner connection status and reports:
  - runner connected
  - no local autostart runner connected
  - relay too old to expose runner status

## Implemented in Stage 4

- Vite, Webpack, Turbopack/Next, and Nuxt can auto-start the local runner from
  dev server plugin/module config.
- The runner starts only after the relay is available, then connects back via
  heartbeat.
- The runner is skipped when a matching provider runner is already connected.
- `pinflow init` now passes the selected runner provider from the agent step to
  the framework step.
- Generated config snippets include:
  `runner: { autoStart: true, provider: '<provider>' }`.
- This makes the intended default path: start the app dev server, and PinFlow
  starts the local runner in the background.
