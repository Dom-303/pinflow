# 01 PinFlow Brand Foundation

## Goal

Introduce `PinFlow` as the visible product name across the repo, docs, plugin surfaces, and GitHub presence while keeping the internal technical `domscribe` foundation intact.

## Why First

This creates a coherent public identity immediately without destabilizing the codebase.

It also gives all later UI and workflow work a clear product direction:

- product name: `PinFlow`
- claim: `Pin it, flow it, ship it.`
- positioning: visual review and change workflow for live web apps
- primary agent paths: `Codex` and `Claude`
- product stance: neutral and reusable across many projects

## Now

- Rename visible product references in `README.md`
- Update visible plugin metadata to use `PinFlow`
- Add PinFlow wording to key docs and onboarding surfaces
- Keep `AGENTS.md` aligned with the PinFlow direction
- Rename the GitHub fork presentation to `PinFlow`
- Point visible repo links at the branded fork instead of upstream Patch Orbit URLs where appropriate
- Remove `Cursor` as a first-class promoted path
- Remove Cursor-specific plugin/marketplace surfaces from the fork
- Keep `Claude` support
- Keep `Codex` support and expand it

## Soon

- Replace Domscribe logos and hero branding in docs/assets where appropriate
- Introduce a short product description tuned to PinFlow rather than upstream Domscribe language
- Adjust screenshots, badges, and install guidance to center `Codex + Claude`

## Later

- Decide whether the repository itself should permanently stay as a branded fork
- Decide whether package scopes or published artifact names need eventual renaming

## Explicit Non-Goals

- Do not rename `@domscribe/*` packages in this phase
- Do not rename `.domscribe/` artifacts in this phase
- Do not rename MCP tool names in this phase
- Do not change CLI command names in this phase

## Rename Layers

### Layer 1: Visible Naming

Safe now:

- README title
- plugin display names
- repo description
- GitHub repo name
- docs wording
- UI strings

### Layer 2: Product Behavior

Do next:

- overlay labels
- queue language
- agent status wording
- product-specific workflow descriptions

### Layer 3: Technical Namespace

Do only if justified later:

- package names
- CLI names
- artifact directory names
- MCP tool namespaces

## Exit Criteria

- A new visitor sees `PinFlow` first, not `Domscribe`
- Repo/docs clearly describe `Codex + Claude` as the main agent paths
- Cursor is no longer treated as a primary surface
- Internal compatibility with upstream `domscribe` remains intact
