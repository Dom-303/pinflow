/**
 * Auto-initializing entry point for Vue adapter.
 *
 * Importing this module automatically initializes RuntimeManager with VueAdapter.
 * Used by the webpack plugin which adds this as an entry point.
 *
 * When used with the webpack plugin, `__PINFLOW_RUNTIME_OPTIONS__` and
 * `__PINFLOW_ADAPTER_OPTIONS__` are injected via DefinePlugin. Falls back
 * to legacy `__DOMSCRIBE_*` globals for compatibility.
 * to empty objects when not defined (e.g. direct import without the plugin).
 *
 * @module @pinflow/vue/auto-init
 */
import { RuntimeManager } from '@pinflow/runtime';
import { createVueAdapter } from './adapter/vue-adapter.js';

declare const __PINFLOW_RUNTIME_OPTIONS__:
  | Record<string, unknown>
  | undefined;
declare const __PINFLOW_ADAPTER_OPTIONS__:
  | Record<string, unknown>
  | undefined;
declare const __DOMSCRIBE_RUNTIME_OPTIONS__:
  | Record<string, unknown>
  | undefined;
declare const __DOMSCRIBE_ADAPTER_OPTIONS__:
  | Record<string, unknown>
  | undefined;

try {
  const runtimeOpts =
    typeof __PINFLOW_RUNTIME_OPTIONS__ !== 'undefined'
      ? __PINFLOW_RUNTIME_OPTIONS__
      : typeof __DOMSCRIBE_RUNTIME_OPTIONS__ !== 'undefined'
      ? __DOMSCRIBE_RUNTIME_OPTIONS__
      : {};
  const adapterOpts =
    typeof __PINFLOW_ADAPTER_OPTIONS__ !== 'undefined'
      ? __PINFLOW_ADAPTER_OPTIONS__
      : typeof __DOMSCRIBE_ADAPTER_OPTIONS__ !== 'undefined'
      ? __DOMSCRIBE_ADAPTER_OPTIONS__
      : {};

  RuntimeManager.getInstance().initialize({
    ...runtimeOpts,
    adapter: createVueAdapter({ ...adapterOpts }),
  });
} catch (e) {
  console.warn(
    '[pinflow] Failed to auto-init Vue runtime:',
    e instanceof Error ? e.message : String(e),
  );
}
