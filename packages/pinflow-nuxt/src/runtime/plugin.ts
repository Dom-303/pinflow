/**
 * Client-only Nuxt plugin that initializes RuntimeManager with VueAdapter
 * and optionally starts the overlay if configured by the module.
 *
 * @module @domscribe/nuxt/runtime/plugin
 */
import { defineNuxtPlugin } from '#imports';
import { RuntimeManager } from '@domscribe/runtime';
import { createVueAdapter } from '@domscribe/vue';

export default defineNuxtPlugin(async () => {
  RuntimeManager.getInstance().initialize({
    adapter: createVueAdapter({}),
  });

  // Initialize overlay if options were injected by the module's head script
  if (window.__DOMSCRIBE_OVERLAY_OPTIONS__) {
    try {
      const { initOverlay } = await import('@domscribe/overlay');
      await initOverlay();
    } catch (e) {
      console.warn(
        '[domscribe/nuxt] Failed to init overlay:',
        e instanceof Error ? e.message : String(e),
      );
    }
  }
});
