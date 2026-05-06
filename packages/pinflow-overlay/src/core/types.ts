/**
 * Core types for the overlay package
 */

import type {
  RuntimeContext,
  ManifestEntry,
  Annotation,
  BoundingRect,
} from '@pinflow/core';
import type {
  DispatchProjectDefaults,
  DispatchSessionState,
  DispatchChannel,
} from './dispatch-config.js';
import type { RunnerSnapshot } from '@pinflow/relay/client';

/**
 * Overlay display mode
 */
export type OverlayMode = 'collapsed' | 'expanded' | 'mini' | 'capturing';

/**
 * Product theme mode
 */
export type OverlayTheme = 'light' | 'dark';

export type PickerMode = 'element' | 'region' | 'multi';

export type CommentEntryMode = 'workspace' | 'inline';

export type SettingsTab = 'workspace' | 'flow' | 'history';

export interface RegionCapture {
  rect: BoundingRect;
  elements: HTMLElement[];
}

export interface InlineCommentDraft {
  position: {
    x: number;
    y: number;
  };
  anchorRect: BoundingRect;
  pickerMode: PickerMode;
}

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

export type UndoActionKind =
  | 'selection'
  | 'queued-annotation'
  | 'reversal-request';

export interface UndoSelectionSnapshot {
  selectedElement: HTMLElement | null;
  selectedElements: HTMLElement[];
  selectedRegion: RegionCapture | null;
  selectedEntryId: string | null;
  runtimeContext: RuntimeContext | null;
  manifestEntry: ManifestEntry | null;
  manifestEntries: ManifestEntry[];
}

export interface UndoAction {
  id: string;
  kind: UndoActionKind;
  label: string;
  description: string;
  timestamp: string;
  selectionBefore?: UndoSelectionSnapshot;
  annotation?: Annotation;
  annotationId?: string;
}

export interface UndoResult {
  ok: boolean;
  kind: UndoActionKind;
  message: string;
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
  activeTab: SettingsTab;
  dispatchProjectDefaults: DispatchProjectDefaults;
  dispatchSession: DispatchSessionState;
  dispatchBatches: DispatchBatch[];
  undoStack: UndoAction[];

  // Connection State
  relayConnected: boolean;
  relayPort: number | null;
  relayHost: string | null;
  runnerStatus: RunnerSnapshot;

  // Capture State
  pickerMode: PickerMode;
  commentEntryMode: CommentEntryMode;
  inlineCommentDraft: InlineCommentDraft | null;
  selectedElement: HTMLElement | null;
  selectedElements: HTMLElement[];
  selectedRegion: RegionCapture | null;
  selectedEntryId: string | null;
  hoveredElement: HTMLElement | null;
  runtimeContext: RuntimeContext | null;
  manifestEntry: ManifestEntry | null;
  manifestEntries: ManifestEntry[];

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
