---
name: pinflow
description: Work with PinFlow through the current pinflow compatibility layer. Use when setting up, initializing, or configuring PinFlow for a project, OR when editing or modifying UI components (React, Vue, Next.js, Nuxt), implementing features from captured UI annotations, querying runtime context for source locations, exploring component structure, or when user mentions annotations, queued tasks, UI changes, props, state, DOM, or asks about how elements render at runtime.
allowed-tools: Read, Edit, Write, Bash, Glob, mcp__pinflow__*, pinflow.*, mcp.pinflow.*, process_next, check_status, explore_component, find_annotations
---

# PinFlow

PinFlow bridges running UI and source code through the current pinflow compatibility layer. It maps every rendered element to its exact source location and captures live runtime context (props, state, DOM). This works in two directions:

- **UI → Code**: User clicks an element in the browser, PinFlow captures it as an annotation with source location, runtime context, and user intent. You claim and implement it.
- **Code → UI**: You're editing a source file and want to know what an element looks like at runtime. Query by file and line to get live props, state, and DOM snapshot.

## Setup / Initialization

If `pinflow.status` returns `active: false`, PinFlow is not yet configured in this workspace. The `.pinflow/` directory is created automatically when the dev server starts with the current PinFlow-compatible bundler plugin configured. Follow this procedure to set it up:

1. **Confirm dormant state** — call `pinflow.status`. If `active: false`, proceed. Note the `cwd` in the response.
2. **Detect framework** — read `package.json` (at `cwd`, or at the `appRoot` from `pinflow.config.json` if it exists) and match dependencies against the table below.
3. **Detect package manager** — check which lockfile exists at the project root.
4. **Install the package** — run the appropriate install command via Bash (e.g., `pnpm add -D @pinflow/next`).
5. **Edit the bundler config** — read the config file and apply the integration pattern. Load `references/config-patterns.md` for the exact import, transformation, and example for each framework.
6. **Update `.gitignore`** — if `.pinflow` is not already listed, append a `# PinFlow artifacts` comment and `.pinflow` entry.
7. **Inform the user** — tell them to start (or restart) their dev server. PinFlow activates automatically on first run.

### Framework Detection

Check `dependencies` and `devDependencies` in `package.json`. Match top-down (first match wins):

| Dependency          | Framework     |
| ------------------- | ------------- |
| `next`              | next          |
| `nuxt`              | nuxt          |
| `react` + `vite`    | react-vite    |
| `react` (no `vite`) | react-webpack |
| `vue` + `vite`      | vue-vite      |
| `vue` (no `vite`)   | vue-webpack   |
| `vite` only         | other-vite    |
| `webpack` only      | other-webpack |

### Package Mapping

| Framework     | Package                | Config file         |
| ------------- | ---------------------- | ------------------- |
| next          | `@pinflow/next`        | `next.config.ts`    |
| nuxt          | `@pinflow/nuxt`        | `nuxt.config.ts`    |
| react-vite    | `@pinflow/react`       | `vite.config.ts`    |
| react-webpack | `@pinflow/react`       | `webpack.config.js` |
| vue-vite      | `@pinflow/vue`         | `vite.config.ts`    |
| vue-webpack   | `@pinflow/vue`         | `webpack.config.js` |
| other-vite    | `@pinflow/transform`   | `vite.config.ts`    |
| other-webpack | `@pinflow/transform`   | `webpack.config.js` |

### Package Manager Detection

| Lockfile                 | Package manager |
| ------------------------ | --------------- |
| `pnpm-lock.yaml`         | pnpm            |
| `yarn.lock`              | yarn            |
| `bun.lock` / `bun.lockb` | bun             |
| (none)                   | npm             |

Install command pattern: `<pm> add -D <package>` (pnpm/yarn/bun) or `npm install -D <package>`.

### Monorepo Projects

If `pinflow.config.json` exists at the project root with an `appRoot` field, the frontend app lives in that subdirectory. Install packages and find the bundler config relative to `appRoot`.

If the project appears to be a monorepo (e.g., `apps/`, `packages/` directories, workspace config in `package.json`) but no `pinflow.config.json` exists, ask the user which directory contains the frontend app. Then write `pinflow.config.json` at the project root:

```json
{ "appRoot": "apps/web" }
```

### After Setup

The MCP server starts in dormant mode when no `.pinflow/` directory exists. After the user starts their dev server, the bundler plugin creates `.pinflow/` automatically. The MCP server will need to restart to detect the new workspace and transition to active mode with the full tool suite.

## Editing Components (Code → UI)

**Why query runtime state?** Source code alone doesn't tell you what props a component actually received, whether a conditional branch rendered, what CSS classes were applied, or what text the user sees. `pinflow.query.bySource` gives you the live truth from the browser.

**When to query (these tasks benefit):**

- **Visual/styling bugs** — "the button is the wrong color." Query reveals the actual `className`, inline styles, and computed attributes so you can see what CSS is winning.
- **Conditional rendering bugs** — "this section doesn't show up." Query tells you `rendered: false` or shows the actual props/state that control the condition.
- **Prop tracing** — "the title shows 'undefined'." Query shows `componentProps` with the actual values flowing through, revealing where the chain breaks.
- **Verifying your edit worked** — After editing, query the same location to confirm the DOM, props, and text updated as expected (HMR will have applied your change).

**When NOT to query (save the round-trip):**

