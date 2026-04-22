/**
 * Auto-initializing entry point for React adapter.
 *
 * Importing this module automatically initializes RuntimeManager with ReactAdapter.
 * Used by the webpack plugin which adds this as an entry point.
 *
 * When used with the webpack plugin, `__PINFLOW_RUNTIME_OPTIONS__` and
 * `__PINFLOW_ADAPTER_OPTIONS__` are injected via DefinePlugin.
 * to empty objects when not defined (e.g. direct import without the plugin).
 *
 * @module @pinflow/react/auto-init
 */
import { RuntimeManager } from '@pinflow/runtime';
import { createReactAdapter } from './adapter/react-adapter.js';

declare const __PINFLOW_RUNTIME_OPTIONS__:
  | Record<string, unknown>
  | undefined;
declare const __PINFLOW_ADAPTER_OPTIONS__:
  | Record<string, unknown>
  | undefined;

try {
  const runtimeOpts =
    typeof __PINFLOW_RUNTIME_OPTIONS__ !== 'undefined'
      ? __PINFLOW_RUNTIME_OPTIONS__
      : {};
  const adapterOpts =
    typeof __PINFLOW_ADAPTER_OPTIONS__ !== 'undefined'
      ? __PINFLOW_ADAPTER_OPTIONS__
      : {};

  // Reconstruct hookNameResolvers from plain object to Map<string, Map<number, string>>
  const rawResolvers = adapterOpts.hookNameResolvers as
    | Record<string, Record<number, string>>
    | undefined;
  const hookNameResolvers = rawResolvers
    ? new Map(
        Object.entries(rawResolvers).map(([k, v]) => [
          k,
          new Map(Object.entries(v).map(([i, n]) => [Number(i), n])),
        ]),
      )
    : undefined;

  RuntimeManager.getInstance().initialize({
    ...runtimeOpts,
    adapter: createReactAdapter({
      ...adapterOpts,
      hookNameResolvers,
    }),
  });
} catch (e) {
  console.warn(
    '[pinflow] Failed to auto-init React runtime:',
    e instanceof Error ? e.message : String(e),
  );
}
