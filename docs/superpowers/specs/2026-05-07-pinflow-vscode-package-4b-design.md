# PinFlow VS Code Extension — Package 4B: Live Logs + Diff Viewer

## Goal

Replace the current "open three separate file tabs" pattern (`prompt.md`, `transcript.log`, `diff.patch`) with editor-native, in-extension visibility. The user expands a run card in the sidebar and sees the agent working live; clicking a changed file opens VS Code's native diff view for that file. No tab clutter, no manual file navigation, no custom diff renderer.

## Why Now

After 4F (production hardening), the extension is publish-stable but the run-detail experience is still "open three tabs and read them yourself". 4B is the editor-native version of `pinflow follow` and the missing piece between "I see runs in the sidebar" and "I see what the agent did". Per the master roadmap (`docs/roadmaps/08-pinflow-vscode-extension-roadmap.md`), this is Phase 4 of 6 and one of the two remaining feature phases before publish (the other being 4C cost/multi-agent and 4D filter/search).

## Non-Goals (parked for later phases)

- **Custom HTML diff renderer** — `vscode.diff()` covers it; no reason to reinvent.
- **Reverse-patch reconstruction of pre-run file state** — `git:` URI as "before" works for the typical "agent edited working tree" case. Users who committed mid-run can use git log themselves.
- **Pagination / chunking for large transcripts** — Webviews handle 100KB+ without problems. If a transcript ever exceeds 1MB we revisit.
- **Relay WebSocket for live updates** — `FileSystemWatcher` on the local `.pinflow/` directory is the simpler source of truth for the same data.
- **Multi-run concurrent streaming** — accordion (single expansion) eliminates this question entirely.
- **Run-detail Webview Editor (full-tab side-by-side prompt+transcript+diff)** — bigger-effort polish; if user demand surfaces, becomes its own phase.
- **Diff syntax highlighting in the transcript pane** — transcript is plain text; this is intentional.