- Pure logic changes (utils, hooks with no DOM output, API calls)
- Creating new files or components from scratch (nothing to query yet)
- Refactoring (renames, extractions, moves)
- Type errors or build failures (the compiler already tells you what's wrong)

**Prerequisite:** Runtime queries require the user's dev server to be running and the target component to be rendered in an open browser tab. Before calling `pinflow.query.bySource`, confirm with the user that they have the relevant page open. If you get `browserConnected: false` or `runtime.rendered: false`, ask the user to navigate to the page that renders the component and retry.

**Workflow:**

1. **Confirm the page is open** — ask the user if they have the page with the target component open in their browser. If not, ask them to navigate there first.
2. **Before editing** (if the task matches the scenarios above): Call `pinflow.query.bySource` with the file path and line number. Inspect `runtime.componentProps`, `runtime.componentState`, and `runtime.domSnapshot`.
3. **Edit** the component source code.
4. **After editing**: Call `pinflow.query.bySource` again to verify your changes took effect in the live browser.

## Quick Commands (MCP Prompts)

| Command             | Purpose                        |
| ------------------- | ------------------------------ |
| `process_next`      | Process next queued annotation |
| `check_status`      | System health and queue counts |
| `explore_component` | List elements in a component   |
| `find_annotations`  | Search annotation history      |

## All Tools Reference

Tool names below use their MCP registration names (e.g., `pinflow.query.bySource`). Your client may map these differently — use whatever tool name your environment exposes for the pinflow MCP server.

### Source Query (Code → UI)

| Tool                       | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `pinflow.query.bySource` | Get runtime context for a source location (file + line)    |
| `pinflow.manifest.query` | Find all manifest entries by file, component, or tag name  |
| `pinflow.manifest.stats` | Manifest coverage statistics (entry/file/component counts) |

### Element Resolution (UI → Code)

| Tool                      | Purpose                            |
| ------------------------- | ---------------------------------- |
| `pinflow.resolve`       | Get source location for element ID |
| `pinflow.resolve.batch` | Resolve multiple element IDs       |

### Annotation Workflow

| Tool                                | Purpose                               |
| ----------------------------------- | ------------------------------------- |
| `pinflow.annotation.process`      | Claim next queued annotation (atomic) |
| `pinflow.annotation.respond`      | Store your implementation message     |
| `pinflow.annotation.updateStatus` | Mark as `processed` or `failed`       |
| `pinflow.annotation.list`         | List annotations by status            |
| `pinflow.annotation.get`          | Get full annotation details           |
| `pinflow.annotation.search`       | Search by element, file, or text      |

### System

| Tool               | Purpose                              |
| ------------------ | ------------------------------------ |
| `pinflow.status` | Relay health, manifest, queue counts |

## Using `pinflow.query.bySource`

When you're working in a source file and want to understand what an element looks like at runtime, query by file path and line number:

**Input:**

- **`file`** (required): Absolute file path as stored in the manifest. Use `pinflow.manifest.query` to discover exact paths.
- **`line`** (required): Line number (1-indexed).
- **`tolerance`** (optional): Match elements within N lines of the target (default: 0, exact match).
- **`column`** (optional): Narrow to a specific column (0-indexed).
- **`includeRuntime`** (optional): Skip the browser query if you only need manifest data (default: true).

**Output:**

- **`sourceLocation`**: Confirmed file, line range, tag name, component name.
- **`runtime`**: Live data from the browser (if connected) — `componentProps`, `componentState`, `domSnapshot` (tag, attributes, innerText).
- **`browserConnected`**: Whether a browser client is connected via WebSocket.

Use `pinflow.manifest.query` first if you don't know the exact line — it returns all entries for a file, component, or tag, which you can then target with `pinflow.query.bySource`.

## Annotation Lifecycle

```
queued → processing → processed
                   ↘ failed (with errorDetails)
       any status → archived
```

- **queued**: Waiting for agent to claim
- **processing**: Agent is working on it (claimed atomically)
- **processed**: Successfully implemented
- **failed**: Could not implement (include `errorDetails`)
- **archived**: Removed from active queue

## Annotation Workflow

1. **Claim** an annotation via `pinflow.annotation.process`

2. **Understand** the response:
   - `userIntent`: What the user wants (e.g., "Make this button red")
   - `sourceLocation.file`: Source file path
   - `sourceLocation.line`: Line number
   - `sourceLocation.componentName`: React/Vue component name
   - `element.innerText`: Visible text (verify correct element)
   - `runtimeContext.componentProps`: Current prop values

3. **Navigate** to `sourceLocation.file:sourceLocation.line`

4. **Implement** the change based on `userIntent`

5. **Verify** via `pinflow.query.bySource` — call with the same file and line to confirm your changes are reflected in the live browser (HMR will have updated the page)

6. **Store** your response via `pinflow.annotation.respond` with the annotation ID and a message describing what you did

7. **Complete** the annotation via `pinflow.annotation.updateStatus` with status `processed` (or `failed` with `errorDetails`)

## Error Handling

| Situation                 | Action                                                 |
| ------------------------- | ------------------------------------------------------ |
| `found: false`            | No match — queue empty or no manifest entry            |
| `browserConnected: false` | Runtime data unavailable; manifest data still returned |
| Source file missing       | Mark `failed` with details                             |
| Ambiguous intent          | Ask user for clarification before implementing         |
| Partial success           | Mark `processed`, note limitations in response         |
| Cannot implement          | Mark `failed` with `errorDetails` explaining why       |

## Key Principles

- Read `userIntent` carefully — it's the user's actual words
- Use `pinflow.query.bySource` to verify runtime state before and after changes
- Use `element.innerText` to confirm you're changing the right element
- Use `runtimeContext` to understand current component state
- Make minimal, focused changes
- Provide clear explanation via `pinflow.annotation.respond`
- Search with `pinflow.annotation.search` to check for related prior work
