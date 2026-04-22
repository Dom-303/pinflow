/**
 * Vite plugin entry point
 * @module @pinflow/vue/vite
 */
export { pinflow, pinflow as domscribe, pinflow as vite } from './vite-plugin.js';
export type {
  PinFlowVuePluginOptions,
  PinFlowRuntimeOptions,
  PinFlowVueCaptureOptions,
  DomscribeVuePluginOptions,
  DomscribeRuntimeOptions,
  DomscribeVueCaptureOptions,
} from './types.js';
