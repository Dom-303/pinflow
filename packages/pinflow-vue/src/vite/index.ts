/**
 * Vite plugin entry point
 * @module @pinflow/vue/vite
 */
export { pinflow, pinflow as domscribe, pinflow as vite } from './vite-plugin.js';
export type {
  DomscribeVuePluginOptions,
  PinFlowVuePluginOptions,
  DomscribeRuntimeOptions,
  PinFlowRuntimeOptions,
  DomscribeVueCaptureOptions,
  PinFlowVueCaptureOptions,
} from './types.js';
