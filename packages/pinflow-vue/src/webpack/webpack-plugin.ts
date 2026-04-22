/**
 * Vue-aware PinFlow webpack plugin
 * @module @pinflow/vue/webpack/webpack-plugin
 */
import type { Compiler, WebpackPluginInstance } from 'webpack';
import {
  PinFlowWebpackPlugin as BasePinFlowWebpackPlugin,
  type WebpackPluginOptions,
} from '@pinflow/transform/plugins/webpack';
import type {
  DomscribeRuntimeOptions,
  DomscribeVueCaptureOptions,
} from '../vite/types.js';

/**
 * Unified options for the Vue webpack plugin.
 *
 * Extends the base transform options with `runtime` and `capture` namespaces
 * for configuring RuntimeManager and VueAdapter behavior.
 */
export interface DomscribeVueWebpackPluginOptions extends WebpackPluginOptions {
  /** RuntimeManager configuration (phase, PII redaction, block selectors). */
  runtime?: DomscribeRuntimeOptions;
  /** Vue adapter capture configuration (tree depth). */
  capture?: DomscribeVueCaptureOptions;
}

export type PinFlowVueWebpackPluginOptions = DomscribeVueWebpackPluginOptions;

/**
 * PinFlow webpack plugin for Vue projects.
 *
 * Creates the base transform plugin internally and adds `@pinflow/vue/auto-init`
 * as a webpack entry so that RuntimeManager + VueAdapter are initialized
 * automatically — no entrypoint changes needed.
 *
 * @remarks
 * For framework-agnostic usage (no runtime capture), import `PinFlowWebpackPlugin`
 * from `@pinflow/transform/plugins/webpack` directly.
 *
 * Usage:
 * ```ts
 * // webpack.config.ts
 * import { PinFlowWebpackPlugin } from '@pinflow/vue/webpack'
 *
 * export default {
 *   plugins: [new PinFlowWebpackPlugin({ overlay: true })]
 * }
 * ```
 */
export class PinFlowWebpackPlugin implements WebpackPluginInstance {
  private readonly basePlugin: BasePinFlowWebpackPlugin;
  private readonly runtimeOptions: DomscribeRuntimeOptions;
  private readonly captureOptions: DomscribeVueCaptureOptions;
  private readonly debug: boolean;

  constructor(options?: DomscribeVueWebpackPluginOptions) {
    this.basePlugin = new BasePinFlowWebpackPlugin(options);
    this.runtimeOptions = options?.runtime ?? {};
    this.captureOptions = options?.capture ?? {};
    this.debug = options?.debug ?? false;
  }

  apply(compiler: Compiler): void {
    const { DefinePlugin } = compiler.webpack;
    const runtimeOptions = JSON.stringify({
      phase: this.runtimeOptions.phase,
      debug: this.debug,
      redactPII: this.runtimeOptions.redactPII,
      blockSelectors: this.runtimeOptions.blockSelectors,
    });
    const adapterOptions = JSON.stringify({
      maxTreeDepth: this.captureOptions.maxTreeDepth,
      debug: this.debug,
    });
    new DefinePlugin({
      __PINFLOW_RUNTIME_OPTIONS__: runtimeOptions,
      __PINFLOW_ADAPTER_OPTIONS__: adapterOptions,
    }).apply(compiler);
    this.addAdapterEntry(compiler);
    this.basePlugin.apply(compiler);
  }

  private addAdapterEntry(compiler: Compiler): void {
    const entry = compiler.options.entry;

    if (typeof entry === 'object' && !Array.isArray(entry)) {
      const firstKey = Object.keys(entry)[0];
      if (firstKey && entry[firstKey]?.import) {
        entry[firstKey].import.push('@pinflow/vue/auto-init');
      }
    }
  }
}

export const DomscribeWebpackPlugin = PinFlowWebpackPlugin;
