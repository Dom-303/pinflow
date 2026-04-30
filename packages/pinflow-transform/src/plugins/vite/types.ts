/**
 * Types for the Vite plugin
 * @module @pinflow/transform/plugins/vite/types
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
 * Configuration options for the Vite plugin
 */
export interface VitePluginOptions {
  /**
   * File pattern to include for transformation
   *
   * @default /\.(jsx|tsx|vue)$/i
   */
  include?: RegExp;

  /**
   * File pattern to exclude from transformation
   *
   * @default /node_modules|\.test\.|\.spec\./i
   */
  exclude?: RegExp;

  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

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

  /**
   * Override the root directory for `.pinflow/` artifacts (manifest,
   * transform cache, relay lock). Legacy `.pinflow/` paths are still read
   * during the migration window.
   *
   * When omitted, defaults to Vite's `config.root`. Needed when the Vite
   * root differs from the project root (e.g., Nuxt with a custom `srcDir`).
   */
  rootDir?: string;
}

export type PinFlowVitePluginOptions = VitePluginOptions;
