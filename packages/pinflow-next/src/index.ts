/**
 * @pinflow/next - Next.js integration for PinFlow
 *
 * Zero-config Next.js integration that provides:
 * - Build-time AST injection of stable element IDs (Turbopack + Webpack)
 * - Auto-initialization of runtime + overlay via loader preamble
 * - Relay auto-start and overlay injection via loader-injected window globals
 *
 * @module @pinflow/next
 */

export { withPinFlow, withDomscribe } from './with-pinflow.js';
export type { PinFlowNextOptions, DomscribeNextOptions } from './types.js';
