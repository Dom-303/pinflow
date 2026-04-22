/**
 * PinFlow Preview Smoke Test - Console utilities for testing runtime context capture
 *
 * Usage in browser console:
 *   pinflow.captureElement(element)      - Capture context for element (current strategy)
 *   pinflow.captureSelector(selector)    - Capture context for selector (current strategy)
 *   pinflow.setStrategy('fiber'|'devtools'|'best-effort') - Change strategy
 *   pinflow.listTracked()                - List all tracked element IDs
 *   pinflow.status()                     - Show runtime status
 */

import { RuntimeManager } from '@pinflow/runtime';
import {
  CaptureStrategy,
  createReactAdapter,
  ReactAdapter,
} from '@pinflow/react';

// Track adapters per strategy
const adapters = new Map<CaptureStrategy, ReactAdapter>();
let currentStrategy: CaptureStrategy = CaptureStrategy.FIBER;
let runtimeInitialized = false;

function getStrategyFromString(str: string): CaptureStrategy | null {
  const normalized = str.toLowerCase().replace(/[_-]/g, '');
  switch (normalized) {
    case 'fiber':
      return CaptureStrategy.FIBER;
    case 'devtools':
      return CaptureStrategy.DEVTOOLS;
    case 'besteffort':
      return CaptureStrategy.BEST_EFFORT;
    default:
      return null;
  }
}

async function initializeWithStrategy(
  strategy: CaptureStrategy,
): Promise<RuntimeManager> {
  const runtime = RuntimeManager.getInstance();

  if (!runtimeInitialized || currentStrategy !== strategy) {
    let adapter = adapters.get(strategy);
    if (!adapter) {
      adapter = createReactAdapter({
        strategy,
        debug: true,
      });
      adapters.set(strategy, adapter);
    }

    await runtime.initialize({
      adapter,
      debug: true,
    });

    currentStrategy = strategy;
    runtimeInitialized = true;

    console.log('[pinflow-preview] Runtime initialized');
    console.log('[pinflow-preview] Strategy:', strategy);
    console.log('[pinflow-preview] Adapter:', adapter.name, adapter.version);
    console.log('[pinflow-preview] Active strategy:', adapter.getActiveStrategy());
    console.log('[pinflow-preview] Has DevTools:', adapter.hasDevToolsAccess());
  }

  return runtime;
}

async function ensureRuntimeInitialized(): Promise<RuntimeManager> {
  return initializeWithStrategy(currentStrategy);
}

async function captureElement(element: HTMLElement): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    console.error('[pinflow-preview] Error: Please provide an HTMLElement');
    return;
  }

  const runtime = await ensureRuntimeInitialized();
  const context = await runtime.captureContextForElement(element);

  console.log(
    `[pinflow-preview] Captured context for element (${currentStrategy}):`,
    element,
  );
  console.log('[pinflow-preview] Context:', context);
}

/**
 * Capture runtime context and return structured data (for E2E test assertions).
 * Unlike captureElement(), this returns the result instead of just logging it.
 */
async function captureElementData(element: HTMLElement): Promise<{
  componentName: string | null;
  props: Record<string, unknown> | null;
  propsKeys: string[];
  state: Record<string, unknown> | null;
  stateKeys: string[];
  dataDs: string | null;
} | null> {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const runtime = await ensureRuntimeInitialized();
  const context = await runtime.captureContextForElement(element);

  // Get component name from element info (not part of RuntimeContext)
  const dataDs = element.getAttribute('data-ds');
  let componentName: string | null = null;
  if (dataDs) {
    const info = runtime.getElementInfo(dataDs);
    componentName = info?.componentName ?? null;
  }

  const props = (context?.componentProps as Record<string, unknown>) ?? null;
  const state = (context?.componentState as Record<string, unknown>) ?? null;

  return {
    componentName,
    props,
    propsKeys: props ? Object.keys(props) : [],
    state,
    stateKeys: state ? Object.keys(state) : [],
    dataDs,
  };
}

async function captureSelector(selector: string): Promise<void> {
  const element = document.querySelector(selector) as HTMLElement | null;
  if (!element) {
    console.error(`[pinflow-preview] No element found for selector: ${selector}`);
    return;
  }
  await captureElement(element);
}

async function setStrategy(
  strategyName: 'fiber' | 'devtools' | 'best-effort',
): Promise<void> {
  const strategy = getStrategyFromString(strategyName);
  if (!strategy) {
    console.error(
      `[pinflow-preview] Invalid strategy: ${strategyName}. Use 'fiber', 'devtools', or 'best-effort'`,
    );
    return;
  }
  await initializeWithStrategy(strategy);
  console.log(`[pinflow-preview] Strategy changed to: ${strategy}`);
}

async function listTracked(): Promise<void> {
  const runtime = await ensureRuntimeInitialized();
  const ids = runtime.getAllEntryIds();
  console.log(`[pinflow-preview] Tracked elements: ${ids.length}`);
}

async function status(): Promise<void> {
  const runtime = await ensureRuntimeInitialized();
  const adapter = adapters.get(currentStrategy);

  console.log('[pinflow-preview] Status:');
  console.table({
    Initialized: runtime.isReady(),
    'Current Strategy': currentStrategy,
    'Tracked Elements': runtime.getTrackedCount(),
    Adapter: adapter?.name || 'none',
  });
}

const pinflowUtils = {
  captureElement,
  captureElementData,
  captureSelector,
  setStrategy,
  listTracked,
  status,
  strategies: {
    FIBER: CaptureStrategy.FIBER,
    DEVTOOLS: CaptureStrategy.DEVTOOLS,
    BEST_EFFORT: CaptureStrategy.BEST_EFFORT,
  },
};

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).pinflow = pinflowUtils;
  (window as unknown as Record<string, unknown>).domscribe = pinflowUtils;
  console.log('[pinflow-preview] Smoke test utilities loaded.');
}
