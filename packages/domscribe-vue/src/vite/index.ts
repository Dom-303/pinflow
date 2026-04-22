/**
 * Vite plugin entry point
 * @module @domscribe/vue/vite
 */
export { domscribe, domscribe as pinflow } from './vite-plugin.js';
export type {
  DomscribeVuePluginOptions,
  DomscribeRuntimeOptions,
  DomscribeVueCaptureOptions,
} from './types.js';
