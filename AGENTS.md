# PinFlow For Codex

This repository is the `PinFlow` product fork, built on top of the upstream PinFlow workspace and adapted for Codex-based development.

## What This Repo Is

PinFlow is a visual review and change workflow for live web apps. It is built on top of the PinFlow source-mapped runtime foundation and passes UI context into coding-agent workflows.

Main packages:

- `packages/pinflow-core`
- `packages/pinflow-manifest`
- `packages/pinflow-runtime`
- `packages/pinflow-relay`
- `packages/pinflow-overlay`
- `packages/pinflow-transform`
- `packages/pinflow-react`
- `packages/pinflow-vue`
- `packages/pinflow-mcp`

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
- Treat PinFlow as the upstream foundation repo, not as the active product surface in this fork and not as an EventBaer app repo.

## PinFlow Direction

This fork is being adapted into `PinFlow` as a Codex- and Claude-friendly multi-project preview/review tool.

Current goals:

- Add Codex-native repo onboarding.
- Keep Claude as a first-class supported agent path.
- Prepare for future UI customization, localization, and workflow refinement without unnecessary upstream drift.
