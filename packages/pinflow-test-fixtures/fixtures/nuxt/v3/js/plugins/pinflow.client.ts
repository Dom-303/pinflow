/**
 * PinFlow Nuxt Plugin
 *
 * Client-side plugin that initializes the PinFlow runtime
 * and exposes smoke test utilities to the console.
 */

import { RuntimeManager } from '@pinflow/runtime';
import { createVueAdapter } from '@pinflow/vue';

export default defineNuxtPlugin(() => {
  const adapter = createVueAdapter({ debug: true });

  RuntimeManager.getInstance().initialize({
    adapter,
    debug: true,
  });

  // Expose smoke test utilities
  const pinflowUtils = {
    async captureElement(element: HTMLElement) {
      const runtime = RuntimeManager.getInstance();
      const context = await runtime.captureContextForElement(element);
      console.log('[pinflow-preview] Captured:', context);
      return context;
    },
    async captureSelector(selector: string) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        console.error(`[pinflow-preview] No element found for: ${selector}`);
        return null;
      }
      return pinflowUtils.captureElement(el);
    },
    listTracked() {
      const runtime = RuntimeManager.getInstance();
      const ids = runtime.getAllEntryIds();
      console.log(`[pinflow-preview] Tracked elements: ${ids.length}`);
      return ids;
    },
    status() {
      const runtime = RuntimeManager.getInstance();
      console.table({
        Initialized: runtime.isReady(),
        'Tracked Elements': runtime.getTrackedCount(),
        Adapter: adapter.name,
      });
    },
  };

  (window as unknown as Record<string, unknown>).pinflow = pinflowUtils;
  (window as unknown as Record<string, unknown>).domscribe = pinflowUtils;
  console.log(
    '[pinflow-preview] Nuxt plugin loaded. Smoke test utilities available.',
  );
});
