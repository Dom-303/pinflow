/**
 * Vite plugin entry point
 * @module @pinflow/react/vite
 */
export { domscribe, domscribe as pinflow } from './vite-plugin.js';
export type {
  DomscribeReactPluginOptions,
  PinFlowReactPluginOptions,
  DomscribeRuntimeOptions,
  PinFlowRuntimeOptions,
  DomscribeReactCaptureOptions,
  PinFlowReactCaptureOptions,
} from './types.js';
