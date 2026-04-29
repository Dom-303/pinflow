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
  const win = window as unknown as Window & Record<string, unknown>;
  const runtimeOptions =
    typeof win.__PINFLOW_RUNTIME_OPTIONS__ === 'object' &&
    win.__PINFLOW_RUNTIME_OPTIONS__ !== null
      ? (win.__PINFLOW_RUNTIME_OPTIONS__ as Record<string, unknown>)
      : {};
  const adapterOptions =
    typeof win.__PINFLOW_ADAPTER_OPTIONS__ === 'object' &&
    win.__PINFLOW_ADAPTER_OPTIONS__ !== null
      ? (win.__PINFLOW_ADAPTER_OPTIONS__ as Record<string, unknown>)
      : {};

  RuntimeManager.getInstance().initialize({
    ...runtimeOptions,
    adapter: createVueAdapter({ ...adapterOptions }),
  });

  // Initialize overlay if options were injected by the module's head script
  if (win.__PINFLOW_OVERLAY_OPTIONS__) {
    try {
      const overlayPackage = '@pinflow/overlay';
      const { initOverlay } = await import(overlayPackage);
      await initOverlay();
    } catch (e) {
      console.warn(
        '[pinflow/nuxt] Failed to init overlay:',
        e instanceof Error ? e.message : String(e),
      );
    }
  }
});
