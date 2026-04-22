/**
 * @pinflow/react - React framework adapter for PinFlow
 *
 * Provides runtime context capture for React applications, including:
 * - Props and state extraction
 * - Component name resolution
 * - Fiber tree traversal
 *
 * @module @pinflow/react
 */

// ============================================================================
// Adapter
// ============================================================================
export { ReactAdapter, createReactAdapter } from './adapter/react-adapter.js';

// ============================================================================
// Types
// ============================================================================
export type {
  ReactAdapterOptions,
  ReactFrameworkAdapter,
} from './adapter/types.js';
export { CaptureStrategy } from './adapter/types.js';
