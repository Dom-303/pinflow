/**
 * React-aware Domscribe webpack plugin
 * @module @pinflow/react/webpack/webpack-plugin
 */
import type { Compiler, WebpackPluginInstance } from 'webpack';
import {
  DomscribeWebpackPlugin as BaseDomscribeWebpackPlugin,
  type WebpackPluginOptions,
} from '@pinflow/transform/plugins/webpack';
import type {
  DomscribeRuntimeOptions,
  DomscribeReactCaptureOptions,
} from '../vite/types.js';

/**
 * Unified options for the React webpack plugin.
 *
 * Extends the base transform options with `runtime` and `capture` namespaces
 * for configuring RuntimeManager and ReactAdapter behavior.
 */
export interface DomscribeReactWebpackPluginOptions extends WebpackPluginOptions {
  /** RuntimeManager configuration (phase, PII redaction, block selectors). */
  runtime?: DomscribeRuntimeOptions;
  /** React adapter capture configuration (strategy, tree depth, wrappers, hook resolvers). */
  capture?: DomscribeReactCaptureOptions;
}

export type PinFlowReactWebpackPluginOptions = DomscribeReactWebpackPluginOptions;

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
export class DomscribeWebpackPlugin implements WebpackPluginInstance {
  private readonly basePlugin: BaseDomscribeWebpackPlugin;
  private readonly runtimeOptions: DomscribeRuntimeOptions;
  private readonly captureOptions: DomscribeReactCaptureOptions;
  private readonly debug: boolean;

  constructor(options?: DomscribeReactWebpackPluginOptions) {
    this.basePlugin = new BaseDomscribeWebpackPlugin(options);
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
      __DOMSCRIBE_RUNTIME_OPTIONS__: runtimeOptions,
      __DOMSCRIBE_ADAPTER_OPTIONS__: adapterOptions,
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
