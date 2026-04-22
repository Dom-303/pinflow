/**
 * OverlayStore - Centralized reactive state store for the overlay
 *
 * Follows singleton pattern with subscription-based updates.
 * Components subscribe to state changes and re-render when state updates.
 */

import type {
  Annotation,
  AnnotationContext,
  RuntimeContext,
  ManifestEntry,
} from '@pinflow/core';
import { InteractionModeEnum, InteractionTypeEnum } from '@pinflow/core';
import type {
  OverlayState,
  OverlayMode,
  OverlayOptions,
  OverlayTheme,
  DispatchBatch,
  DispatchBatchStatus,
} from './types.js';
import {
  analyzeDispatchQueue,
  DEFAULT_DISPATCH_PROJECT_DEFAULTS,
  DEFAULT_DISPATCH_SESSION_STATE,
  mergeDispatchConfig,
  normalizeProjectDefaults,
  normalizeSessionOverrides,
} from './dispatch-config.js';
import type {
  DispatchProjectDefaults,
  DispatchSessionOverrides,
  EffectiveDispatchConfig,
} from './dispatch-config.js';
import { BridgeDispatch } from '@pinflow/runtime';
import { RelayService } from '../services/relay-service.js';

/**
 * Listener callback type
 */
export type StateListener = (state: Readonly<OverlayState>) => void;

/**
 * Default state values
 */
const DEFAULT_STATE: OverlayState = {
  // UI State
  mode: 'collapsed',
  theme: 'light',
  sidebarWidth: 360,
  tabOffsetY: 50,
  dispatchProjectDefaults: DEFAULT_DISPATCH_PROJECT_DEFAULTS,
  dispatchSession: DEFAULT_DISPATCH_SESSION_STATE,
  dispatchBatches: [],

  // Connection State
  relayConnected: false,
  relayPort: null,
  relayHost: null,

  // Capture State
  selectedElement: null,
  selectedEntryId: null,
  hoveredElement: null,
  runtimeContext: null,
  manifestEntry: null,

  // Annotation State
  annotations: [],
  annotationInput: '',
  activeAnnotationId: null,
  isSubmitting: false,

  // Debug
  debug: false,
};

/**
 * Centralized state store for the overlay
 */
export class OverlayStore {
  private static instance: OverlayStore | null = null;

  private state: OverlayState;
  private listeners: Set<StateListener> = new Set();

  private static readonly TAB_OFFSET_KEY = 'domscribe:tabOffsetY';
  private static readonly THEME_KEY = 'pinflow:theme';
  private static readonly DISPATCH_DEFAULTS_KEY = 'pinflow:dispatchDefaults';

  private constructor(options?: OverlayOptions) {
    this.state = {
      ...DEFAULT_STATE,
      mode: options?.initialMode ?? 'collapsed',
      theme: options?.initialTheme ?? OverlayStore.loadTheme(),
      sidebarWidth: options?.sidebarWidth ?? 360,
      tabOffsetY: OverlayStore.loadTabOffsetY(),
      dispatchProjectDefaults: OverlayStore.loadDispatchProjectDefaults(),
      dispatchSession: { ...DEFAULT_DISPATCH_SESSION_STATE, overrides: {} },
      debug: options?.debug ?? false,
    };
  }

  /**
   * Load persisted tab vertical offset from localStorage
   */
  private static loadTabOffsetY(): number {
    try {
      const stored = localStorage.getItem(OverlayStore.TAB_OFFSET_KEY);
      if (stored !== null) {
        const val = Number(stored);
        if (!Number.isNaN(val) && val >= 0 && val <= 100) return val;
      }
    } catch {
      // localStorage unavailable
    }
    return 50;
  }

