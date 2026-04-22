/**
 * Overlay initialization
 *
 * Entry point for initializing the PinFlow overlay UI.
 * Called automatically when injected via build plugins, or manually by user.
 */

import { OverlayStore } from './overlay-store.js';
import { EventManager } from './event-manager.js';
import { RelayService } from '../services/relay-service.js';
import type { OverlayOptions } from './types.js';

// Import components to register them
import '../components/ds-overlay.js';

let initialized = false;

/**
 * Initialize the PinFlow overlay
 *
 * @example
 * ```ts
 * // Auto-initialization via build plugin (reads window.__PINFLOW_OVERLAY_OPTIONS__)
 * import('@pinflow/overlay').then(m => m.initOverlay());
 *
 * // Manual initialization with options
 * import { initOverlay } from '@pinflow/overlay';
 * initOverlay({ initialMode: 'expanded', debug: true });
 * ```
 */
export async function initOverlay(options?: OverlayOptions): Promise<void> {
  const relayPort =
    typeof window !== 'undefined' ? window.__PINFLOW_RELAY_PORT__ : undefined;

  if (typeof window !== 'undefined' && !relayPort) {
    console.warn(
      '[pinflow-overlay] No active PinFlow dev session detected. ' +
        'Overlay is dev-only and will not initialize in production.',
    );
    return;
  }

  if (initialized) {
    console.warn('[pinflow-overlay] Already initialized');
    return;
  }

  // Merge with window options (from build plugin injection)
  const resolvedOptions: OverlayOptions = {
    ...window.__PINFLOW_OVERLAY_OPTIONS__,
    ...options,
  };

  const debug = resolvedOptions.debug ?? false;

  if (debug) {
    console.log('[pinflow-overlay] Initializing...', resolvedOptions);
  }

  // Initialize store with options
  OverlayStore.getInstance(resolvedOptions);

  // Initialize event manager
  const eventManager = EventManager.getInstance();
  eventManager.initGlobalShortcuts();

  // Initialize relay service
  const relayService = RelayService.getInstance();
  const connected = await relayService.initialize();

  if (debug) {
    console.log('[pinflow-overlay] Relay connection:', connected);
  }

  // Create and append overlay element
  const overlay = document.createElement('ds-overlay');
  document.body.appendChild(overlay);

  // Set overlay element reference for event manager
  eventManager.setOverlayElement(overlay);

  initialized = true;

  if (debug) {
    console.log('[pinflow-overlay] Initialized successfully');
    console.log('[pinflow-overlay] Keyboard shortcuts:');
    console.log('  Ctrl+Shift+D - Toggle overlay');
    console.log('  ESC - Cancel capture / Collapse sidebar');
  }
}

/**
 * Check if overlay is initialized
 */
export function isOverlayInitialized(): boolean {
  return initialized;
}

/**
 * Reset overlay (for testing)
 */
export function resetOverlay(): void {
  OverlayStore.resetInstance();
  EventManager.resetInstance();
  RelayService.resetInstance();

  // Remove overlay element
  const overlay = document.querySelector('ds-overlay');
  overlay?.remove();

  initialized = false;
}
