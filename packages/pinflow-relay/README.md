# @pinflow/relay

Local relay server and MCP adapter for PinFlow.

`@pinflow/relay` runs on the developer's machine and bridges the in-browser overlay with coding agents. It provides an HTTP API for annotation management, a WebSocket server for real-time overlay updates, and an MCP server for agent tool access.

## Install

```bash
npm install @pinflow/relay
```

## CLI Commands

The relay ships with a CLI that manages the server process and workspace initialization.

```bash
pinflow serve       # Start relay server (foreground or --daemon)
pinflow status      # Check relay daemon status
pinflow stop        # Stop relay daemon
pinflow init        # Setup wizard (agent + framework configuration)
pinflow mcp         # Run as MCP server via stdio
pinflow runner      # Run local autostart worker for released tasks
pinflow dev         # Start relay, runner, and npm run dev together
pinflow follow      # Follow latest run transcript from another terminal
pinflow external    # Visible external-agent handoff for extensions/desktops
```

For use in agent MCP configuration, the standalone `pinflow-mcp` binary runs the MCP server directly over stdio without the HTTP/WebSocket relay. The init wizard can configure multiple agent clients in one run, and the choice is not exclusive. You can also run it again with another `--agent` value or add the same `pinflow` MCP server to multiple clients. The running localhost app is selected by the project dev server, browser overlay, and relay workspace, not by the agent choice.

The normal autostart path is the dev server config created by `pinflow init`.
For supported local providers it adds a runner block like this:

```ts
runner: { mode: 'auto', provider: 'codex' }
```

With that config in place, starting the app dev server also starts the local
PinFlow runner in the background.

`autoStart: true` remains supported for existing projects.

For a single-terminal workflow, use `pinflow dev`. If the app has a
`package.json` dev script, PinFlow starts `npm run dev` automatically:

```bash
pinflow dev
pinflow dev --open
```

This starts the relay, starts a foreground runner for the selected provider, and
then starts your app command. When the app exits, PinFlow stops the runner and
also stops the relay if this command started it.

For custom app commands, pass the command after `--`:

```bash
pinflow dev -- pnpm dev
pinflow dev -- npm run dev -- --host 127.0.0.1 --port 4302
```

`--open` opens the first localhost app URL printed by the dev server. You can
also pass a fixed URL:

```bash
pinflow dev --open http://localhost:4302/
```

From a monorepo root or helper terminal, pass the app explicitly:

```bash
pinflow dev --app-root packages/my-app
pinflow follow packages/my-app
```

Every claimed runner task writes local run evidence into the workspace:

```txt
.pinflow/runs/YYYY-MM/YYYY-MM-DD/HHMMSS-annotation-id/
  prompt.md
  context.json
  transcript.log
  diff.patch
  summary.json
```

The prompt stays compact by default. Full annotation, runtime context, and a
bounded source snippet around the target line are preserved in `context.json` so
agents can read more detail only when needed. The folder is sorted by month and
date, and it is the shared source for terminal output, future extension views,
and debugging. `diff.patch` is only evidence; the actual source files in the
repo remain the source of truth.

To follow the visible agent transcript from any terminal:

```bash
pinflow follow
pinflow runs latest
```

Terminal output is concise by default. The full provider transcript is still
written to `.pinflow/runs/.../transcript.log`. Use `--raw` only when you need to
debug the complete provider output:

```bash
pinflow dev --raw
pinflow follow --raw
```

`pinflow runner` is still available as the explicit manual path. It does not
call model APIs directly and does not need an API key from PinFlow. Instead it
claims released tasks from the relay and starts a local agent command, for
example the Codex CLI:

```bash
pinflow runner --provider codex
```

The default Codex preset runs `codex exec --full-auto --skip-git-repo-check -`
and sends the PinFlow task prompt through stdin. Billing and limits therefore
belong to the locally authenticated Codex client, not to a PinFlow API
integration. Custom providers can be wired with `--command` and repeated
`--arg` values.

Use `--model` only when you want to pin a provider model. PinFlow does not
silently replace that model. If the local provider CLI cannot run it, the runner
fails the task with a clear provider/CLI error so the developer can update the
CLI or choose another local model intentionally.

Runner heartbeats report an execution surface:

| Surface      | Meaning                                     |
| ------------ | ------------------------------------------- |
| `terminal`   | A visible terminal owns the runner process  |
| `background` | Dev-server autostart owns a detached runner |
| `external`   | An extension or desktop tool owns execution |

This keeps the extension/Desktop path aligned with the CLI path instead of
creating a second execution system.

For editor extensions or desktop agents that should own the visible agent
session, use the external handoff commands instead of starting a hidden runner:

```bash
pinflow external claim --provider codex --model gpt-5.5 --label "Codex Desktop" --json
pinflow external complete ann_xxxxxxxx_1 --run-dir .pinflow/runs/...
pinflow external fail ann_xxxxxxxx_1 --error "User cancelled" --run-dir .pinflow/runs/...
```

`claim` creates the same run evidence folder as the normal runner and writes the
agent prompt to `prompt.md`. The external tool can show that prompt in its own
visible session, edit the repo normally, then call `complete` or `fail`.
Provider and model are passed through as run evidence; PinFlow does not replace
the user's chosen model. A VS Code extension can build on this by calling
`claim`, opening the prompt in its own visible chat/session, and completing the
task only after the local repo has a real diff.

**Monorepo support:** Smart setup detects likely frontend apps, shows whether each one is already configured, partially configured, or not configured, and sets up one app per init run. Run `pinflow init --app-root <path>` to choose explicitly, or `pinflow init --manual` to use the manual flow. `pinflow.config.json` remains a single-app config with one `appRoot`.

## Annotation Lifecycle

A developer clicks an element in the running app, types an instruction, and submits it. The annotation moves through the following states:

| From         | To           | Trigger                                  |
| ------------ | ------------ | ---------------------------------------- |
| `QUEUED`     | `CLAIMED`    | Agent calls `pinflow.annotation.process` |
| `CLAIMED`    | `PROCESSING` | Agent starts explicit work, if needed    |
| `CLAIMED`    | `PROCESSED`  | Agent responds, verifies, then completes |
| `PROCESSING` | `PROCESSED`  | Agent responds, verifies, then completes |
| `PROCESSING` | `FAILED`     | Agent error or timeout                   |
| `FAILED`     | `QUEUED`     | Developer or agent retries the task      |
| `PROCESSED`  | `ARCHIVED`   | Developer archives via overlay           |

The agent claims an annotation with readable lease metadata, edits the relevant source files, responds with a summary, verifies the same live element again, and then marks the annotation `PROCESSED`. Expired leases can return to `QUEUED` with a readable failure reason and retry count.

## WebSocket Events

The relay broadcasts events over WebSocket to keep connected overlay instances in sync.

| Event                                       | Description                           |
| ------------------------------------------- | ------------------------------------- |
| `CONNECT` / `CONNECTED` / `DISCONNECTED`    | Connection lifecycle                  |
| `ERROR`                                     | Connection error                      |
| `ANNOTATION_CREATED` / `ANNOTATION_UPDATED` | Annotation changes                    |
| `MANIFEST_UPDATED`                          | Manifest file changes                 |
| `CONTEXT_REQUEST` / `CONTEXT_RESPONSE`      | Bidirectional runtime context queries |

`CONTEXT_REQUEST` / `CONTEXT_RESPONSE` are used when an agent requests live component props or state from the browser — the relay forwards the request to the overlay, which queries the runtime and sends the response back through the same WebSocket connection.

## Links

PinFlow is based on [PinFlow](https://github.com/patchorbit/pinflow).

## License

MIT
