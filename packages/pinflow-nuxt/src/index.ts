/**
 * @pinflow/nuxt - Nuxt module for PinFlow
 *
 * Zero-config Nuxt integration that provides:
 * - Build-time AST injection of stable element IDs (Vite + Webpack)
 * - Automatic RuntimeManager + VueAdapter initialization (client-only)
 * - Relay auto-start and overlay injection
 *
 * @module @pinflow/nuxt
 */

export { pinflowModule as default, pinflowModule, domscribeModule } from './module.js';
export type { DomscribeNuxtOptions, PinFlowNuxtOptions } from './types.js';
