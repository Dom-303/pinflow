<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="./assets/pinflow-horizontal-dark.png"
    />
    <img src="./assets/pinflow-horizontal-light.png" alt="PinFlow" width="520" />
  </picture>
</p>

<h1 align="center">PinFlow</h1>

<p align="center"><strong>Pin it, flow it, ship it.</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/search?q=%40pinflow"><img src="https://img.shields.io/npm/v/%40pinflow/core?label=npm&color=cb3837" alt="npm version" /></a>
  <a href="https://github.com/Dom-303/pinflow/actions"><img src="https://img.shields.io/github/actions/workflow/status/Dom-303/pinflow/ci.yml?label=CI" alt="CI status" /></a>
  <a href="#"><img src="https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/Narrator/1bedc40fc56874758abd3b7caf4d6748/raw/pinflow-coverage.json" alt="test coverage" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-417e38?logo=node.js&logoColor=white" alt="Node.js >= 18" />
  <a href="https://github.com/Dom-303/pinflow/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@pinflow/react"><img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://www.npmjs.com/package/@pinflow/vue"><img src="https://img.shields.io/badge/Vue-4FC08D?style=flat&logo=vuedotjs&logoColor=white" alt="Vue" /></a>
  <a href="https://www.npmjs.com/package/@pinflow/next"><img src="https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.npmjs.com/package/@pinflow/nuxt"><img src="https://img.shields.io/badge/Nuxt-00DC82?style=flat&logo=nuxt&logoColor=white" alt="Nuxt" /></a>
  &nbsp;&nbsp;
  <a href="https://www.npmjs.com/package/@pinflow/transform"><img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://www.npmjs.com/package/@pinflow/transform"><img src="https://img.shields.io/badge/Webpack-8DD6F9?style=flat&logo=webpack&logoColor=black" alt="Webpack" /></a>
  <a href="https://www.npmjs.com/package/@pinflow/transform"><img src="https://img.shields.io/badge/Turbopack-000000?style=flat&logo=turborepo&logoColor=white" alt="Turbopack" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Codex-111111?style=flat&logo=openai&logoColor=white" alt="Codex" />
  <img src="https://img.shields.io/badge/Claude_Code-d97706?style=flat&logo=anthropic&logoColor=white" alt="Claude Code" />
  <img src="https://img.shields.io/badge/MCP-Compatible-2563eb?style=flat&logoColor=white" alt="MCP Compatible" />
</p>

<p align="center">
  <img src="./assets/demo.gif" alt="PinFlow demo — click an element, capture context, resolve to source" />
</p>

---

**PinFlow gives coding agents source-exact runtime context from your running frontend.**

Click the UI, describe what should change, and PinFlow turns that moment into a queued task with source file, line, component, props, state, DOM, and your instruction. Or let Codex, Claude, or any MCP-compatible agent query a source location and see what is live in the browser before it edits. The result is a tighter loop: less guessing, fewer wrong files, and clearer verification after every change.

