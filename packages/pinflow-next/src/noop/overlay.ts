/**
 * No-op stub for @pinflow/overlay in production builds.
 *
 * The PinFlow auto-init path dynamically imports @pinflow/overlay, which causes
 * the bundler to include the full overlay even in production builds.
 * withPinFlow() aliases @pinflow/overlay to this module in production
 * so the bundle contains only this empty stub.
 *
 * @module @pinflow/next/noop/overlay
 */
export function initOverlay(): void {
  // intentionally empty
}
