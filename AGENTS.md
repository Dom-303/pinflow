# Domscribe For Codex

This repository is the upstream Domscribe workspace, adapted here for Codex-based development.

## What This Repo Is

Domscribe is a pixel-to-code development tool that maps running UI elements to their source locations and passes that context to coding agents.

Main packages:

- `packages/domscribe-core`
- `packages/domscribe-manifest`
- `packages/domscribe-runtime`
- `packages/domscribe-relay`
- `packages/domscribe-overlay`
- `packages/domscribe-transform`
- `packages/domscribe-react`
- `packages/domscribe-vue`
- `packages/domscribe-mcp`

## Existing Repo Guidance

This repo already contains contributor guidance in `CLAUDE.md` and `.claude/rules/`.
When working here with Codex, follow those existing engineering conventions unless the user explicitly asks otherwise.

Important existing conventions:

- Read before writing.
- Prefer schema-first design.
- Use named exports only.
- Respect package/module boundaries.
- Use `pnpm` and `nx` for workspace tasks.

## Codex Workflow

- Prefer reading the relevant package before editing.
- Prefer `pnpm nx ...` commands over ad-hoc package commands.
- Keep changes narrowly scoped to the package actually being adapted.
- Treat Domscribe as an upstream product repo, not an EventBaer app repo.

## EventBaer Adaptation Direction

This local branch is being used to adapt Domscribe for a Codex-centered workflow and a more customized multi-project preview/review setup.

Current goals:

- Add Codex-native repo onboarding.
- Support Codex as a first-class agent workflow alongside existing generic MCP usage.
- Prepare for future UI customization, localization, and workflow refinement without unnecessary upstream drift.
