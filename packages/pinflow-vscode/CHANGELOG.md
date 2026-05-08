# Changelog

All notable changes to the PinFlow VS Code extension are recorded here. The
format is loosely based on [Keep a Changelog](https://keepachangelog.com/);
versions follow [SemVer](https://semver.org/) starting with the first
Marketplace preview.

## [Unreleased]

## [0.1.0] — 2026-05-08

First public preview on the VS Code Marketplace.

### Added

- **Side-by-side run compare panel** — toggle Compare in the sidebar header to
  enter selection mode. Pick any two runs and a compare panel renders above
  the list with provider/model/cost/duration/files for each, plus a delta
  strip showing cost, token, duration, and shared-file overlap. File click
  opens the existing native diff for that run.
- **Per-run cost tracking** — every completed run now shows a compact meta
  line `codex · gpt-5.5 · 12.4k tok · ~$0.05 · 47s` on its card and detail
  view. The runner parses the agent transcript for the model header and
  total token count, and applies a blended per-million-token rate to surface
  an approximate USD cost. Older runs without metadata keep rendering as
  before.
- **Live transcripts + native diff viewer (4B)** — expanded run cards stream
  the agent transcript in real time and surface changed files with a
  one-click native VS Code diff against `HEAD`. Replaces the older
  "open three file tabs" pattern.
- **Compact run cards** — single-row summary, transcript hidden behind a
  toggle for completed runs, lifecycle pill matched to status.

### Changed

- Run summaries (`.pinflow/runs/.../summary.json`) gain optional `model`,
  `totalTokens`, `costUsd`, `durationMs` fields. Backwards compatible — old
  runs read fine, new metadata is opportunistic.

### Notes

- Currently Codex transcripts (OpenAI) are parsed for cost data. Anthropic
  Claude transcripts use a different format and aren't parsed yet — that's a
  follow-up if usage warrants it.
- Cost is a directional estimate based on a hardcoded blended rate per
  model. Treat it as a useful-enough signal, not an invoice.

## [0.0.x] — pre-Marketplace internal builds

Internal builds prior to the Marketplace preview, not published.