PinFlow is built on the original [PinFlow](https://github.com/patchorbit/pinflow) source-mapping foundation. This fork productizes that foundation into a visual review surface, queueing workflow, dispatch controls, Codex/Claude setup, and repo-ready packages for real frontend projects.

> [!NOTE]
> Historical compatibility names remain where they protect existing setups: package scopes, CLI aliases, MCP keys, and local artifact paths may still expose `pinflow` during the migration window. The product language, UI, docs, and workflow here are PinFlow-first.

---

## Getting Started

```bash
npx pinflow init
```

The setup wizard walks through the two things PinFlow needs:

1. **Connect your coding agent** - choose `Codex`, `Claude`, or another MCP-compatible setup, then install the matching plugin/config.
2. **Add PinFlow to your app** - choose the framework and bundler, install the right package, and apply the shown config snippet.

Start your dev server, open the app in the browser, and the PinFlow overlay is ready to capture context.

- Installed command: `pinflow init`
- No-install command: `npx pinflow init`

> Prefer manual setup or need finer control? See [Manual Setup](#manual-setup).

---

## Why PinFlow

- **UI changes become precise agent tasks.** Pick an element, region, or multi-selection and send an instruction with exact source and runtime context.
- **Code can ask the browser for evidence.** `pinflow.query.bySource` lets an agent inspect live DOM, props, state, and rendered attributes for a file and line.
- **The workflow stays repo-local.** Annotations live in `.pinflow/annotations/`, move through queue states, and are exposed through REST, WebSocket, and MCP.
- **It is safe for production builds.** Instrumentation is development-only and stripped in production.

---

## Visual Workflows

### UI -> Code: Point And Tell

Click any element in the running app, describe the change in plain English, and submit. PinFlow captures the source location, component metadata, runtime context, and your instruction as a repo-local annotation. The agent claims it, edits the exact file, and streams status back to the overlay.

<p align="center">
  <img src="./assets/ui-to-code.png" alt="UI to Code workflow: pick a rendered element, write an instruction, and send a source-exact task to a coding agent" width="920" />
</p>

### Code -> UI: Let The Agent See The Browser

Your agent calls `pinflow.query.bySource` with a file path and line number. PinFlow resolves that source location against the active browser and returns live DOM, props, component state, rendered attributes, and source metadata before the agent edits.

<p align="center">
  <img src="./assets/code-to-ui.png" alt="Code to UI workflow: an agent queries a source location and receives live runtime context from the browser" width="920" />
</p>

> [!TIP]
> Agents do not query runtime state automatically. Prompt them explicitly:
> _"Fix the button color. Use `pinflow.query.bySource` to inspect the live runtime context before changing the file."_
> Keep the target page open in the browser while the agent works.

---

## Core Features

- **Build-time stable IDs** - deterministic `data-ds` attributes injected via AST, stable across HMR and fast refresh
- **Deep runtime capture** - live props, state, component metadata, and DOM snapshots via React fiber walking and Vue VNode inspection
- **Framework-agnostic adapters** - React 18-19, Vue 3, Next.js 15-16, Nuxt 3+, plus an [extensible adapter interface](./packages/pinflow-runtime/CUSTOM_ADAPTERS.md)
- **Bundler coverage** - Vite 5-7, Webpack 5, and Turbopack
- **Agent workflow** - queue, claim, process, respond, retry, undo, and failure states exposed to the overlay and MCP clients
- **PII redaction** - emails, tokens, and sensitive patterns are scrubbed before leaving the browser
- **Real-time feedback** - WebSocket relay streams agent responses and workflow updates back to the overlay
- **Zero production impact** - development instrumentation is removed from production builds and enforced in CI

---

## Workflow And Settings

PinFlow is designed for the moment where a developer is looking at the browser and wants the agent to work from the same context.

| Control          | What it does                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Picker modes     | Choose element, region, or multi-select capture depending on how specific the instruction needs to be. |
| Dispatch channel | Send work to Codex, Claude, or keep it in "collect only" mode when you want to batch notes first.      |
| Queue state      | Follow annotations from queued to claimed, processing, processed, failed, or undone.                   |
| Undo             | Revert local selections or create a follow-up reversal task for work that has already been processed.  |
| Session settings | Keep agent choice, dispatch behavior, and workflow defaults visible without making the composer noisy. |

If the relay or browser connection is missing, PinFlow should make that state clear: the overlay can still collect useful context, but agent processing needs the local relay and MCP connection to be running.

---

## Local Preview

Use the canonical preview flow to rebuild PinFlow, publish the current packages into a local preview registry, reinstall the fixture, and start a Vite React preview:

```bash
pnpm run pinflow:preview:vite-react
```

This is the preferred path when verifying the current overlay UI, settings, queue behavior, and README-facing workflow claims against a real browser fixture.

---

## Manual Setup

> [!NOTE]
> `npx pinflow init` handles both steps below automatically. Use manual setup only if you need finer control.

If you already installed the CLI package globally or through your toolchain, prefer `pinflow init`. Older local configs may still resolve through compatibility aliases, but new setup docs should use PinFlow-facing commands.

PinFlow has two sides: **app-side** (bundler + framework plugins) and **agent-side** (MCP for your coding agent). Both are needed for the full workflow.

### App-Side — Add to Your Bundler

<details>
<summary><strong>Next.js (15 + 16)</strong> — <code>npm install -D @pinflow/next</code></summary>

```ts
// next.config.ts
import type { NextConfig } from 'next';
import { withPinFlow } from '@pinflow/next';

const nextConfig: NextConfig = {};

export default withPinFlow()(nextConfig);
```

</details>

<details>
<summary><strong>Nuxt 3+</strong> — <code>npm install -D @pinflow/nuxt</code></summary>

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinflow/nuxt'],
});
```

</details>

<details>
<summary><strong>React 18–19</strong> — <code>npm install -D @pinflow/react</code></summary>

Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';

export default defineConfig({
  plugins: [react(), pinflow()],
});
```

