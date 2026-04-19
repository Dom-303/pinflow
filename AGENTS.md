# PinFlow For Codex

This repository is the `PinFlow` fork, built on top of the upstream Domscribe workspace and adapted for Codex-based development.

## What This Repo Is

PinFlow is a visual review and change workflow for live web apps. It is built on top of the Domscribe source-mapped runtime foundation and passes UI context to coding agents.

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

## PinFlow Direction

This fork is being adapted into `PinFlow` as a Codex- and Claude-friendly multi-project preview/review tool.

Current goals:

- Add Codex-native repo onboarding.
- Keep Claude as a first-class supported agent path.
- Prepare for future UI customization, localization, and workflow refinement without unnecessary upstream drift.
