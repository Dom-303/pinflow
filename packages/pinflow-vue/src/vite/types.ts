/**
 * Options for the Vue-aware Domscribe Vite plugin.
 *
 * Mirrors the base transform plugin options — all options are passed through.
 * Adds `runtime` and `capture` namespaces for configuring runtime behavior
 * and Vue adapter capture settings.
 *
 * @module @pinflow/vue/vite/types
 */

import type { DomscribeRuntimeOptions } from '@pinflow/runtime';

export type {
  DomscribeRuntimeOptions,
  DomscribeRuntimeOptions as PinFlowRuntimeOptions,
};

/**
 * Vue adapter capture configuration.
 */
export interface DomscribeVueCaptureOptions {
  /** Maximum component tree depth. @default 50 */
  maxTreeDepth?: number;
}

export type PinFlowVueCaptureOptions = DomscribeVueCaptureOptions;

export interface DomscribeVuePluginOptions {
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
  runtime?: DomscribeRuntimeOptions;
  /** Vue adapter capture configuration (tree depth). */
  capture?: DomscribeVueCaptureOptions;
}

export type PinFlowVuePluginOptions = DomscribeVuePluginOptions;
