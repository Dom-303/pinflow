/**
 * Options for the React-aware PinFlow Vite plugin.
 *
 * Mirrors the base transform plugin options — all options are passed through.
 * Adds `runtime` and `capture` namespaces for configuring runtime behavior
 * and React adapter capture settings.
 *
 * @module @pinflow/react/vite/types
 */

import type { PinFlowRuntimeOptions } from '@pinflow/runtime';
import type { RunnerPluginOptions } from '@pinflow/transform/plugins/vite';

export type {
  PinFlowRuntimeOptions,
};

/**
 * React adapter capture configuration.
 *
 * @remarks
 * `hookNameResolvers` uses plain objects (JSON-serializable) in plugin options.
 * Converted to `Map<string, Map<number, string>>` at runtime.
 */
export interface PinFlowReactCaptureOptions {
  /** Capture strategy. @default 'best-effort' */
  strategy?: 'devtools' | 'fiber' | 'best-effort';
  /** Maximum component tree depth. @default 50 */
  maxTreeDepth?: number;
  /** Include wrapper/HOC components. @default true */
  includeWrappers?: boolean;
  /** Hook name resolvers as plain objects. Keys are component names, values map hook index to name. */
  hookNameResolvers?: Record<string, Record<number, string>>;
}

export interface PinFlowReactPluginOptions {
  include?: RegExp;
  exclude?: RegExp;
  debug?: boolean;
  relay?: {
    autoStart?: boolean;
    port?: number;
    host?: string;
    /**
     * Max request body size in bytes (only used if starting).
     *
     * @default 10485760 (10 MB)
     */
    bodyLimit?: number;
  };
  runner?: RunnerPluginOptions;
  overlay?:
    | boolean
    | {
        initialMode?: 'collapsed' | 'expanded';
        debug?: boolean;
      };
  /** RuntimeManager configuration (phase, PII redaction, block selectors). */
  runtime?: PinFlowRuntimeOptions;
  /** React adapter capture configuration (strategy, tree depth, wrappers, hook resolvers). */
  capture?: PinFlowReactCaptureOptions;
}
