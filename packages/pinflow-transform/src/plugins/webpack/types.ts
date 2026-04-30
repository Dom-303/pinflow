/**
 * Types for the webpack plugin and loader
 * @module @pinflow/transform/plugins/webpack/types
 */
import type {
  RelayPluginOptions,
  OverlayPluginOptions,
  RunnerPluginOptions,
  RunnerMode,
} from '../types.js';

export type {
  RelayPluginOptions,
  OverlayPluginOptions,
  RunnerPluginOptions,
  RunnerMode,
};

/**
 * Loader options passed via webpack config
 */
export interface WebpackLoaderOptions {
  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Enable transformation
   * Set to false in production builds
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * Configuration options for the webpack plugin
 */
export interface WebpackPluginOptions {
  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Enable plugin (set to false in production builds)
   *
   * @default true in development, false in production
   */
  enabled?: boolean;

  /**
   * Relay server configuration.
   * Controls auto-start behavior and connection settings.
   */
  relay?: RelayPluginOptions;

  /**
   * Local runner configuration.
   * When enabled, the dev server starts the runner after the relay is ready.
   */
  runner?: RunnerPluginOptions;

  /**
   * Overlay UI configuration.
   * Set to true for default options, or provide configuration.
   * Requires @pinflow/overlay package to be installed.
   *
   * @default true
   */
  overlay?: boolean | OverlayPluginOptions;
}

export type PinFlowWebpackPluginOptions = WebpackPluginOptions;
