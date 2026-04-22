/**
 * Vite plugin entry point
 * @module @pinflow/vue/vite
 */
export { domscribe, domscribe as pinflow } from './vite-plugin.js';
export type {
  DomscribeVuePluginOptions,
  PinFlowVuePluginOptions,
  DomscribeRuntimeOptions,
  PinFlowRuntimeOptions,
  DomscribeVueCaptureOptions,
  PinFlowVueCaptureOptions,
} from './types.js';
