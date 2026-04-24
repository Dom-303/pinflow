/**
 * Local workspace overrides for the pinflow preview pipeline.
 *
 * When a fixture imports the pinflow overlay / runtime directly from
 * workspace TypeScript sources (instead of from the published
 * `@pinflow/*` packages), three Vite settings must be flipped away from
 * their usual fixture defaults:
 *
 * 1. `resolve.preserveSymlinks: false` — pnpm stores transitive deps
 *    (e.g. `lit-html`, `@lit/reactive-element`) as siblings of `lit`
 *    inside `node_modules/.pnpm/lit@x.x.x/node_modules/`. With
 *    preserveSymlinks enabled esbuild refuses to follow the `lit`
 *    symlink and never reaches the siblings.
 * 2. `optimizeDeps.exclude` — Vite's prebundler cannot process the
 *    workspace sources correctly and writes broken entries into
 *    `.vite/deps`. Excluding the workspace packages makes Vite serve
 *    them as native ESM straight from disk.
 * 3. `esbuild.tsconfigRaw` — esbuild auto-discovers only the empty
 *    references-only `tsconfig.json` of each workspace package, so the
 *    lit `@customElement` legacy decorators throw "Invalid or
 *    unexpected token". Forcing `experimentalDecorators: true` +
 *    `useDefineForClassFields: false` matches what the `tsc` build
 *    uses.
 *
 * Fixtures that load pinflow through the usual npm-flat install (i.e.
 * all black-box test fixtures) must NOT use this helper — their
 * `preserveSymlinks: true` + default esbuild settings are correct.
 *
 * @module @pinflow/test-fixtures/shared/pinflow-local-workspace-overrides
 */

const OVERLAY_INIT_PATTERN =
  /import\((['"])\/@pinflow\/overlay-init\.js(?:\?[^'"]*)?\1\)/g;

const REACT_INIT_PATTERN =
  /import\((['"])\/@pinflow\/react-init\.js(?:\?[^'"]*)?\1\)/g;

const PINFLOW_WORKSPACE_PACKAGES = [
  '@pinflow/core',
  '@pinflow/runtime',
  '@pinflow/react',
  '@pinflow/relay',
  '@pinflow/manifest',
  '@pinflow/overlay',
] as const;

const LIT_WORKSPACE_PACKAGES = [
  'lit',
  'lit-html',
  'lit/decorators.js',
  '@lit/reactive-element',
] as const;

export const PINFLOW_LOCAL_PREVIEW_OPTIMIZE_DEPS_EXCLUDE = [
  ...PINFLOW_WORKSPACE_PACKAGES,
  ...LIT_WORKSPACE_PACKAGES,
] as const;

export const PINFLOW_LOCAL_PREVIEW_TSCONFIG_RAW = {
  compilerOptions: {
    experimentalDecorators: true,
    useDefineForClassFields: false,
  },
} as const;

export interface PinflowLocalPreviewViteConfig {
  readonly resolve: { readonly preserveSymlinks: false };
  readonly esbuild: { readonly tsconfigRaw: typeof PINFLOW_LOCAL_PREVIEW_TSCONFIG_RAW };
  readonly optimizeDeps: {
    readonly exclude: readonly string[];
  };
}

/**
 * Returns the Vite settings required for fixtures that import pinflow
 * overlay / runtime from workspace TypeScript sources.
 *
 * @remarks
 * Spread the returned object into a fixture's `defineConfig({...})`.
 * See module docs above for the rationale behind each setting.
 */
export function pinflowLocalPreviewViteConfig(): PinflowLocalPreviewViteConfig {
  return {
    resolve: { preserveSymlinks: false },
    esbuild: { tsconfigRaw: PINFLOW_LOCAL_PREVIEW_TSCONFIG_RAW },
    optimizeDeps: {
      exclude: [...PINFLOW_LOCAL_PREVIEW_OPTIMIZE_DEPS_EXCLUDE],
    },
  };
}

export function rewritePinflowInitImports(
  source: string,
  cacheTag: string,
): string {
  return source
    .replace(
      OVERLAY_INIT_PATTERN,
      `import('/pinflow-local-overlay-init.ts?v=${cacheTag}')`,
    )
    .replace(
      REACT_INIT_PATTERN,
      `import('/pinflow-local-react-init.ts?v=${cacheTag}')`,
    );
}
