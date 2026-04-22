/**
 * Options for the Vue-aware PinFlow Vite plugin.
 *
 * Mirrors the base transform plugin options — all options are passed through.
 * Adds `runtime` and `capture` namespaces for configuring runtime behavior
 * and Vue adapter capture settings.
 *
 * @module @pinflow/vue/vite/types
 */

import type { PinFlowRuntimeOptions, DomscribeRuntimeOptions } from '@pinflow/runtime';

export type {
  PinFlowRuntimeOptions,
  DomscribeRuntimeOptions,
};

/**
 * Vue adapter capture configuration.
 */
export interface PinFlowVueCaptureOptions {
  /** Maximum component tree depth. @default 50 */
  maxTreeDepth?: number;
}

export type DomscribeVueCaptureOptions = PinFlowVueCaptureOptions;

export interface PinFlowVuePluginOptions {
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
  overlay?:
    | boolean
    | {
        initialMode?: 'collapsed' | 'expanded';
        debug?: boolean;
      };
  /** RuntimeManager configuration (phase, PII redaction, block selectors). */
  runtime?: PinFlowRuntimeOptions;
  /** Vue adapter capture configuration (tree depth). */
  capture?: PinFlowVueCaptureOptions;
}

export type DomscribeVuePluginOptions = PinFlowVuePluginOptions;