Webpack plugin:

```js
// webpack.config.js
const { PinFlowWebpackPlugin } = require('@pinflow/react/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@pinflow/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
    ],
  },
  plugins: [
    new PinFlowWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};
```

</details>

<details>
<summary><strong>Vue 3+</strong> — <code>npm install -D @pinflow/vue</code></summary>

Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pinflow } from '@pinflow/vue/vite';

export default defineConfig({
  plugins: [vue(), pinflow()],
});
```

Webpack plugin:

```js
// webpack.config.js
const { PinFlowWebpackPlugin } = require('@pinflow/vue/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@pinflow/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
    ],
  },
  plugins: [
    new PinFlowWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};
```

</details>

<details>
<summary><strong>Any framework</strong> — <code>npm install -D @pinflow/transform</code> (DOM→source mapping only, no runtime capture)</summary>

Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { pinflow } from '@pinflow/transform/plugins/vite';

export default defineConfig({
  plugins: [pinflow()],
});
```

Webpack plugin:

```js
// webpack.config.js
const { PinFlowWebpackPlugin } = require('@pinflow/transform/plugins/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@pinflow/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
    ],
  },
  plugins: [
    new PinFlowWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};
```

</details>

> **Working examples:** See [`packages/pinflow-test-fixtures/fixtures/`](./packages/pinflow-test-fixtures/fixtures/) for the current compatibility fixtures across every supported framework and bundler combination.

For plugin configuration options, see the current compatibility package docs in the [`@pinflow/transform` README](./packages/pinflow-transform/README.md).

#### Monorepos

If your frontend app is in a subdirectory (e.g. `apps/web`), pass `--app-root` during init:

```bash
npx pinflow init --app-root apps/web
```

Or run `npx pinflow init` and follow the prompts — the wizard asks if you're in a monorepo.

This creates a `pinflow.config.json` at your repo root that tells PinFlow where your app lives. CLI commands (`serve`, `stop`, `status`) and agent MCP connections automatically resolve the app root from this config — no extra flags needed.

### Agent-Side — Connect Your Coding Agent

PinFlow exposes 12 tools and 4 prompts via MCP. The preferred product-facing MCP namespace is now `pinflow`, while `pinflow.*` remains available as a temporary compatibility alias during the migration window.

#### Claude Code

```shell
claude plugin marketplace add Dom-303/pinflow
claude plugin install pinflow@pinflow
```

#### Codex

Codex support is provided in this fork via the included `.codex-plugin/plugin.json` and [AGENTS.md](./AGENTS.md).

#### Any agent (Skills and MCP)

Install the PinFlow skills:

```sh
npx skills add Dom-303/pinflow
```

Then add this MCP config to your agent:

```json
{
  "mcpServers": {
    "pinflow": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@pinflow/mcp"]
    }
  }
}
```

