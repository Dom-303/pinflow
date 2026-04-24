# Preview Pipeline — Heads-up

Loads automatically when working in any of the preview-critical paths
(see **Scope** below). Not a blocker, just context: the overlay preview
is easy to break silently, and three historical regressions keep coming
back when nobody notices the upstream change.

Read the shape before editing. Re-run the check after. That's it.

## What is the preview pipeline?

`pnpm pinflow:preview` serves the react-18-ts fixture and loads the
overlay + React runtime **directly from workspace TypeScript source**,
not from the bundled `@pinflow/*` packages used by integration and e2e
tests. This is how you look at the real overlay UI while iterating.

Because it bypasses the `tsc` build, three things that `@nx/js:tsc`
normally handles quietly become Vite's problem — and silently break it
when a seemingly unrelated setting changes.

## The three failure modes (historical)

1. **pnpm peer resolution × `preserveSymlinks: true`**
   - `lit` is a pnpm symlink; its transitive deps (`lit-html`,
     `@lit/reactive-element`) live as siblings in the `.pnpm/lit@x.x.x/`
     tree. With `preserveSymlinks: true` esbuild refuses to follow the
     symlink and can't find them.
   - Fix baked in: `resolve.preserveSymlinks: false` via
     `pinflowLocalPreviewViteConfig()`.

2. **Legacy decorator transform × auto-discovered tsconfig**
   - Lit uses `@customElement('ds-overlay')` which is a TC39-stage-1
     legacy decorator. esbuild only auto-finds the empty
     references-only `tsconfig.json` of each workspace package and
     skips the real `tsconfig.lib.json`, so it parses the decorator as
     stage-3 and throws "Invalid or unexpected token".
   - Fix baked in: `esbuild.tsconfigRaw` with
     `experimentalDecorators: true` + `useDefineForClassFields: false`.

3. **Vite module-graph split × stray `?v=` query**
   - Vite propagates a URL's `?v=` query into relative child imports
     inconsistently (depends on request order and optimize-deps cache).
     A manual cache tag on init imports produced two URLs for the same
     `ds-overlay.ts` file — and the top-level `@customElement` ran
     twice, throwing "has already been used with this registry".
   - Fix baked in: no query on init imports; Vite's ETag/timestamp HMR
     handles cache invalidation.

## Paths this rule watches (Scope)

Changes here often cascade into preview breakage:

- `packages/pinflow-overlay/**` — lit components + init
- `packages/pinflow-react/src/vite/**` — the Vite plugin that injects
  overlay init; its `import('@pinflow/overlay')` bare specifier must
  keep a single module identity with the workspace-source path
- `packages/pinflow-runtime/src/**` — RuntimeManager initialization
- `packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts/**` —
  the preview fixture (its `vite.config.ts`, the init shims)
- `packages/pinflow-test-fixtures/shared/pinflow-local-workspace-overrides.ts` —
  the helper that re-applies the three settings and rewrites init imports
- `scripts/pinflow-preview.ts` — preview orchestration + smoke check
- `tsconfig.base.json` — shared compiler options
- `.verdaccio/config.yml` — preview uses the local registry

## What guards this right now

| Layer | Catches | Where |
|---|---|---|
| Unit spec (vitest) | Helper function values drift (preserveSymlinks, optimizeDeps.exclude, decorator options, URL query shape) | `packages/pinflow-test-fixtures/shared/pinflow-local-workspace-overrides.spec.ts` |
| HTTP smoke check | Module returns 5xx / missing `__decorateClass` marker | `scripts/pinflow-preview.ts` (runs automatically after `pnpm pinflow:preview`) |
| Browser e2e | `<ds-overlay>` mounts exactly once, no fatal console signatures during boot | `packages/pinflow-test-fixtures/e2e/preview-overlay-boot.spec.ts` |
| CI | All three above run on PR via the existing e2e matrix row for `vite-v5-react-18-ts` | `.github/workflows/ci.yml` |

## Before you merge a change in these paths

```bash
pnpm pinflow:preview:e2e    # ~3s — needs chromium installed once via
                             #   pnpm --filter @pinflow/test-fixtures exec playwright install chromium
```

If that's green, the preview is safe. If it fails, the signatures in
the spec point at which of the three modes broke.

## What NOT to do

- Don't re-introduce a `?v=` cache tag on init-import URLs — it split
  the Vite module graph last time and caused double custom-element
  registration. Vite's HMR handles cache invalidation already.
- Don't set `resolve.preserveSymlinks: true` in the preview fixture —
  lit's transitive deps become unreachable.
- Don't remove entries from the `optimizeDeps.exclude` list in
  `pinflowLocalPreviewViteConfig()` without verifying the preview still
  loads — the prebundler produces 504s on workspace-source imports.
- Don't change `experimentalDecorators` / `useDefineForClassFields` in
  the preview fixture's esbuild settings — lit's `@customElement`
  breaks immediately.

## Scope note

These settings are **preview-mode only**. The bundled-mode fixtures
(`react-18-js`, `vue-3-*`) keep `preserveSymlinks: true` on purpose —
that's how the integration / e2e black-box tests pin production install
behavior. Don't blanket-apply the preview settings across fixtures.
