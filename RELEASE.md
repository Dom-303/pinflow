# PinFlow Release Guide

PinFlow releases publish the CLI package `pinflow` and the public scoped
packages under `@pinflow/*`.

## Preflight

Run from the repository root with Node.js 20+ and pnpm 9:

```bash
pnpm install --frozen-lockfile
pnpm run release:check
```

If Nx plugin workers fail locally on Linux/ARM or inside a restricted shell,
the release check defaults `NX_ISOLATE_PLUGINS=false`. CI uses the same setting
so local and GitHub verification stay aligned.

## Fresh Install Smoke Test

Before tagging, publish to the local Verdaccio registry and install at least one
fixture from the generated packages:

```bash
pnpm run registry:publish
FIXTURE_ID=vite-v5-react-18-ts pnpm run registry:install
```

For broader confidence, run the fixture matrix that mirrors CI:

```bash
pnpm run pipeline:integration
pnpm run pipeline:e2e
```

## Agent Smoke Test

Use a fresh frontend fixture or a small real app:

1. Run `npx pinflow init`.
2. Choose Codex, Claude, or manual MCP setup.
3. Start the app's dev server.
4. Open the app in the browser and create one annotation.
5. Ask the agent to call `pinflow.annotation.process`.
6. Verify that the agent receives source file, line, DOM, props/state context
   when available, and the original instruction.
7. Complete the annotation with `pinflow.annotation.respond`.

## Publish

The GitHub publish workflow runs on version tags:

```bash
pnpm run release:patch
git push origin main --follow-tags
```

Use `release:minor` or `release:major` when the public API changes require it.
The workflow publishes to npm with provenance and creates a GitHub Release.

## Manual Checks Before Public Announcement

- GitHub Actions `CI` is green on `main`.
- GitHub Actions `Publish` is green on the release tag.
- `https://www.npmjs.com/package/pinflow` resolves to the released version.
- Scoped packages such as `@pinflow/react`, `@pinflow/relay`, and
  `@pinflow/mcp` resolve publicly.
- README quickstart works in a fresh project.
- `.pinflow/` stays ignored in the consuming app.
