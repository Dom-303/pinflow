/**
 * Auto-initialize Domscribe runtime + overlay from the loader preamble.
 *
 * This module replaces DomscribeDevProvider — it runs at module load time
 * instead of requiring a React component in the tree.  The turbopack loader
 * injects `import('@pinflow/next/auto-init').catch(function(){})` into
 * every transformed file, guarded by a `__DOMSCRIBE_AUTO_INIT__` flag to
 * ensure it only executes once.
 *
 * @module @pinflow/next/auto-init
 */

if (typeof window !== 'undefined') {
  // Initialize runtime + React adapter
  Promise.all([import('@pinflow/runtime'), import('@pinflow/react')])
    .then(([{ RuntimeManager }, { createReactAdapter }]) => {
      RuntimeManager.getInstance().initialize({
        adapter: createReactAdapter(),
      });
    })
    .catch(() => {
      // Never break the app
    });

  // Initialize overlay if configured (globals set by loader preamble)
  const win = globalThis as Record<string, unknown>;
  if (win['__DOMSCRIBE_OVERLAY_OPTIONS__']) {
    import('@pinflow/overlay')
      .then(({ initOverlay }) => {
        initOverlay();
      })
      .catch(() => {
        // Overlay is optional
      });
  }
}
