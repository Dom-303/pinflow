/**
 * Domscribe Vue Smoke Test - Console utilities for testing runtime context capture
 *
 * Usage in browser console:
 *   domscribe.captureElement(element)      - Capture context for element (current strategy)
 *   domscribe.captureSelector(selector)    - Capture context for selector (current strategy)
 *   domscribe.listTracked()                - List all tracked element IDs
 *   domscribe.status()                     - Show runtime status
 */

import { RuntimeManager } from '@domscribe/runtime';
import { createVueAdapter } from '@domscribe/vue';

// Track adapters per strategy
const adapter = createVueAdapter({
  debug: true,
});
let runtimeInitialized = false;

async function ensureRuntimeInitialized(): Promise<RuntimeManager> {
  const runtime = RuntimeManager.getInstance();

  // Always re-initialize if strategy changed
  if (!runtimeInitialized) {
    await runtime.initialize({
      adapter,
      debug: true,
    });

    runtimeInitialized = true;

    console.log('[pinflow-preview] Runtime initialized');
    console.log('[pinflow-preview] Adapter:', adapter.name, adapter.version);
  }

  return runtime;
}

/**
 * Capture runtime context for a DOM element
 * This is the same flow the Overlay picker uses
 */
async function captureElement(element: HTMLElement): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    console.error('[pinflow-preview] Error: Please provide an HTMLElement');
    return;
  }

  const runtime = await ensureRuntimeInitialized();
  const context = await runtime.captureContextForElement(element);

  console.log(`[pinflow-preview] Captured context for element:`, element);
  console.log('[pinflow-preview] Context:', context);

  if (context) {
    console.table({
      'Has Props': !!context.componentProps,
      'Has State': !!context.componentState,
      'Props Keys': context.componentProps
        ? Object.keys(context.componentProps).join(', ')
        : 'none',
      'State Keys': context.componentState
        ? Object.keys(context.componentState).join(', ')
        : 'none',
    });

    if (context.componentProps) {
      console.log('[pinflow-preview] Props:', context.componentProps);
    }
    if (context.componentState) {
      console.log('[pinflow-preview] State:', context.componentState);
    }
  }
}

/**
 * Capture runtime context for element matching a CSS selector
 */
async function captureSelector(selector: string): Promise<void> {
  const element = document.querySelector(selector) as HTMLElement | null;

  if (!element) {
    console.error(`[pinflow-preview] No element found for selector: ${selector}`);
    return;
  }

  await captureElement(element);
}

/**
 * List all tracked element IDs
 */
async function listTracked(): Promise<void> {
  const runtime = await ensureRuntimeInitialized();
  const ids = runtime.getAllEntryIds();

  console.log(`[pinflow-preview] Tracked elements: ${ids.length}`);
  if (ids.length > 0) {
    console.table(
      ids.map((id) => ({
        id,
        element: document.querySelector(`[data-ds="${id}"]`)?.tagName || 'N/A',
      })),
    );
  }
}

/**
 * Show runtime status
 */
async function status(): Promise<void> {
  const runtime = await ensureRuntimeInitialized();

  console.log('[pinflow-preview] Status:');
  console.table({
    Initialized: runtime.isReady(),
    'Tracked Elements': runtime.getTrackedCount(),
    Adapter: adapter.name,
    'Vue Version': adapter.version,
  });
}

/**
 * Test all strategies on a given element
 */
async function testAllStrategies(element: HTMLElement): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    console.error('[pinflow-preview] Error: Please provide an HTMLElement');
    return;
  }

  console.log('[pinflow-preview] Testing all strategies on element:', element);
  console.log('='.repeat(60));

  const runtime = await ensureRuntimeInitialized();
  const context = await runtime.captureContextForElement(element);

  console.log(`[pinflow-preview] result:`, {
    hasProps: !!context?.componentProps,
    hasState: !!context?.componentState,
    props: context?.componentProps,
    state: context?.componentState,
  });

  console.log('\n' + '='.repeat(60));
  console.log('[pinflow-preview] All strategies tested');
}

// Expose utilities globally
const domscribeUtils = {
  captureElement,
  captureSelector,
  listTracked,
  status,
  testAllStrategies,
};

(window as unknown as Record<string, unknown>).domscribe = domscribeUtils;

console.log('[pinflow-preview] Vue smoke test utilities loaded. Available commands:');
console.log(
  '  domscribe.captureElement(element) - Capture context for element',
);
console.log(
  '  domscribe.captureSelector(selector) - Capture context for selector',
);
console.log('  domscribe.listTracked() - List tracked elements');
console.log('  domscribe.status() - Show runtime status');
