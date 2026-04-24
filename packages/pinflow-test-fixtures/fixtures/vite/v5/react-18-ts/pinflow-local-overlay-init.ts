import('../../../../../pinflow-overlay/src/index.ts')
  .then((module) => module.initOverlay())
  .catch((error) =>
    console.warn(
      '[pinflow] Failed to load overlay:',
      error instanceof Error ? error.message : String(error),
    ),
  );
