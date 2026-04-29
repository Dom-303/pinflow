/**
 * Configuration options for the @pinflow/nuxt module.
 *
 * These options are passed through to the underlying Vite/Webpack transform plugins
 * and control overlay, relay, and debug behavior.
 *
 * @module @pinflow/nuxt/types
 */
import type { PinFlowRuntimeOptions } from '@pinflow/runtime';
import type { RunnerPluginOptions } from '@pinflow/transform/plugins/vite';
import type { PinFlowVueCaptureOptions } from '@pinflow/vue/vite';

export interface PinFlowNuxtOptions {
  /**
   * File pattern to include for transformation.
   *
   * @default /\.(jsx|tsx|vue)$/i
   */
  include?: RegExp;

  /**
   * File pattern to exclude from transformation.
   *
   * @default /node_modules|\.test\.|\.spec\./i
   */
  exclude?: RegExp;

  /**
   * Enable debug logging.
   *
   * @default false
   */
  debug?: boolean;

  /**
   * RuntimeManager configuration passed to the client plugin.
   */
  runtime?: PinFlowRuntimeOptions;

  /**
   * Vue adapter capture configuration passed to the client plugin.
   */
  capture?: PinFlowVueCaptureOptions;

  /**
   * Relay server configuration.
   * Controls auto-start behavior and connection settings.
   */
  relay?: {
    /**
     * Whether to auto-start the relay daemon if not running.
     *
     * @default true
     */
    autoStart?: boolean;

    /**
     * Port for the relay server (only used if starting).
     * 0 means dynamic port assignment.
     *
     * @default 0
     */
    port?: number;

    /**
     * Host for the relay server (only used if starting).
     *
     * @default '127.0.0.1'
     */
    host?: string;

    /**
     * Max request body size in bytes (only used if starting).
     *
     * @default 10485760 (10MB)
     */
    bodyLimit?: number;
  };

  /**
   * Local runner configuration.
   * When enabled, the Nuxt dev server starts the local PinFlow runner together
   * with the relay so selected tasks can be handed to the configured agent.
   */
  runner?: RunnerPluginOptions;

  /**
   * Overlay UI configuration.
   * Set to true for default options, or provide configuration.
   * Requires @pinflow/overlay package to be installed.
   *
   * @default false
   */
  overlay?:
    | boolean
    | {
        /**
         * Initial display mode for the overlay.
         *
         * @default 'collapsed'
         */
        initialMode?: 'collapsed' | 'expanded';

        /**
         * Enable debug logging in the overlay.
         *
         * @default false
         */
        debug?: boolean;
      };
}