Preferred installed MCP binary: `pinflow-mcp`  
Preferred MCP server key: `pinflow`
Compatibility aliases remain available for older `pinflow.*` MCP clients

---

## How It Works

<p align="center">
  <img src="./assets/architecture.png" alt="PinFlow architecture diagram showing source app, bundler plugin, manifest, runtime, overlay, relay, repo queue, and agents" width="940" />
</p>

**1. Inject.** The bundler plugin parses each source file, injects HMR-stable `data-ds` IDs via xxhash64, and records each mapping in `.pinflow/manifest.jsonl`.

**2. Capture.** Framework adapters (React fiber walking, Vue VNode inspection) extract live props, state, and component metadata. The overlay UI lets you click any element and see its full context.

**3. Relay.** A localhost Fastify daemon connects the browser and your agent via REST, WebSocket, and MCP stdio. A file lock prevents duplicate instances across dev server restarts.

**4. Agent.** Your coding agent connects via MCP to **query by source** (see what any line looks like live) or **process annotations** (claim, implement, and respond to UI change requests).

---

## PinFlow And The Original Foundation

PinFlow keeps attribution to the original [PinFlow](https://github.com/patchorbit/pinflow) foundation because the source-mapped runtime layer matters. The difference is product focus: this repo turns that foundation into a usable agent workflow for daily frontend development.

| Area                  | Original foundation                        | PinFlow in this repo                                                           |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| Core capability       | Source-mapped DOM/runtime context          | Source-exact context plus visual task capture                                  |
| Product surface       | Lower-level runtime and integration pieces | Polished overlay, picker modes, composer, queue, dispatch, settings            |
| Agent workflow        | MCP-facing primitives                      | Codex/Claude-ready flow with annotations, status updates, undo, and responses  |
| Repository experience | Technical foundation docs                  | Friend-ready GitHub README, visual diagrams, setup path, packages, comparisons |
| Compatibility         | Proven source-mapping base                 | Keeps compatibility aliases while moving visible product language to PinFlow   |

---

## Market Comparison

| Feature               | PinFlow                                      | [Stagewise](https://github.com/stagewise-io/stagewise) | [DevInspector MCP](https://github.com/mcpc-tech/dev-inspector-mcp) | [React Grab](https://github.com/aidenybai/react-grab) | [Frontman](https://github.com/frontman-ai/frontman) |
| --------------------- | -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| Build-time stable IDs | ✅ `data-ds` via AST                         | ❌ Runtime (CDP)                                       | ❌ No stable IDs                                                   | ❌ `_debugSource`                                     | ❌ Runtime framework introspection                  |
| DOM→source manifest   | ✅ JSONL, append-only                        | ❌                                                     | ❌                                                                 | ❌                                                    | ❌                                                  |
| Code→live DOM query   | ✅ Agent queries source, gets live runtime   | ❌                                                     | ❌                                                                 | ❌                                                    | ❌                                                  |
| Runtime props/state   | ✅ Fiber + VNode walking                     | ⚠️ Shallow                                             | ⚠️ DOM-level + JS eval                                             | ❌ HTML + component names only                        | ⚠️ Props only (framework APIs)                      |
| Multi-framework       | ✅ React · Vue · Next.js · Nuxt · extensible | ⚠️ React only                                          | ✅ React + Vue + Svelte + Solid + Preact                           | ❌ React only                                         | ⚠️ Next.js + Astro + Vite                           |
| Multi-bundler         | ✅ Vite + Webpack + Turbopack                | ❌ N/A (Electron browser)                              | ✅ Vite + Webpack + Turbopack                                      | ❌ N/A                                                | ❌ Dev server middleware                            |
| MCP tools             | ✅ 12 tools + 4 prompts                      | ❌ Proprietary protocol (Karton)                       | ✅ 9 tools                                                         | ⚠️ Lightweight add-on                                 | ❌ Internal MCP only                                |
| Agent-agnostic        | ✅ Any MCP client                            | ❌ Bundled Electron agent                              | ✅                                                                 | ✅                                                    | ❌ Bundled Elixir agent                             |
| In-app element picker | ✅ Lit shadow DOM                            | ✅ Built-in browser selector                           | ✅ Inspector bar                                                   | ✅ Hover-to-capture                                   | ✅ Chat interface                                   |
| Source mapping        | ✅ Deterministic (AST IDs)                   | ⚠️ AI-inferred                                         | ⚠️ AST-injected (not stable)                                       | ⚠️ `_debugSource` (workaround needed)                 | ⚠️ Runtime framework introspection                  |
| License               | ✅ MIT                                       | ⚠️ AGPL                                                | ✅ MIT                                                             | ✅ MIT                                                | ⚠️ Apache + AGPL                                    |

No single competitor combines build-time stable IDs, deep runtime capture, bidirectional source↔DOM querying, and an MCP tool surface in a framework-agnostic way.

---

## MCP Tools

| Tool                              | Description                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `pinflow.query.bySource`          | Query a source file + line and get live runtime context (props, state, DOM snapshot)    |
| `pinflow.manifest.query`          | Find manifest entries by file path, component name, or element ID                       |
| `pinflow.manifest.stats`          | Manifest coverage statistics (entry count, file count, component count, cache hit rate) |
| `pinflow.resolve`                 | Resolve a `data-ds` element ID to its source location (file, line, col, component)      |
| `pinflow.resolve.batch`           | Resolve multiple element IDs in one call                                                |
| `pinflow.annotation.process`      | Atomically claim the next queued annotation (prevents concurrent agent conflicts)       |
| `pinflow.annotation.respond`      | Attach agent response and transition to `PROCESSED`                                     |
| `pinflow.annotation.updateStatus` | Manually transition annotation status                                                   |
| `pinflow.annotation.get`          | Retrieve annotation by ID                                                               |
| `pinflow.annotation.list`         | List annotations with status/filter options                                             |
| `pinflow.annotation.search`       | Full-text search across annotation content                                              |
| `pinflow.status`                  | Relay daemon health, manifest stats, queue counts                                       |

See the compatibility package docs in the [`@pinflow/mcp` README](./packages/pinflow-mcp/README.md) for detailed tool schemas, response formats, and prompt definitions.

---

## Packages

| Package                  | Description                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `@pinflow/core`          | Zod schemas, RFC 7807 error system, ID generation, PII redaction, constants         |
| `@pinflow/manifest`      | Append-only JSONL manifest, IDStabilizer (xxhash64), BatchWriter, ManifestCompactor |
| `@pinflow/relay`         | Fastify HTTP/WS server, MCP stdio adapter, annotation lifecycle                     |
| `@pinflow/transform`     | Parser-agnostic AST injection (Acorn, Babel, VueSFC), bundler plugins               |
| `@pinflow/runtime`       | Browser-side ElementTracker, ContextCapturer, BridgeDispatch                        |
| `@pinflow/overlay`       | Lit web components (shadow DOM), element picker, annotation UI                      |
| `@pinflow/react`         | React fiber walking, props/state extraction, Vite + Webpack plugins                 |
| `@pinflow/vue`           | Vue 3 VNode resolution, Composition + Options API support, Vite + Webpack plugins   |
| `@pinflow/next`          | `withPinFlow()` config wrapper for Next.js 15 + 16                                  |
| `@pinflow/nuxt`          | Nuxt 3+ module with auto-relay and runtime plugin                                   |
| `pinflow`                | Command-line entrypoint for `serve`, `status`, `stop`, `init`, and `mcp`            |
| `@pinflow/mcp`           | Standalone MCP package. Preferred product binary is `pinflow-mcp`                   |
| `@pinflow/test-fixtures` | Black-box integration + e2e suite (not published)                                   |

---

## Contributing

```bash
pnpm install
nx run-many -t build test lint typecheck
```

Conventions are in `.claude/rules/`. PRs welcome.

---

## License

[MIT](./LICENSE)
