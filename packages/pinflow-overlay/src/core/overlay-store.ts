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
  BoundingRect,
  SelectedElement,
} from '@pinflow/core';
import { InteractionModeEnum, InteractionTypeEnum } from '@pinflow/core';
import type {
  OverlayState,
  OverlayMode,
  OverlayOptions,
  OverlayTheme,
  PickerMode,
  DispatchBatch,
  DispatchBatchStatus,
  UndoAction,
  UndoResult,
  UndoSelectionSnapshot,
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
  undoStack: [],

  // Connection State
  relayConnected: false,
  relayPort: null,
  relayHost: null,

  // Capture State
  pickerMode: 'element',
  selectedElement: null,
  selectedElements: [],
  selectedRegion: null,
  selectedEntryId: null,
  hoveredElement: null,
  runtimeContext: null,
  manifestEntry: null,
  manifestEntries: [],

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
  private static readonly MAX_UNDO_ACTIONS = 8;

  private state: OverlayState;
  private listeners: Set<StateListener> = new Set();
  private suppressUndoRecording = false;

  private static readonly TAB_OFFSET_KEY = 'pinflow:tabOffsetY';
  private static readonly THEME_KEY = 'pinflow:theme';
  private static readonly DISPATCH_DEFAULTS_KEY = 'pinflow:dispatchDefaults';
  private static readonly PICKER_MODE_KEY = 'pinflow:pickerMode';

  private constructor(options?: OverlayOptions) {
    this.state = {
      ...DEFAULT_STATE,
      mode: options?.initialMode ?? 'collapsed',
      theme: options?.initialTheme ?? OverlayStore.loadTheme(),
      pickerMode: OverlayStore.loadPickerMode(),
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

  private static loadPickerMode(): PickerMode {
    try {
      const stored = localStorage.getItem(OverlayStore.PICKER_MODE_KEY);
      if (stored === 'element' || stored === 'region' || stored === 'multi') {
        return stored;
      }
    } catch {
      // localStorage unavailable
    }
    return 'element';
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
    if (effective.paused || effective.channel === 'queue_only') {
      return [];
    }

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
      console.log('[pinflow-overlay][store] State updated:', {
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

  getUndoPreview(): UndoAction | null {
    return this.state.undoStack[0] ?? null;
  }

  recordSubmittedAnnotation(annotation: Annotation): void {
    const annotationId = annotation.metadata?.id;
    if (!annotationId) {
      return;
    }

    if (this.canDeleteQueuedAnnotation(annotation)) {
      this.pushUndoAction({
        kind: 'queued-annotation',
        label: 'Auftrag zurueckholen',
        description: 'Entfernt den zuletzt gesammelten Auftrag aus der Warteliste.',
        annotation,
        annotationId,
      });
      return;
    }

    this.pushUndoAction({
      kind: 'reversal-request',
      label: 'Ruecknahme beauftragen',
      description:
        'Erstellt einen neuen Auftrag, der die bereits uebergebene Aenderung rueckgaengig macht.',
      annotation,
      annotationId,
    });
  }

  async undoLastAction(): Promise<UndoResult | null> {
    const action = this.state.undoStack[0];
    if (!action) {
      return null;
    }

    if (action.kind === 'selection' && action.selectionBefore) {
      this.suppressUndoRecording = true;
      try {
        this.applySelectionSnapshot(action.selectionBefore);
      } finally {
        this.suppressUndoRecording = false;
      }
      this.popUndoAction(action.id);
      return {
        ok: true,
        kind: action.kind,
        message: 'Auswahl wurde rueckgaengig gemacht.',
      };
    }

    if (action.kind === 'queued-annotation' && action.annotation) {
      const current =
        this.state.annotations.find(
          (annotation) => annotation.metadata.id === action.annotationId,
        ) ?? action.annotation;

      if (this.canDeleteQueuedAnnotation(current)) {
        await this.removeQueuedAnnotation(current.metadata.id);
        this.popUndoAction(action.id);
        return {
          ok: true,
          kind: action.kind,
          message: 'Auftrag wurde aus der Warteliste entfernt.',
        };
      }

      const result = await this.requestAnnotationReversal(current);
      this.popUndoAction(action.id);
      return result;
    }

    if (action.kind === 'reversal-request' && action.annotation) {
      const result = await this.requestAnnotationReversal(action.annotation);
      this.popUndoAction(action.id);
      return result;
    }

    this.popUndoAction(action.id);
    return {
      ok: false,
      kind: action.kind,
      message: 'Diese Aktion ist nicht mehr rueckgaengig machbar.',
    };
  }

  async requestAnnotationReversal(annotation: Annotation): Promise<UndoResult> {
    const relayService = RelayService.getInstance();
    const originalMessage =
      annotation.context?.userMessage?.trim() || annotation.metadata.id;
    const reversal = await relayService.createAnnotation({
      mode: annotation.metadata.mode,
      interaction: annotation.interaction,
      context: {
        ...annotation.context,
        userMessage:
          'Ruecknahme-Auftrag: Bitte mache diese bereits uebergebene PinFlow-Aenderung gezielt rueckgaengig, ohne andere Aenderungen anzufassen.\n\n' +
          `Urspruenglicher Auftrag:\n${originalMessage}`,
      },
    });

    this.recordSubmittedAnnotation(reversal);

    return {
      ok: true,
      kind: 'reversal-request',
      message: 'Ruecknahme-Auftrag wurde in die Warteliste gelegt.',
    };
  }

  async undoAnnotation(annotation: Annotation): Promise<UndoResult> {
    if (this.canDeleteQueuedAnnotation(annotation)) {
      await this.removeQueuedAnnotation(annotation.metadata.id);
      return {
        ok: true,
        kind: 'queued-annotation',
        message: 'Auftrag wurde aus der Warteliste entfernt.',
      };
    }

    return this.requestAnnotationReversal(annotation);
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
          console.error('[pinflow-overlay][store] Listener error:', error);
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
    } else if (
      currentMode === 'expanded' ||
      currentMode === 'mini' ||
      currentMode === 'capturing'
    ) {
      this.setState({ mode: 'collapsed' });
    }
  }

  /**
   * Enter capture mode
   */
  enterCaptureMode(pickerMode: PickerMode = this.state.pickerMode): void {
    this.setState({
      pickerMode,
      mode: 'capturing',
      hoveredElement: null,
    });
  }

  setPickerMode(pickerMode: PickerMode): void {
    this.setState({ pickerMode });
    try {
      localStorage.setItem(OverlayStore.PICKER_MODE_KEY, pickerMode);
    } catch {
      // localStorage unavailable
    }
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
    this.recordSelectionUndo('Auswahl rueckgaengig');
    this.setState({
      selectedElement: element,
      selectedElements: element ? [element] : [],
      selectedRegion: null,
      selectedEntryId: entryId,
    });
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.recordSelectionUndo('Auswahl entfernen rueckgaengig');
    this.setState({
      selectedElement: null,
      selectedElements: [],
      selectedRegion: null,
      selectedEntryId: null,
      runtimeContext: null,
      manifestEntry: null,
      manifestEntries: [],
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

    this.recordSelectionUndo('Auswahl rueckgaengig');

    // Set the element immediately
    this.setState({
      selectedElement: element,
      selectedElements: [element],
      selectedRegion: null,
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
          '[pinflow-overlay][store] Failed to capture runtime context:',
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
          this.setState({ manifestEntry, manifestEntries: [manifestEntry] });
        }
      } catch (error) {
        if (this.state.debug) {
          console.warn(
            '[pinflow-overlay][store] Failed to resolve manifest entry:',
            error,
          );
        }
      }
    }
  }

  async selectMultipleElements(elements: HTMLElement[]): Promise<void> {
    const uniqueElements = Array.from(new Set(elements)).slice(0, 30);
    if (uniqueElements.length === 0) {
      return;
    }

    const primaryElement = uniqueElements[0];
    const entryId = primaryElement.getAttribute('data-ds');

    this.recordSelectionUndo('Auswahl rueckgaengig');

    this.setState({
      pickerMode: 'multi',
      selectedElement: primaryElement,
      selectedElements: uniqueElements,
      selectedRegion: null,
      selectedEntryId: entryId,
      mode: 'expanded',
      hoveredElement: null,
    });

    await this.capturePrimaryContext(primaryElement);
    await this.resolveManifestEntries(uniqueElements);
  }

  async selectRegion(rect: BoundingRect, elements: HTMLElement[]): Promise<void> {
    const uniqueElements = Array.from(new Set(elements)).slice(0, 30);
    const primaryElement = uniqueElements[0] ?? null;
    const entryId = primaryElement?.getAttribute('data-ds') ?? null;

    this.recordSelectionUndo('Bereich rueckgaengig');

    this.setState({
      pickerMode: 'region',
      selectedElement: primaryElement,
      selectedElements: uniqueElements,
      selectedRegion: { rect, elements: uniqueElements },
      selectedEntryId: entryId,
      mode: 'expanded',
      hoveredElement: null,
    });

    if (primaryElement) {
      await this.capturePrimaryContext(primaryElement);
      await this.resolveManifestEntries(uniqueElements);
    }
  }

  /**
   * Submit an annotation for the selected element
   */
  async submitAnnotation(content: string): Promise<Annotation | null> {
    const {
      pickerMode,
      selectedElement,
      selectedElements,
      selectedRegion,
      runtimeContext,
      manifestEntry,
      manifestEntries,
    } = this.state;

    if (!selectedElement && !selectedRegion) {
      throw new Error('No selection available');
    }

    this.setState({ isSubmitting: true });

    try {
      const relayService = RelayService.getInstance();

      const elementModels = selectedElements.map((element) =>
        this.buildSelectedElement(element),
      );
      const primaryElementModel =
        selectedElement !== null
          ? this.buildSelectedElement(selectedElement)
          : elementModels[0];
      const primaryRect =
        selectedElement !== null
          ? this.toBoundingRect(selectedElement.getBoundingClientRect())
          : selectedRegion?.rect;
      const mode =
        pickerMode === 'region'
          ? InteractionModeEnum.REGION_SELECT
          : pickerMode === 'multi'
            ? InteractionModeEnum.MULTI_ELEMENT
            : InteractionModeEnum.ELEMENT_CLICK;
      const type =
        pickerMode === 'region'
          ? InteractionTypeEnum.REGION_ANNOTATION
          : pickerMode === 'multi'
            ? InteractionTypeEnum.MULTI_ELEMENT_ANNOTATION
            : InteractionTypeEnum.ELEMENT_ANNOTATION;
      const snapshots =
        manifestEntries.length > 0
          ? manifestEntries
          : manifestEntry
            ? [manifestEntry]
            : undefined;

      const annotation = await relayService.createAnnotation({
        mode,
        interaction: {
          type,
          selectedElement: primaryElementModel,
          selectedElements:
            elementModels.length > 1 || pickerMode === 'multi' || pickerMode === 'region'
              ? elementModels
              : undefined,
          region: selectedRegion
            ? {
                boundingRect: selectedRegion.rect,
                devicePixelRatio: window.devicePixelRatio,
                elementCount: selectedRegion.elements.length,
              }
            : undefined,
          boundingRect: primaryRect,
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
          manifestSnapshot: snapshots,
          runtimeContext: runtimeContext ?? undefined,
        },
      });

      // Clear submission state — the annotation list is already refreshed
      // by relay-service.createAnnotation() via refreshAnnotations()
      this.setState({ isSubmitting: false });
      this.recordSubmittedAnnotation(annotation);

      // Clear the selected element so the user can pick a new one
      this.clearSelectionWithoutUndo();

      return annotation;
    } catch (error) {
      this.setState({ isSubmitting: false });
      throw error;
    }
  }

  private buildSelectedElement(element: HTMLElement): SelectedElement {
    const attributes: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    return {
      tagName: element.tagName.toLowerCase(),
      selector: this.buildSelectorPath(element),
      dataDs: element.getAttribute('data-ds') ?? undefined,
      attributes,
      innerText: element.innerText?.slice(0, 100),
    };
  }

  private getSelectionSnapshot(): UndoSelectionSnapshot {
    return {
      selectedElement: this.state.selectedElement,
      selectedElements: [...this.state.selectedElements],
      selectedRegion: this.state.selectedRegion
        ? {
            rect: { ...this.state.selectedRegion.rect },
            elements: [...this.state.selectedRegion.elements],
          }
        : null,
      selectedEntryId: this.state.selectedEntryId,
      runtimeContext: this.state.runtimeContext,
      manifestEntry: this.state.manifestEntry,
      manifestEntries: [...this.state.manifestEntries],
    };
  }

  private applySelectionSnapshot(snapshot: UndoSelectionSnapshot): void {
    this.setState({
      selectedElement: snapshot.selectedElement,
      selectedElements: [...snapshot.selectedElements],
      selectedRegion: snapshot.selectedRegion
        ? {
            rect: { ...snapshot.selectedRegion.rect },
            elements: [...snapshot.selectedRegion.elements],
          }
        : null,
      selectedEntryId: snapshot.selectedEntryId,
      runtimeContext: snapshot.runtimeContext,
      manifestEntry: snapshot.manifestEntry,
      manifestEntries: [...snapshot.manifestEntries],
    });
  }

  private hasActiveSelection(): boolean {
    return (
      this.state.selectedElement !== null ||
      this.state.selectedElements.length > 0 ||
      this.state.selectedRegion !== null ||
      this.state.selectedEntryId !== null
    );
  }

  private recordSelectionUndo(label: string): void {
    if (this.suppressUndoRecording) {
      return;
    }

    const snapshot = this.getSelectionSnapshot();
    const hasNextMeaningfulUndo =
      this.hasActiveSelection() ||
      snapshot.selectedElement !== null ||
      snapshot.selectedElements.length > 0 ||
      snapshot.selectedRegion !== null ||
      snapshot.selectedEntryId !== null;

    if (!hasNextMeaningfulUndo) {
      this.pushUndoAction({
        kind: 'selection',
        label,
        description: 'Setzt die zuletzt markierte Auswahl wieder zurueck.',
        selectionBefore: snapshot,
      });
      return;
    }

    this.pushUndoAction({
      kind: 'selection',
      label,
      description: 'Setzt die zuletzt markierte Auswahl wieder zurueck.',
      selectionBefore: snapshot,
    });
  }

  private clearSelectionWithoutUndo(): void {
    this.setState({
      selectedElement: null,
      selectedElements: [],
      selectedRegion: null,
      selectedEntryId: null,
      runtimeContext: null,
      manifestEntry: null,
      manifestEntries: [],
    });
  }

  private pushUndoAction(
    action: Omit<UndoAction, 'id' | 'timestamp'>,
  ): void {
    const nextAction: UndoAction = {
      ...action,
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    this.setState({
      undoStack: [nextAction, ...this.state.undoStack].slice(
        0,
        OverlayStore.MAX_UNDO_ACTIONS,
      ),
    });
  }

  private popUndoAction(actionId: string): void {
    this.setState({
      undoStack: this.state.undoStack.filter((action) => action.id !== actionId),
    });
  }

  private canDeleteQueuedAnnotation(annotation: Annotation): boolean {
    const id = annotation.metadata?.id;
    if (!id || annotation.metadata.status !== 'queued') {
      return false;
    }

    return !this.state.dispatchSession.releasedAnnotationIds.includes(id);
  }

  private async removeQueuedAnnotation(annotationId: string): Promise<void> {
    const relayService = RelayService.getInstance();
    await relayService.deleteAnnotation(annotationId);

    this.setState({
      annotations: this.state.annotations.filter(
        (annotation) => annotation.metadata.id !== annotationId,
      ),
      dispatchSession: {
        ...this.state.dispatchSession,
        releasedAnnotationIds:
          this.state.dispatchSession.releasedAnnotationIds.filter(
            (id) => id !== annotationId,
          ),
        awaitingConfirmationIds:
          this.state.dispatchSession.awaitingConfirmationIds.filter(
            (id) => id !== annotationId,
          ),
      },
      dispatchBatches: this.state.dispatchBatches
        .map((batch) => ({
          ...batch,
          annotationIds: batch.annotationIds.filter((id) => id !== annotationId),
        }))
        .filter((batch) => batch.annotationIds.length > 0),
    });

    this.reconcileDispatchQueue();
    this.reconcileDispatchBatches();
  }

  private toBoundingRect(rect: DOMRect | BoundingRect): BoundingRect {
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  }

  private async capturePrimaryContext(element: HTMLElement): Promise<void> {
    try {
      const bridge = BridgeDispatch.getInstance();
      const runtimeContext = await bridge.captureContext(element);

      if (runtimeContext) {
        this.setState({ runtimeContext });
      }
    } catch (error) {
      if (this.state.debug) {
        console.warn(
          '[pinflow-overlay][store] Failed to capture runtime context:',
          error,
        );
      }
    }
  }

  private async resolveManifestEntries(elements: HTMLElement[]): Promise<void> {
    const entryIds = Array.from(
      new Set(
        elements
          .map((element) => element.getAttribute('data-ds'))
          .filter((entryId): entryId is string => Boolean(entryId)),
      ),
    ).slice(0, 30);

    if (entryIds.length === 0) {
      this.setState({ manifestEntry: null, manifestEntries: [] });
      return;
    }

    const relayService = RelayService.getInstance();
    const entries: ManifestEntry[] = [];

    for (const entryId of entryIds) {
      try {
        const entry = await relayService.resolve(entryId);
        if (entry) {
          entries.push(entry);
        }
      } catch (error) {
        if (this.state.debug) {
          console.warn(
            '[pinflow-overlay][store] Failed to resolve manifest entry:',
            error,
          );
        }
      }
    }

    this.setState({
      manifestEntry: entries[0] ?? null,
      manifestEntries: entries,
    });
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
