# Marketplace Release Checklist (Phase 4E)

This document captures the user-facing steps that finish the first
Marketplace release. Run them in order on the merged `main` branch.

## 0 · Prerequisites

- `vsce` CLI ready: `pnpm dlx @vscode/vsce --version`
- Marketplace publisher `dom-303` is verified and signed in:
  `pnpm dlx @vscode/vsce login dom-303` (one-time per machine)
- npm credentials available for `@pinflow` scope:
  `npm whoami --registry=https://registry.npmjs.org` should print your
  npm user

## 1 · Decide on the LICENSE attribution

`packages/pinflow-vscode/LICENSE` and the repo-root `LICENSE` currently
list **Kaushik Gnanaskandan** (the original upstream author of the fork).
The Marketplace publisher is **dom-303**. Two options:

- **Keep upstream attribution** (acceptable for an MIT-licensed fork —
  upstream copyright must be preserved): leave both files as-is. Add a
  second line `Copyright (c) 2026 dom-303` to the package LICENSE if you
  also want your own copyright recorded.
- **Replace with your attribution**: only do this if you have a written
  agreement transferring or relicensing the upstream copyright.

Pick one before publishing. (We didn't auto-edit LICENSE — legal-sensitive.)

## 2 · Publish `@pinflow/*` packages to public npm

The Marketplace VSIX bundles only the extension. Host projects install the
PinFlow CLI separately via `npm i -D @pinflow/relay`. The cost-tracking
work in 4C lives in `@pinflow/relay`, so the public npm version needs
to be bumped from `0.6.0` (current public) to `0.6.1`.

```bash
# From the repo root, on main, after PR #17 + #18 are merged:

pnpm install
pnpm run release:check        # tests + lint + typecheck across the workspace

# Bump every workspace package to a fresh patch version (0.6.0 → 0.6.1).
# This rewrites package.json files but does not commit:
pnpm exec nx release version patch --skip-publish

# Inspect the diff, then commit + tag:
pnpm exec nx run sync-versions
git add -A
git commit -m "chore: release v0.6.1"
git tag v0.6.1

# Publish to public npm. Make sure your .npmrc does NOT point to Verdaccio
# in the shell where you publish:
pnpm exec nx run-many -t sync-dist
pnpm exec nx release publish

# Push the tag and commit:
git push --follow-tags
```

If you want a minor instead of a patch (0.6.0 → 0.7.0), swap
`version patch` for `version minor`.

## 3 · Build the VSIX

```bash
cd packages/pinflow-vscode
pnpm run package:vsix
# Writes ../../tmp/pinflow-vscode.vsix
```

Sanity-check what landed in the package:

```bash
pnpm dlx @vscode/vsce ls --no-dependencies
# Expected: package.json, README.md, LICENSE, CHANGELOG.md,
# walkthroughs/, media/, dist/extension.cjs, dist/runs-webview/*
```

## 4 · Smoke-test the VSIX locally

In a separate VS Code window:

```bash
code --install-extension tmp/pinflow-vscode.vsix
```

Open a workspace that already has `.pinflow/runs/...` evidence. Verify:

- Sidebar opens, runs render with status icons
- Click a run → expanded card shows transcript + diff list
- Click a changed file → native VS Code diff opens
- Run a fresh Codex annotation → after the run finishes the cost meta
  line appears: `codex · gpt-5.5 · ~12k tok · ~$0.05 · 30s`
- Toggle the **Compare** button in the sidebar header → cards turn into
  checkboxes
- Pick exactly two runs → compare panel renders above the list with
  side-by-side metadata + Δ strip
- Click a file in the compare panel → native diff opens for that run
- Toggle **Compare** off → selection clears, single-card-expand returns

## 5 · Publish to the Marketplace

```bash
cd packages/pinflow-vscode
pnpm dlx @vscode/vsce publish 0.1.0 --no-dependencies
```

`vsce` will upload the VSIX you just built. Watch for the publish URL it
prints. Wait 1–2 minutes for indexing, then verify the listing at:

  https://marketplace.visualstudio.com/items?itemName=dom-303.pinflow-vscode

Open it in VS Code itself (`Ctrl+Shift+X` → search "PinFlow") to confirm
the install button appears.

## 6 · Post-publish

- Tag the marketplace release in git:
  `git tag vscode-v0.1.0 && git push --tags`
- Announce in the relevant channels (PR description, Twitter/X, etc.)
- Watch GitHub Issues for first install bug reports
