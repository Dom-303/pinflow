// ⚠️ Preview init shim — loaded by pnpm pinflow:preview.
// Do not add a ?v=... query here or in the react init shim; Vite's
// inconsistent query propagation splits the module graph and breaks
// overlay custom-element registration. See .claude/rules/preview-pipeline.md.
import('../../../../../pinflow-overlay/src/index.ts')
  .then((module) => module.initOverlay())
  .catch((error) =>
    console.warn(
      '[pinflow] Failed to load overlay:',
      error instanceof Error ? error.message : String(error),
    ),
  );
