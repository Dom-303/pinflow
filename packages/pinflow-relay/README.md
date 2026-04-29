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
```

For use in agent MCP configuration, the standalone `pinflow-mcp` binary runs the MCP server directly over stdio without the HTTP/WebSocket relay. The init wizard can configure multiple agent clients in one run, and the choice is not exclusive. You can also run it again with another `--agent` value or add the same `pinflow` MCP server to multiple clients. The running localhost app is selected by the project dev server, browser overlay, and relay workspace, not by the agent choice.

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
