# 08 PinFlow VS Code Extension Roadmap

## Goal

Build a VS Code extension that makes PinFlow's local execution loop visible
inside the editor without replacing the terminal workflow.

The terminal path remains the stable baseline:

```bash
pinflow dev
pinflow follow
```

The extension should add a clearer editor-native view of the same source of
truth: local run evidence in `.pinflow/runs/...`, relay status, runner status,
and real repository diffs.

## Product Principle

PinFlow is the visual input layer, but the local repository is the truth.

The extension must therefore prove three things clearly:

1. A browser annotation was received.
2. A local runner or visible external agent is working on it.
3. The result exists as a normal local file diff.

It should not create a second hidden execution system. It should sit on top of
the same relay, runner, external handoff commands, and run evidence folders
used by the CLI.

## Current Foundation

The repo already has the pieces the extension can build on:

- `pinflow dev` starts relay, runner, and the app dev server together.
- `pinflow follow` shows a minimal live terminal timeline.
- `pinflow follow --raw` keeps full debugging output available.
- `.pinflow/runs/YYYY-MM/YYYY-MM-DD/...` stores `prompt.md`,
  `transcript.log`, `diff.patch`, and `summary.json`.
- `pinflow external claim/complete/fail` prepares the path for visible
  editor-owned execution.
- The overlay can display repo evidence for completed or failed annotations.

## Phase 1: Extension Skeleton

Scope:

- Create a VS Code extension package in the workspace.
- Detect the active workspace folder.
- Detect whether the folder is a PinFlow app or a repo root with configured
  app root.
- Show a small status item: PinFlow ready, relay missing, or app not configured.
- Add commands:
  - `PinFlow: Open Panel`
  - `PinFlow: Follow Runs`
  - `PinFlow: Open Latest Run`

Expected outcome:

- The extension loads locally in VS Code.
- It can find the same workspace root that `pinflow follow` would use.

## Phase 2: PinFlow Panel

Scope:

- Add a VS Code sidebar or webview panel.
- Show current relay status.
- Show connected runner sessions.
- Show the latest active or completed run.
- Add a command that starts the standard two-terminal workflow:
  - Terminal 1: `pinflow dev`
  - Terminal 2: `pinflow follow`
- Keep copy short and user-facing, matching the minimal terminal language.

Expected outcome:

- A user can see whether PinFlow is idle, working, done, or failed without
  reading terminal output.
- A user can start the normal PinFlow workflow from VS Code without copying
  two terminal commands manually.

## Phase 3: Run Evidence Viewer

Scope:

- Read `.pinflow/runs/.../summary.json`.
- Open `prompt.md`, `transcript.log`, and `diff.patch` from the panel.
- Show changed files as editor links.
- Show a clear "Repo diff exists" indicator when a run produced a diff.

Expected outcome:

- The editor gives visual proof that PinFlow work landed in the local repo.
- Debug details stay one click away instead of being pushed into the default UI.

## Phase 4: Live Follow Timeline

Scope:

- Reuse the same minimal formatting policy as `pinflow follow`.
- Poll or watch the latest transcript and summary files.
- Show only key lifecycle events by default:
  - task started
  - short agent result
  - verification
  - done or failed
- Provide a raw/details view for debugging.

Expected outcome:

- The VS Code panel becomes the editor-native version of `pinflow follow`.

## Phase 5: External Agent Mode

Scope:

- Use `pinflow external claim --json` to claim work for a visible editor-owned
  session.
- Open the generated `prompt.md` for the user or for a provider extension.
- Let the user complete or fail the task from VS Code.
- Call `pinflow external complete` only after the local repo has a real diff.

Expected outcome:

- VS Code can own the visible execution surface without PinFlow starting a
  hidden CLI agent.
- Codex, Claude, Copilot, and other provider-specific flows can be integrated
  gradually instead of being hardcoded into PinFlow.

## Phase 6: Marketplace Preparation

Scope:

- Add extension icon, README, screenshots, and package metadata.
- Document the required local `pinflow` CLI.
- Add smoke tests for activation and workspace detection.
- Package with `vsce`.
- Publish only after manual approval.

Expected outcome:

- The extension is ready for local install and later VS Code Marketplace
  publication.

## Estimated Effort

| Scope                              | Estimate            |
| ---------------------------------- | ------------------- |
| MVP skeleton and basic panel       | 1-2 focused days    |
| Polished panel with evidence links | 3-5 focused days    |
| Marketplace packaging             | 0.5-1 focused day   |
| Provider chat automation           | separate research   |

Provider chat automation means automatically opening or steering a Codex,
Claude, or Copilot chat session. That part depends on what each provider
extension exposes. The safer first milestone is a strong PinFlow panel that
shows the truth: status, prompt, transcript, and local diff.

## Non-Goals For The First Version

- Do not replace `pinflow dev`.
- Do not hide local execution from the user.
- Do not require one specific model.
- Do not hardcode one provider as the only supported path.
- Do not mark work complete unless the local repo changed.

## Open Questions

- Should the extension launch `pinflow follow` internally, or read run evidence
  files directly?
- Should the first panel be a sidebar tree, a webview, or both?
- Which provider extensions expose a stable API for opening a visible chat?
- Should `pinflow dev` be able to open VS Code automatically when requested?
- Should the two-terminal command use visible VS Code terminals by default, or
  a terminal for `pinflow dev` plus a panel timeline for follow output?

## Recommended First Build

Start with a conservative VS Code extension:

1. Find the active PinFlow app.
2. Show relay/runner/run status.
3. Show latest run evidence.
4. Open changed files and `diff.patch`.
5. Add a VS Code command that opens the two standard terminals.
6. Add external handoff later.

This gives users editor-native transparency quickly, while keeping the terminal
workflow reliable and provider-neutral.
