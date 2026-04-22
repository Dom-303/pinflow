/**
 * Vite plugin entry point
 * @module @pinflow/react/vite
 */
export { pinflow, pinflow as domscribe, pinflow as vite } from './vite-plugin.js';
export type {
  PinFlowReactPluginOptions,
  PinFlowRuntimeOptions,
  PinFlowReactCaptureOptions,
  DomscribeReactPluginOptions,
  DomscribeRuntimeOptions,
  DomscribeReactCaptureOptions,
} from './types.js';
