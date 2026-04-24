// ⚠️ Preview init shim — loaded by pnpm pinflow:preview.
// See the overlay init sibling; same caveats (no ?v=... query).
// .claude/rules/preview-pipeline.md explains the failure modes.
import { RuntimeManager } from '../../../../../pinflow-runtime/src/index.ts';
import { createReactAdapter } from '../../../../../pinflow-react/src/index.ts';

const resolvers = new Map();

RuntimeManager.getInstance()
  .initialize({
    phase: 1,
    debug: false,
    redactPII: true,
    blockSelectors: [],
    adapter: createReactAdapter({
      strategy: 'best-effort',
      maxTreeDepth: 50,
      includeWrappers: true,
      debug: false,
      hookNameResolvers: resolvers,
    }),
  })
  .catch((error) =>
    console.warn(
      '[pinflow] Failed to init React runtime:',
      error instanceof Error ? error.message : String(error),
    ),
  );

if (typeof window !== 'undefined' && window.__PINFLOW_OVERLAY_OPTIONS__) {
  import('./pinflow-local-overlay-init.ts').catch(() => {});
}
