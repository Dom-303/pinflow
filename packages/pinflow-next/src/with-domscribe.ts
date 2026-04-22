/**
 * Compatibility shim that preserves the legacy `withDomscribe` module path.
 *
 * Prefer `@pinflow/next` or `./with-pinflow.js` for new integrations.
 *
 * @module @pinflow/next/with-domscribe
 */

export {
  withPinFlow,
  withDomscribe,
  type WebpackConfig,
} from './with-pinflow.js';
