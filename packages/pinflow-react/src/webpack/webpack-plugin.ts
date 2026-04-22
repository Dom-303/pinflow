/**
 * React-aware PinFlow webpack plugin
 * @module @pinflow/react/webpack/webpack-plugin
 */
import type { Compiler, WebpackPluginInstance } from 'webpack';
import {
  PinFlowWebpackPlugin as BasePinFlowWebpackPlugin,
  type WebpackPluginOptions,
} from '@pinflow/transform/plugins/webpack';
import type {
  PinFlowRuntimeOptions,
  PinFlowReactCaptureOptions,
} from '../vite/types.js';

/**
 * Unified options for the React webpack plugin.
 *
 * Extends the base transform options with `runtime` and `capture` namespaces
 * for configuring RuntimeManager and ReactAdapter behavior.
 */
export interface PinFlowReactWebpackPluginOptions extends WebpackPluginOptions {
  /** RuntimeManager configuration (phase, PII redaction, block selectors). */
  runtime?: PinFlowRuntimeOptions;
  /** React adapter capture configuration (strategy, tree depth, wrappers, hook resolvers). */
  capture?: PinFlowReactCaptureOptions;
}

export type DomscribeReactWebpackPluginOptions = PinFlowReactWebpackPluginOptions;

/**
 * PinFlow webpack plugin for React projects.
 *
 * Creates the base transform plugin internally and adds `@pinflow/react/auto-init`
 * as a webpack entry so that RuntimeManager + ReactAdapter are initialized
 * automatically — no entrypoint changes needed.
 *
 * @remarks
 * For framework-agnostic usage (no runtime capture), import `PinFlowWebpackPlugin`
 * from `@pinflow/transform/plugins/webpack` directly.
 *
 * Usage:
 * ```ts
 * // webpack.config.ts
 * import { PinFlowWebpackPlugin } from '@pinflow/react/webpack'
 *
 * export default {
 *   plugins: [new PinFlowWebpackPlugin({ overlay: true })]
 * }
 * ```
 */
export class PinFlowWebpackPlugin implements WebpackPluginInstance {
  private readonly basePlugin: BasePinFlowWebpackPlugin;
  private readonly runtimeOptions: PinFlowRuntimeOptions;
  private readonly captureOptions: PinFlowReactCaptureOptions;
  private readonly debug: boolean;

  constructor(options?: PinFlowReactWebpackPluginOptions) {
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
      strategy: this.captureOptions.strategy,
      maxTreeDepth: this.captureOptions.maxTreeDepth,
      includeWrappers: this.captureOptions.includeWrappers,
      hookNameResolvers: this.captureOptions.hookNameResolvers,
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
        entry[firstKey].import.push('@pinflow/react/auto-init');
      }
    }
  }
}

export const DomscribeWebpackPlugin = PinFlowWebpackPlugin;
