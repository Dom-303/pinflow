import('@pinflow/overlay?v=pinflow-ui-2026-04-23b')
  .then((module) => module.initOverlay())
  .catch((error) =>
    console.warn(
      '[pinflow] Failed to load overlay:',
      error instanceof Error ? error.message : String(error),
    ),
  );
