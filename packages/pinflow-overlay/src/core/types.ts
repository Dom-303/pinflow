/**
 * Core types for the overlay package
 */

import type {
  RuntimeContext,
  ManifestEntry,
  Annotation,
} from '@pinflow/core';
import type {
  DispatchProjectDefaults,
  DispatchSessionState,
  DispatchChannel,
} from './dispatch-config.js';

/**
 * Overlay display mode
 */
export type OverlayMode = 'collapsed' | 'expanded' | 'capturing';

/**
 * Product theme mode
 */
export type OverlayTheme = 'light' | 'dark';

export type DispatchBatchStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'mixed';

export interface DispatchBatch {
  id: string;
  channel: DispatchChannel;
  annotationIds: string[];
  releasedAt: string;
  status: DispatchBatchStatus;
  queuedCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
}

/**
 * Overlay state managed by OverlayStore
 */
export interface OverlayState {
  // UI State
  mode: OverlayMode;
  theme: OverlayTheme;
  sidebarWidth: number;
  /** Vertical position of the collapsed tab as a percentage (0–100). Default: 50 (center). */
  tabOffsetY: number;
  dispatchProjectDefaults: DispatchProjectDefaults;
  dispatchSession: DispatchSessionState;
  dispatchBatches: DispatchBatch[];

  // Connection State
  relayConnected: boolean;
  relayPort: number | null;
  relayHost: string | null;

  // Capture State
  selectedElement: HTMLElement | null;
  selectedEntryId: string | null;
  hoveredElement: HTMLElement | null;
  runtimeContext: RuntimeContext | null;
  manifestEntry: ManifestEntry | null;

  // Annotation State
  annotations: Annotation[];
  annotationInput: string;
  activeAnnotationId: string | null;
  isSubmitting: boolean;

  // Debug
  debug: boolean;
}

/**
 * Options for initializing the overlay
 */
export interface OverlayOptions {
  /**
   * Initial display mode
   * @default 'collapsed'
   */
  initialMode?: OverlayMode;

  /**
   * Initial overlay theme
   * @default 'light'
   */
  initialTheme?: OverlayTheme;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Initial sidebar width in pixels
   * @default 360
   */
  sidebarWidth?: number;
}

/**
 * Global window properties injected by the build plugins
 */
declare global {
  interface Window {
    __PINFLOW_RELAY_PORT__?: number;
    __PINFLOW_RELAY_HOST__?: string;
    __PINFLOW_OVERLAY_OPTIONS__?: OverlayOptions;
  }
}
