# PinFlow MCP Package

Standalone MCP server package for PinFlow runtime context workflows, with `pinflow-mcp` kept as a temporary binary alias during the migration window.

## Install

```bash
npm install @pinflow/mcp
```

Or use directly without installing:

```bash
npx -y --package @pinflow/mcp pinflow-mcp
```

Preferred binary:

```bash
pinflow-mcp
```

Compatibility binary:

```bash
pinflow-mcp
```

Requires Node.js 20 or later.

## Usage

Add `pinflow` to your MCP server configuration. The server communicates over stdio and requires no additional setup beyond a running PinFlow relay daemon.

```json
{
  "mcpServers": {
    "pinflow": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "--package", "@pinflow/mcp", "pinflow-mcp"]
    }
  }
}
```

Compatibility note: `pinflow-mcp` remains available as a temporary binary alias during the migration window.

The relay daemon starts automatically when you run your dev server with PinFlow configured. The MCP server connects to it on localhost and exposes the full runtime toolset to your coding agent.

## MCP Tools Reference

### Source Query (Code to UI)

Query source locations and retrieve live runtime context from the running browser session.

| Tool                     | Description                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `pinflow.query.bySource` | Query a source file and line number to get live runtime context from the browser (props, state, DOM snapshot) |
| `pinflow.manifest.query` | Find all manifest entries by file path, component name, or element ID                                         |
| `pinflow.manifest.stats` | Manifest coverage statistics (entry count, file count, component count, cache hit rate)                       |

### Element Resolution (UI to Code)

Resolve `data-ds` element IDs injected at build time back to their source locations.

| Tool                    | Description                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `pinflow.resolve`       | Resolve a single `data-ds` element ID to its ManifestEntry (file, line, col, component) |
| `pinflow.resolve.batch` | Resolve multiple element IDs in one call                                                |

### Annotation Workflow

Annotations are created when a developer clicks an element in the PinFlow overlay and enters intent. These tools drive the agent-side processing loop.

| Tool                              | Description                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pinflow.annotation.process`      | Atomically claim the next queued annotation (`claimNext`) — prevents concurrent agent conflicts |
| `pinflow.annotation.respond`      | Attach agent response and transition annotation to `PROCESSED`                                  |
| `pinflow.annotation.updateStatus` | Manually transition annotation status                                                           |
| `pinflow.annotation.get`          | Retrieve annotation by ID                                                                       |
| `pinflow.annotation.list`         | List annotations with status and filter options                                                 |
| `pinflow.annotation.search`       | Full-text search across annotation content                                                      |

### System

| Tool             | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `pinflow.status` | Relay daemon health, manifest stats, and queue counts |

## MCP Prompts

Pre-built prompts that guide agents through common PinFlow workflows.

| Prompt              | Purpose                             |
| ------------------- | ----------------------------------- |
| `process_next`      | Guide through annotation processing |
| `check_status`      | Check relay status                  |
| `explore_component` | Explore component metadata          |
| `find_annotations`  | Search for annotations              |

## Example Responses

### `pinflow.query.bySource`

Returns the source location matched in the manifest plus live runtime data captured from the browser.

```json
{
  "found": true,
  "entryId": "aB3dEf7h",
  "sourceLocation": {
    "file": "src/components/Button.tsx",
    "start": { "line": 12, "column": 4 },
    "componentName": "Button",
    "tagName": "button"
  },
  "match": {
    "confidence": "high",
    "strategy": "exact_line_and_column",
    "lineDistance": 0,
    "columnDistance": 0
  },
  "candidates": [
    {
      "entryId": "aB3dEf7h",
      "confidence": "high",
      "strategy": "exact_line_and_column",
      "lineDistance": 0,
      "columnDistance": 0,
      "sourceLocation": {
        "file": "src/components/Button.tsx",
        "start": { "line": 12, "column": 4 },
        "componentName": "Button",
        "tagName": "button"
      }
    }
  ],
  "runtime": {
    "rendered": true,
    "elementFound": true,
    "contextCaptured": true,
    "componentProps": { "variant": "secondary", "onClick": "[Function]" },
    "componentState": { "hook_0": false, "hook_1": "idle" },
    "domSnapshot": {
      "tagName": "button",
      "attributes": { "class": "btn-secondary", "type": "submit" },
      "innerText": "Save changes"
    }
  },
  "browserConnected": true,
  "browser": { "connected": true, "clientCount": 1 },
  "reasons": []
}
```

### Annotation Object

Returned by `pinflow.annotation.get`, `pinflow.annotation.process`, and related tools.

```json
{
  "found": true,
  "annotationId": "ann_A1B2C3D4_1710500000",
  "userIntent": "Make this button use the primary color from the design system",
  "element": {
    "tagName": "button",
    "dataDs": "A1B2C3D4",
    "selector": "main > div > button",
    "attributes": { "class": "btn-secondary", "type": "submit" },
    "innerText": "Save changes"
  },
  "sourceLocation": {
    "file": "src/components/Button.tsx",
    "line": 12,
    "column": 4,
    "componentName": "Button",
    "tagName": "button"
  },
  "runtimeContext": {
    "componentProps": { "variant": "secondary", "onClick": "[Function]" },
    "componentState": { "hook_0": false, "hook_1": "idle" }
  }
}
```

## Links

PinFlow is built from the original [PinFlow](https://github.com/patchorbit/pinflow) foundation.

## License

MIT
