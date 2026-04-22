/**
 * Vite plugin entry point
 * @module @pinflow/react/vite
 */
export { pinflow, pinflow as domscribe, pinflow as vite } from './vite-plugin.js';
export type {
  DomscribeReactPluginOptions,
  PinFlowReactPluginOptions,
  DomscribeRuntimeOptions,
  PinFlowRuntimeOptions,
  DomscribeReactCaptureOptions,
  PinFlowReactCaptureOptions,
} from './types.js';
