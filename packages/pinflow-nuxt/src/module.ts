/**
 * Nuxt module definition for PinFlow.
 *
 * Orchestrates relay startup, head-script globals injection, Vite/Webpack
 * transform registration, and client-only runtime plugin installation.
 *
 * @module @pinflow/nuxt/module
 */
import {
  addPlugin,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
  extendWebpackConfig,
} from '@nuxt/kit';
import { pinflow } from '@pinflow/transform/plugins/vite';
import { PinFlowWebpackPlugin } from '@pinflow/transform/plugins/webpack';
import type { PinFlowNuxtOptions } from './types.js';

/**
 * The Nuxt module. Use as the default export of @pinflow/nuxt or
 * add to `modules` in nuxt.config with the `pinflow` config key.
 *
 * Legacy `domscribe` config is still read as a fallback during the migration.
 */
export const pinflowModule = defineNuxtModule<PinFlowNuxtOptions>({
  meta: {
    name: '@pinflow/nuxt',
    configKey: 'pinflow',
  },
  defaults: {
    debug: false,
    overlay: true,
    relay: {},
  },
  async setup(options, nuxt) {
    const effectiveOptions = mergeLegacyNuxtOptions(
      options,
      nuxt as typeof nuxt & { options: { domscribe?: PinFlowNuxtOptions } },
    );

    // Only enable in development (unless force-transform is set for testing)
    if (!nuxt.options.dev && !process.env.DOMSCRIBE_FORCE_TRANSFORM) {
      return;
    }

    const { resolve } = createResolver(import.meta.url);
    const debug = effectiveOptions.debug ?? false;
    const forceTransform = !!process.env.DOMSCRIBE_FORCE_TRANSFORM;

    // 1. Start relay to discover actual host/port.
    //    Nuxt bypasses Vite's transformIndexHtml, so the Vite plugin's
    //    HTML injection never fires. We start the relay here and inject
    //    globals via app.head instead.
    let relayHost: string | undefined;
    let relayPort: number | undefined;

    if (effectiveOptions.relay?.autoStart !== false) {
      try {
        const { RelayControl } = await import('@pinflow/relay');
        const relayControl = new RelayControl(nuxt.options.rootDir);
        const result = await relayControl.ensureRunning({
          port: effectiveOptions.relay?.port,
          host: effectiveOptions.relay?.host,
          bodyLimit: effectiveOptions.relay?.bodyLimit,
        });
        relayHost = result.host;
        relayPort = result.port;

        if (debug) {
          console.log(
          `[pinflow/nuxt] Relay running at http://${relayHost}:${relayPort}`,
          );
        }
      } catch (error) {
        console.warn(
          `[pinflow/nuxt] Relay check failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // 2. Inject relay + overlay globals into app head.
    //    This runs before any JS bundles, so window globals are set
    //    by the time the runtime plugin initializes.
    const parts: string[] = [];
    if (relayPort !== undefined) {
      parts.push(`window.__PINFLOW_RELAY_PORT__=${relayPort}`);
      parts.push(`window.__DOMSCRIBE_RELAY_PORT__=${relayPort}`);
    }
    if (relayHost !== undefined) {
      parts.push(
        `window.__PINFLOW_RELAY_HOST__=${JSON.stringify(relayHost)}`,
      );
      parts.push(
        `window.__DOMSCRIBE_RELAY_HOST__=${JSON.stringify(relayHost)}`,
      );
    }
    if (effectiveOptions.overlay !== false) {
      const overlayOptions =
        typeof effectiveOptions.overlay === 'object'
          ? effectiveOptions.overlay
          : {};
      parts.push(
        `window.__PINFLOW_OVERLAY_OPTIONS__=${JSON.stringify(overlayOptions)}`,
      );
      parts.push(
        `window.__DOMSCRIBE_OVERLAY_OPTIONS__=${JSON.stringify(overlayOptions)}`,
      );
    }

    if (parts.length > 0) {
      const head = nuxt.options.app.head;
      head.script = head.script || [];
      // NOTE: Do NOT use `typeof window` in innerHTML — Nitro's Rollup bundler
      // performs dead-code elimination that replaces it with the string "undefined",
      // which breaks the surrounding JS string in the server bundle.
      // The guard is unnecessary anyway: <script> tags only execute in the browser.
      head.script.push({
        innerHTML: parts.join(';'),
      });
    }

    // 3. Register Vite transform plugin (dev-only, client + server)
    //    Runs on both builds so SSR output also has data-ds attributes.
    //    Relay is already running — skip auto-start in the Vite plugin.
    //    When DOMSCRIBE_FORCE_TRANSFORM is set, register for all modes
    //    so transforms run during `nuxi build` (production) too.
    addVitePlugin(
      () => {
        const plugin = pinflow({
          ...effectiveOptions,
          rootDir: nuxt.options.rootDir,
          relay: { ...effectiveOptions.relay, autoStart: false },
        });
        // The Vite plugin defaults to `apply: 'serve'` (dev-only). During
        // `nuxi build` Vite runs in build mode and skips serve-only plugins.
        // Clear `apply` so the plugin runs in both serve and build modes.
        if (forceTransform) {
          plugin.apply = undefined;
        }
        return plugin;
      },
      forceTransform ? {} : { dev: true },
    );

    // 4. Register Webpack loader + plugin as fallback for webpack builder
    extendWebpackConfig(
      (config) => {
        // Add webpack loader for file transforms
        config.module?.rules?.push({
          test: effectiveOptions.include ?? /\.(jsx|tsx|vue)$/i,
          exclude:
            effectiveOptions.exclude ?? /node_modules|\.test\.|\.spec\./i,
          enforce: 'pre' as const,
          use: [
            {
              loader: '@pinflow/transform/plugins/webpack/loader',
              options: { debug },
            },
          ],
        });

        // Add webpack plugin for relay/overlay coordination
        // Relay is already running — skip auto-start.
        config.plugins?.push(
          new PinFlowWebpackPlugin({
            debug,
            relay: { ...effectiveOptions.relay, autoStart: false },
            overlay: effectiveOptions.overlay,
          }),
        );
      },
      forceTransform ? {} : { dev: true },
    );

    // 5. Auto-inject RuntimeManager + VueAdapter (client-only)
    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'client',
    });
  },
});

export const domscribeModule = pinflowModule;

function mergeLegacyNuxtOptions(
  options: PinFlowNuxtOptions,
  nuxt: { options: { domscribe?: PinFlowNuxtOptions } },
): PinFlowNuxtOptions {
  const legacy = nuxt.options.domscribe ?? {};

  return {
    ...legacy,
    ...options,
    relay: {
      ...(legacy.relay ?? {}),
      ...(options.relay ?? {}),
    },
  };
}