  /**
   * Load persisted theme from localStorage
   */
  private static loadTheme(): OverlayTheme {
    try {
      const stored = localStorage.getItem(OverlayStore.THEME_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // localStorage unavailable
    }
    return 'light';
  }

  private static loadDispatchProjectDefaults(): DispatchProjectDefaults {
    try {
      const stored = localStorage.getItem(OverlayStore.DISPATCH_DEFAULTS_KEY);
      if (!stored) {
        return DEFAULT_DISPATCH_PROJECT_DEFAULTS;
      }
      return normalizeProjectDefaults(
        JSON.parse(stored) as Partial<DispatchProjectDefaults>,
      );
    } catch {
      return DEFAULT_DISPATCH_PROJECT_DEFAULTS;
    }
  }

  /**
   * Set and persist the tab vertical offset (0–100 %)
   */
  setTabOffsetY(percent: number): void {
    const clamped = Math.max(0, Math.min(100, percent));
    this.setState({ tabOffsetY: clamped });
    try {
      localStorage.setItem(
        OverlayStore.TAB_OFFSET_KEY,
        String(Math.round(clamped)),
      );
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Set and persist the active product theme
   */
  setTheme(theme: OverlayTheme): void {
    this.setState({ theme });
    try {
      localStorage.setItem(OverlayStore.THEME_KEY, theme);
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    this.setTheme(this.state.theme === 'light' ? 'dark' : 'light');
  }

  getEffectiveDispatchConfig(): EffectiveDispatchConfig {
    return mergeDispatchConfig(
      this.state.dispatchProjectDefaults,
      this.state.dispatchSession,
    );
  }

  updateDispatchProjectDefaults(
    partial: Partial<DispatchProjectDefaults>,
  ): void {
    const nextDefaults = normalizeProjectDefaults({
      ...this.state.dispatchProjectDefaults,
      ...partial,
    });

    this.setState({ dispatchProjectDefaults: nextDefaults });

    try {
      localStorage.setItem(
        OverlayStore.DISPATCH_DEFAULTS_KEY,
        JSON.stringify(nextDefaults),
      );
    } catch {
      // localStorage unavailable
    }

    this.reconcileDispatchQueue();
  }

  setDispatchSessionOverrides(
    partial: Partial<DispatchSessionOverrides>,
  ): void {
    this.setState({
      dispatchSession: {
        ...this.state.dispatchSession,
        overrides: normalizeSessionOverrides({
          ...this.state.dispatchSession.overrides,
          ...partial,
        }),
      },
    });

    this.reconcileDispatchQueue();
  }

  clearDispatchSessionOverrides(): void {
    this.setState({
      dispatchSession: {
        ...DEFAULT_DISPATCH_SESSION_STATE,
        paused: this.state.dispatchSession.paused,
        releasedAnnotationIds: this.state.dispatchSession.releasedAnnotationIds,
        awaitingConfirmationIds:
          this.state.dispatchSession.awaitingConfirmationIds,
        flowActive: this.state.dispatchSession.flowActive,
      },
    });

    this.reconcileDispatchQueue();
  }

  setDispatchPaused(paused: boolean): void {
    this.setState({
      dispatchSession: {
        ...this.state.dispatchSession,
        paused,
      },
    });

    this.reconcileDispatchQueue();
  }

  toggleDispatchPaused(): void {
    this.setDispatchPaused(!this.state.dispatchSession.paused);
  }

  releaseNextDispatchBatch(): string[] {
    const effective = this.getEffectiveDispatchConfig();
    const analysis = analyzeDispatchQueue(this.state.annotations, {
      releasedAnnotationIds: this.state.dispatchSession.releasedAnnotationIds,
      awaitingConfirmationIds:
        this.state.dispatchSession.awaitingConfirmationIds,
      concurrency: effective.concurrency,
    });

    const nextIds =
      analysis.awaitingConfirmationIds.length > 0
        ? analysis.awaitingConfirmationIds
        : analysis.releasableIds;

    return this.applyDispatchRelease(nextIds);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(options?: OverlayOptions): OverlayStore {
    if (!OverlayStore.instance) {
      OverlayStore.instance = new OverlayStore(options);
    }
    return OverlayStore.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (OverlayStore.instance) {
      OverlayStore.instance.listeners.clear();
    }
    OverlayStore.instance = null;
  }

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<OverlayState> {
    return this.state;
  }

  /**
   * Update state with partial changes
   */
  setState(partial: Partial<OverlayState>): void {
    const prevState = this.state;
    this.state = { ...this.state, ...partial };

    if (this.state.debug) {
      console.log('[domscribe-overlay][store] State updated:', {
        changed: Object.keys(partial),
        prev: prevState,
        next: this.state,
      });
    }

    this.notifyListeners();
  }

  setAnnotations(annotations: Annotation[]): void {
    this.setState({ annotations });
    this.reconcileDispatchQueue();
    this.reconcileDispatchBatches();
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);

    // Immediately call with current state
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const frozenState = this.state;
    this.listeners.forEach((listener) => {
      try {
        listener(frozenState);
      } catch (error) {
        if (this.state.debug) {
          console.error('[domscribe-overlay][store] Listener error:', error);
        }
      }
    });
  }

  // ============================================================================
  // Convenience methods for common state transitions
  // ============================================================================

  /**
   * Set the overlay mode
   */
  setMode(mode: OverlayMode): void {
    this.setState({ mode });
  }

  /**
   * Toggle between collapsed and expanded
   */
  toggleSidebar(): void {
    const currentMode = this.state.mode;
    if (currentMode === 'collapsed') {
      this.setState({ mode: 'expanded' });
    } else if (currentMode === 'expanded' || currentMode === 'capturing') {
      this.setState({ mode: 'collapsed' });
    }
  }

  /**
   * Enter capture mode
   */
  enterCaptureMode(): void {
    this.setState({
      mode: 'capturing',
      hoveredElement: null,
    });
  }

  /**
   * Exit capture mode (back to expanded)
   */
  exitCaptureMode(): void {
    this.setState({
      mode: 'expanded',
      hoveredElement: null,
    });
  }

  /**
   * Set selected element with its data
   */
  setSelectedElement(
    element: HTMLElement | null,
    entryId: string | null = null,
  ): void {
    this.setState({
      selectedElement: element,
      selectedEntryId: entryId,
    });
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.setState({
      selectedElement: null,
      selectedEntryId: null,
      runtimeContext: null,
      manifestEntry: null,
    });
  }

  /**
   * Set relay connection status
   */
  setRelayConnection(connected: boolean, port?: number, host?: string): void {
    this.setState({
      relayConnected: connected,
      relayPort: port ?? null,
      relayHost: host ?? null,
    });
  }

  /**
   * Set hovered element during capture mode
   */
  setHoveredElement(element: HTMLElement | null): void {
    this.setState({ hoveredElement: element });
  }

  /**
   * Select an element and capture its context
   * This is called when the user clicks an element during capture mode
   */
  async selectElement(element: HTMLElement): Promise<void> {
    const entryId = element.getAttribute('data-ds');

    // Set the element immediately
    this.setState({
      selectedElement: element,
      selectedEntryId: entryId,
      mode: 'expanded',
      hoveredElement: null,
    });

    // Capture runtime context asynchronously
    try {
      const bridge = BridgeDispatch.getInstance();
      const runtimeContext = await bridge.captureContext(element);

      if (runtimeContext) {
        this.setState({ runtimeContext });
      }
    } catch (error) {
      if (this.state.debug) {
        console.warn(
          '[domscribe-overlay][store] Failed to capture runtime context:',
          error,
        );
      }
    }

    // Resolve manifest entry if we have an element ID
    if (entryId) {
      try {
        const relayService = RelayService.getInstance();
        const manifestEntry = await relayService.resolve(entryId);

        if (manifestEntry) {
          this.setState({ manifestEntry });
        }
      } catch (error) {
        if (this.state.debug) {
          console.warn(
            '[domscribe-overlay][store] Failed to resolve manifest entry:',
            error,
          );
        }
      }
    }
  }

  /**
   * Submit an annotation for the selected element
   */
  async submitAnnotation(content: string): Promise<Annotation | null> {
    const { selectedElement, selectedEntryId, runtimeContext, manifestEntry } =
      this.state;

    if (!selectedElement) {
      throw new Error('No element selected');
    }

    this.setState({ isSubmitting: true });

    try {
      const relayService = RelayService.getInstance();

      // Build selector path for the element
      const selector = this.buildSelectorPath(selectedElement);

      // Get attributes
      const attributes: Record<string, string> = {};
      for (let i = 0; i < selectedElement.attributes.length; i++) {
        const attr = selectedElement.attributes[i];
        attributes[attr.name] = attr.value;
      }

      // Get bounding rect
      const rect = selectedElement.getBoundingClientRect();

      const annotation = await relayService.createAnnotation({
        mode: InteractionModeEnum.ELEMENT_CLICK,
        interaction: {
          type: InteractionTypeEnum.ELEMENT_ANNOTATION,
          selectedElement: {
            tagName: selectedElement.tagName.toLowerCase(),
            selector,
            dataDs: selectedEntryId ?? undefined,
            attributes,
            innerText: selectedElement.innerText?.slice(0, 100),
          },
          boundingRect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
          },
        },
        context: {
          pageUrl: window.location.href,
          pageTitle: document.title,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          userAgent: navigator.userAgent,
          userMessage: content,
          manifestSnapshot: manifestEntry ? [manifestEntry] : undefined,
          runtimeContext: runtimeContext ?? undefined,
        },
      });

      // Clear submission state — the annotation list is already refreshed
      // by relay-service.createAnnotation() via refreshAnnotations()
      this.setState({ isSubmitting: false });

      // Clear the selected element so the user can pick a new one
      this.clearSelection();

      return annotation;
    } catch (error) {
      this.setState({ isSubmitting: false });
      throw error;
    }
  }

  /**
   * Build a CSS selector path for an element
   */
  private buildSelectorPath(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        parts.unshift(selector);
        break;
      } else if (current.className) {
        const classes = current.className.split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 2).join('.')}`;
        }
      }

      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  /**
   * Set runtime context for the selected element
   */
  setRuntimeContext(context: RuntimeContext | null): void {
    this.setState({ runtimeContext: context });
  }

  /**
   * Set manifest entry for the selected element
   */
  setManifestEntry(entry: ManifestEntry | null): void {
    this.setState({ manifestEntry: entry });
  }

  /**
   * Add annotations (e.g., from WebSocket updates)
   */
  addAnnotations(annotations: Annotation[]): void {
    this.setAnnotations([...annotations, ...this.state.annotations]);
  }

  /**
   * Update an existing annotation
   */
  updateAnnotation(id: string, updates: Partial<Annotation>): void {
    this.setAnnotations(
      this.state.annotations.map((a) =>
        a.metadata.id === id ? { ...a, ...updates } : a,
      ),
    );
  }

  /**
   * Re-capture runtime context and manifest data for an existing annotation,
   * then patch it via the relay service.
   *
   * @returns The located DOM element (for highlighting), or null if not found
   */
  async refreshAnnotationMetadata(
    annotation: Annotation,
  ): Promise<HTMLElement | null> {
    const dataDs = annotation.interaction.selectedElement?.dataDs;
    const selector = annotation.interaction.selectedElement?.selector;

    // Locate element
    let element: HTMLElement | null = null;
    if (dataDs) {
      element = document.querySelector<HTMLElement>(`[data-ds="${dataDs}"]`);
    }
    if (!element && selector) {
      element = document.querySelector<HTMLElement>(selector);
    }
    if (!element) return null;

    // Re-capture runtime context
    let runtimeContext: RuntimeContext | undefined;
    try {
      const bridge = BridgeDispatch.getInstance();
      const ctx = await bridge.captureContext(element);
      if (ctx) {
        runtimeContext = ctx;
      }
    } catch {
      // Continue without runtime context
    }

    // Re-resolve manifest entry
    let manifestSnapshot: ManifestEntry[] | undefined;
    if (dataDs) {
      try {
        const relay = RelayService.getInstance();
        const entry = await relay.resolve(dataDs);
        if (entry) {
          manifestSnapshot = [entry];
        }
      } catch {
        // Continue without manifest
      }
    }

    // Patch the annotation with fresh data
    const updates: Partial<AnnotationContext> = {};
    if (runtimeContext) updates.runtimeContext = runtimeContext;
    if (manifestSnapshot) updates.manifestSnapshot = manifestSnapshot;

    if (Object.keys(updates).length > 0) {
      const relay = RelayService.getInstance();
      await relay.patchAnnotation(annotation.metadata.id, {
        context: updates,
      });
    }

    return element;
  }

  /**
   * Locate an annotation's DOM element, scroll to it, and apply a temporary highlight.
   *
   * @returns The element if found, null otherwise
   */
  locateElement(annotation: Annotation): HTMLElement | null {
    const dataDs = annotation.interaction.selectedElement?.dataDs;
    const selector = annotation.interaction.selectedElement?.selector;

    let element: HTMLElement | null = null;
    if (dataDs) {
      element = document.querySelector<HTMLElement>(`[data-ds="${dataDs}"]`);
    }
    if (!element && selector) {
      element = document.querySelector<HTMLElement>(selector);
    }
    if (!element) return null;

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Apply temporary highlight
    const prevOutline = element.style.outline;
    const prevTransition = element.style.transition;
    element.style.transition = 'outline 0.2s ease';
    element.style.outline = '2px solid #06b6d4';

    // Pulse: remove after 2s
    setTimeout(() => {
      element.style.outline = prevOutline;
      element.style.transition = prevTransition;
    }, 2000);

    return element;
  }

  private reconcileDispatchQueue(): void {
    const effective = this.getEffectiveDispatchConfig();
    const analysis = analyzeDispatchQueue(this.state.annotations, {
      releasedAnnotationIds: this.state.dispatchSession.releasedAnnotationIds,
      awaitingConfirmationIds:
        this.state.dispatchSession.awaitingConfirmationIds,
      concurrency: effective.concurrency,
    });

    const hasQueuedWork =
      analysis.queuedIds.length > 0 ||
      analysis.awaitingConfirmationIds.length > 0 ||
      analysis.inFlightIds.length > 0;

    const nextFlowActive =
      this.state.dispatchSession.flowActive && hasQueuedWork;

    const shouldSyncTracking =
      analysis.inFlightIds.join('|') !==
        this.state.dispatchSession.releasedAnnotationIds.join('|') ||
      analysis.awaitingConfirmationIds.join('|') !==
        this.state.dispatchSession.awaitingConfirmationIds.join('|') ||
      nextFlowActive !== this.state.dispatchSession.flowActive;

    if (shouldSyncTracking) {
      this.setState({
        dispatchSession: {
          ...this.state.dispatchSession,
          releasedAnnotationIds: analysis.inFlightIds,
          awaitingConfirmationIds: analysis.awaitingConfirmationIds,
          flowActive: nextFlowActive,
        },
      });
    }

    if (
      effective.paused ||
      effective.channel === 'queue_only' ||
      analysis.releasableIds.length === 0
    ) {
      return;
    }

    const canContinue =
      this.state.dispatchSession.flowActive || analysis.inFlightIds.length > 0;
    const thresholdReached =
      analysis.unreleasedWaitingIds.length >= effective.threshold;

    if (effective.mode === 'manual') {
      return;
    }

    if (effective.mode === 'immediate') {
      if (canContinue) {
        this.continueDispatchFlow(effective.continuation, analysis.releasableIds);
        return;
      }

      this.applyDispatchRelease(analysis.releasableIds);
      return;
    }

    if (!thresholdReached && !canContinue) {
      return;
    }

    this.continueDispatchFlow(effective.continuation, analysis.releasableIds);
  }

  private continueDispatchFlow(
    continuation: EffectiveDispatchConfig['continuation'],
    releasableIds: string[],
  ): void {
    if (releasableIds.length === 0) {
      return;
    }

    if (continuation === 'automatic') {
      this.applyDispatchRelease(releasableIds);
      return;
    }

    if (continuation === 'confirm') {
      this.setState({
        dispatchSession: {
          ...this.state.dispatchSession,
          awaitingConfirmationIds: releasableIds,
          flowActive: true,
        },
      });
    }
  }

  private reconcileDispatchBatches(): void {
    if (this.state.dispatchBatches.length === 0) {
      return;
    }

    const nextBatches = this.state.dispatchBatches.map((batch) =>
      this.syncDispatchBatch(batch),
    );

    const hasChanged = nextBatches.some((batch, index) => {
      const previous = this.state.dispatchBatches[index];
      return (
        batch.status !== previous.status ||
        batch.queuedCount !== previous.queuedCount ||
        batch.processingCount !== previous.processingCount ||
        batch.completedCount !== previous.completedCount ||
        batch.failedCount !== previous.failedCount
      );
    });

    if (hasChanged) {
      this.setState({ dispatchBatches: nextBatches });
    }
  }

  private syncDispatchBatch(batch: DispatchBatch): DispatchBatch {
    const included = this.state.annotations.filter((annotation) =>
      batch.annotationIds.includes(annotation.metadata.id),
    );

    const queuedCount = included.filter(
      (annotation) => annotation.metadata.status === 'queued',
    ).length;
    const processingCount = included.filter(
      (annotation) => annotation.metadata.status === 'processing',
    ).length;
    const completedCount = included.filter(
      (annotation) => annotation.metadata.status === 'processed',
    ).length;
    const failedCount = included.filter(
      (annotation) => annotation.metadata.status === 'failed',
    ).length;

    return {
      ...batch,
      status: OverlayStore.resolveDispatchBatchStatus({
        queuedCount,
        processingCount,
        completedCount,
        failedCount,
      }),
      queuedCount,
      processingCount,
      completedCount,
      failedCount,
    };
  }

  private static resolveDispatchBatchStatus({
    queuedCount,
    processingCount,
    completedCount,
    failedCount,
  }: {
    queuedCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
  }): DispatchBatchStatus {
    if (processingCount > 0) {
      return 'running';
    }

    if (queuedCount > 0) {
      return 'queued';
    }

    if (completedCount > 0 && failedCount > 0) {
      return 'mixed';
    }

    if (failedCount > 0) {
      return 'failed';
    }

    return 'completed';
  }

  private applyDispatchRelease(annotationIds: string[]): string[] {
    if (annotationIds.length === 0) {
      return [];
    }

    const channel = this.getEffectiveDispatchConfig().channel;
    const nextBatch: DispatchBatch = this.syncDispatchBatch({
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channel,
      annotationIds,
      releasedAt: new Date().toISOString(),
      status: 'queued',
      queuedCount: 0,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
    });

    const nextReleased = Array.from(
      new Set([
        ...this.state.dispatchSession.releasedAnnotationIds,
        ...annotationIds,
      ]),
    );

    this.setState({
      dispatchSession: {
        ...this.state.dispatchSession,
        releasedAnnotationIds: nextReleased,
        awaitingConfirmationIds:
          this.state.dispatchSession.awaitingConfirmationIds.filter(
            (id) => !annotationIds.includes(id),
          ),
        flowActive: true,
      },
      dispatchBatches: [nextBatch, ...this.state.dispatchBatches].slice(0, 12),
    });

    window.dispatchEvent(
      new CustomEvent('pinflow:dispatch-release', {
        detail: {
          annotationIds,
          channel,
        },
      }),
    );

    return annotationIds;
  }
}
