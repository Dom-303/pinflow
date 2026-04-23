import('../../../../../pinflow-overlay/src/index.ts?v=pinflow-ui-2026-04-24a')
  .then((module) => module.initOverlay())
  .catch((error) =>
    console.warn(
      '[pinflow] Failed to load overlay:',
      error instanceof Error ? error.message : String(error),
    ),
  );