## Architectural Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Where logs render | **Inline run-card expansion** (port of folder-section accordion pattern) | Multi-run-friendly, no tab-sprawl, reuses proven UX from C.1.x sidebar |
| Update source | **`vscode.workspace.createFileSystemWatcher`** on the run's `transcript.log` and `diff.patch` (subscribed only while card is expanded) | Local files are the single source of truth; relay WS adds dependency without value |
| Diff viewer | **Native `vscode.diff(left, right, title)`** where `left` is a `git:` URI resolving to the file at `HEAD` (built-in git extension's content provider; exact URI construction goes in the implementation plan) and `right` is the workspace file URI; one call per changed file on click | Zero custom diff code, zero reverse-patch logic, side-by-side editor inherits VS Code's diff UX automatically. Fallback handles non-git workspaces. |
| Multi-run | **Accordion — only one run expanded at a time** | Avoids visual chaos and stream-concurrency complexity; matches user intent ("focus on one run") |
| Transcript rendering | **Plain `<pre>` with monospace + sticky-bottom-autoscroll** | Terminal-like; native scroll position behaviour; no third-party renderer |
| State persistence | **Currently-expanded run ID in webview localStorage** (extends C.1.13's pattern) | F5-reload preserves context |
| Diff-file fallback | If the `vscode.diff()` call throws (workspace isn't a git repo, file untracked, or `git:` provider unavailable), fall back to **opening the file directly** via `vscode.window.showTextDocument` with a one-line info-message toast | Robust against the corner cases without baking in special-case logic |

## Architecture

### File-level changes

```
packages/pinflow-vscode/
├── src/
│   ├── extension.ts                                          # MOD — register live-watcher lifecycle, wire diff command
│   ├── core/
│   │   ├── live-transcript-watcher.ts                        # NEW — encapsulates FileSystemWatcher per expanded run
│   │   ├── live-transcript-watcher.spec.ts                   # NEW
│   │   └── views/
│   │       ├── runs-webview-messages.ts                      # MOD — extend protocol with three new messages
│   │       └── runs-webview-provider.ts                      # MOD — handle expand/collapse, forward transcript chunks
│   ├── runs-webview/
│   │   └── components/
│   │       ├── pinflow-run-card.ts                           # MOD — internal `expanded` state, conditional detail render
│   │       ├── pinflow-run-card.spec.ts                      # MOD — assertions for expand/collapse
│   │       ├── pinflow-run-detail.ts                         # NEW — Lit component: transcript pane + changed-files list
│   │       ├── pinflow-run-detail.spec.ts                    # NEW
│   │       └── pinflow-runs-app.ts                           # MOD — track activeRunId, persist via existing localStorage hook
│   └── vscode.d.ts                                           # MOD — add `commands.executeCommand('vscode.diff', ...)` typing if needed
└── (no changes elsewhere)
```

### Component boundaries

**`live-transcript-watcher.ts`** (new) — the single seam for "watch a run's files".
- Constructor takes `runEvidence` (paths to `transcript.log`, `diff.patch`) and a callback `(event: TranscriptEvent) => void`.
- Internally creates two `FileSystemWatcher` instances + an initial async read on construction.
- Maintains `lastReadByteOffset` to compute deltas. If the file shrinks (truncation / rewrite, rare in our context), reset the offset to 0 and emit a fresh `transcript:initial` instead of an `append` — the webview replaces its buffer rather than appending garbage.
- Disposes everything on `dispose()`.
- Emits three events: `transcript:initial` (full content), `transcript:append` (delta from last read), `diff:update` (re-parsed diff metadata).
- No knowledge of the webview message protocol — just emits events. The provider translates.
- `isLive` flag derived from the run's status: `evidence.summary.status === 'processing'`. Watcher still creates watchers for finished runs (cheap; lets the diff update if user re-runs `pinflow apply`).

**`pinflow-run-detail.ts`** (new) — the inline detail Lit component.
- Props: `runId`, `transcriptText`, `changedFiles[]`, `promptPath`, `isLive`.
- Renders the transcript pane (sticky-bottom on append) and the changed-files list.
- Emits custom events: `pinflow-detail:open-diff` (with file path), `pinflow-detail:open-prompt`, `pinflow-detail:open-transcript`.
- No internal state for expansion — that lives in `pinflow-run-card`.

**`pinflow-run-card.ts`** (modified) — receives expansion state, doesn't own it.
- New Lit prop: `isExpanded: boolean` (set by the parent accordion authority, never internal).
- On click: emits the existing `pinflow-card:click` event with `{ runId }`; does **not** toggle anything itself.
- When `isExpanded` is true, conditionally renders `<pinflow-run-detail>` below the card body.
- This split keeps the card a presentation component — accordion semantics live in exactly one place.

**`pinflow-runs-app.ts`** (modified) — single accordion authority.
- Tracks `activeRunId` (the expanded run, or `null`).
- Persists in localStorage under `pinflow.runs.activeRunId` (key namespaced like the existing C.1.13 keys).
- Handles `pinflow-card:click` events: if a different run is clicked, collapse old + expand new; if same run clicked, collapse to `null`.
- Passes `isExpanded={card.runId === activeRunId}` into each rendered card.
- Sends `run:expand` / `run:collapse` to extension on transitions; never both for the same transition.

### Data flow

```
User clicks run-card "abc-123"
  ↓
pinflow-runs-app: activeRunId = "abc-123", localStorage write
  ↓ (postMessage)
extension receives { type: "run:expand", runId: "abc-123" }
  ↓
RunsWebviewProvider creates LiveTranscriptWatcher for that run
  ↓
Watcher emits transcript:initial { runId, text } on construction
  ↓ (postMessage)
webview receives { type: "transcript:initial", runId, text } → renders pane
  ↓
[transcript.log changes on disk]
  ↓
Watcher emits transcript:append { runId, delta }
  ↓ (postMessage)
webview appends, sticky-bottom keeps view at end
  ↓
User clicks a changed-file row
  ↓ (postMessage)
extension receives { type: "run:open-diff", filePath, runId }
  ↓
extension calls vscode.commands.executeCommand("vscode.diff", gitURI, fileURI, title)
  ↓
VS Code opens native side-by-side diff editor
```

### Webview ↔ Extension protocol additions

Extending the existing discriminated union (no breaking changes):

**`WebviewToExtMessage` — three additions:**
```ts
| { type: "run:expand"; runId: string }
| { type: "run:collapse"; runId: string }
| { type: "run:open-diff"; runId: string; filePath: string }
```

**`ExtToWebviewMessage` — three additions:**
```ts
| { type: "transcript:initial"; runId: string; text: string; isLive: boolean }
| { type: "transcript:append"; runId: string; delta: string }
| { type: "diff:update"; runId: string; changedFiles: ChangedFile[] }
```

`ChangedFile` shape mirrors what `run-evidence.ts` already parses. No schema duplication.

The existing `run:open-prompt` and `run:open-evidence-file` messages remain in use for the "Open prompt.md" and "Open transcript.log in editor" actions. No changes to existing messages.

### Multi-folder workspaces

The accordion authority lives at the workspace level, not per folder — only one run is expanded across the entire sidebar regardless of which folder it belongs to. The diff command resolves git URIs against the run's `appRoot` (already in `runEvidence`), not the active VS Code editor folder, so cross-folder runs don't accidentally diff against the wrong repo.

### Lifecycle and disposal

- The provider holds at most one `LiveTranscriptWatcher` instance at a time (since one run is expanded at a time).
- Switching runs: dispose old watcher, construct new.
- Webview disposal (e.g. window closed): dispose active watcher.
- No memory leaks possible because the watcher is owned by exactly one slot.

### Error handling

- Watcher creation failure (e.g. `transcript.log` doesn't exist yet for a brand-new run): emit `transcript:initial` with empty text and continue watching for the file's appearance.
- `vscode.diff()` throws (e.g. `git:` provider unavailable, or file untracked): caught at the command-call site, logged to the `PinFlow` output channel (registered in 4F), falls back to `vscode.window.showTextDocument(fileURI)` plus an info-message toast.
- File-watcher fires but file is deleted (rare): emit a `transcript:append` with no delta and `diff:update` with empty changed-files list.

## Testing Strategy

Per existing project conventions (`packages/pinflow-vscode/.claude/rules/testing.md` and the existing webview specs):

- **Unit tests** for `live-transcript-watcher.ts` with mocked `FileSystemWatcher` and `fs.readFile`:
  - emits `transcript:initial` on construction with full file content
  - emits `transcript:append` with byte-accurate delta when file grows
  - emits a fresh `transcript:initial` (not append) when file shrinks below `lastReadByteOffset`
  - re-parses diff and emits `diff:update` when `diff.patch` changes
  - `dispose()` removes both watchers and ignores subsequent change events
- **Lit component tests** for `pinflow-run-detail.ts` (happy-dom, like existing run-card spec):
  - renders transcript text in monospace `<pre>`
  - on `transcript:append` while scrolled to bottom, stays at bottom (sticky behaviour)
  - on `transcript:append` while user scrolled up, does **not** auto-scroll
  - changed-files list renders one row per file with additions/deletions counts
  - clicking a file row emits `pinflow-detail:open-diff` with the file path
- **Integration-style test** in `runs-webview-provider.spec.ts`:
  - `run:expand` from the webview triggers watcher creation and forwards `transcript:initial` to the webview
  - `run:collapse` disposes the watcher
  - switching from one expanded run to another disposes the old watcher exactly once
- **No e2e test** in `pinflow-test-fixtures` — the existing fixtures don't run the VS Code extension. We test through the same vitest suite as C.1.13/C.1.14.

## Out-of-Scope Notes

- Phase 4C (cost-tracking, multi-agent comparison) and 4D (filter/sort/search) build on the run-card structure 4B introduces but don't block on it.
- Phase 4E (marketplace polish, telemetry, walkthrough images) needs the screenshots referenced in the 4F handoff before it can run — independent of 4B.

## Estimated Effort

~1.5 focused days, broken into roughly equal halves: backend (watcher + protocol + extension wiring) and webview (detail component + accordion logic + persistence). No external dependencies, no new npm packages, no schema migrations.

## Open Questions

None at design time — all architectural questions were resolved by the design decisions above. Implementation-time questions (e.g. exact debounce interval for transcript watcher, sticky-bottom scroll-position threshold) belong in the implementation plan, not the spec.
