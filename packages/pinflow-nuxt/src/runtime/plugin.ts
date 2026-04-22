/**
 * Client-only Nuxt plugin that initializes RuntimeManager with VueAdapter
 * and optionally starts the overlay if configured by the module.
 *
 * @module @pinflow/nuxt/runtime/plugin
 */
import { defineNuxtPlugin } from '#imports';
import { RuntimeManager } from '@pinflow/runtime';
import { createVueAdapter } from '@pinflow/vue';

export default defineNuxtPlugin(async () => {
  RuntimeManager.getInstance().initialize({
    adapter: createVueAdapter({}),
  });

  // Initialize overlay if options were injected by the module's head script
  const win = window as unknown as Window & Record<string, unknown>;
  if (win.__PINFLOW_OVERLAY_OPTIONS__) {
    try {
      const { initOverlay } = await import('@pinflow/overlay');
      await initOverlay();
    } catch (e) {
      console.warn(
        '[pinflow/nuxt] Failed to init overlay:',
        e instanceof Error ? e.message : String(e),
      );
    }
  }
});
