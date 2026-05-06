/**
 * RelayService - Unified relay server communication service
 *
 * Combines HTTP and WebSocket clients for complete relay integration.
 * Manages connection state and updates OverlayStore.
 */

import { OverlayStore } from '../core/overlay-store.js';
import { RelayHttpClient, RelayWSClient } from '@pinflow/relay/client';
import type {
  Annotation,
  ManifestEntry,
  InteractionMode,
  AnnotationInteraction,
  AnnotationContext,
  AnnotationDispatchTarget,
  AnnotationStatus,
  AnnotationId,
} from '@pinflow/core';
import type { RunnerSnapshot } from '@pinflow/relay/client';
import type { AnnotationRunEvidenceResponse } from '@pinflow/relay/client';
import { AnnotationStatusEnum, WS_EVENTS, OverlaySettingsSchema } from '@pinflow/core';
import type { OverlaySettings } from '@pinflow/core';
import { BridgeDispatch } from '@pinflow/runtime';
import type { DispatchChannel } from '../core/dispatch-config.js';

/**
 * Unified relay service
 */
export class RelayService {
  private static instance: RelayService | null = null;

  private relayHttpClient: RelayHttpClient | null = null;
  private wsClient: RelayWSClient | null = null;
  private store: OverlayStore;
  private unsubscribers: Array<() => void> = [];
  private statusPollTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.store = OverlayStore.getInstance();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): RelayService {
    if (!RelayService.instance) {
      RelayService.instance = new RelayService();
    }
    return RelayService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (RelayService.instance) {
      RelayService.instance.cleanup();
    }
    RelayService.instance = null;
  }

  /**
   * Initialize connection using injected globals
   * @returns true if connected successfully
   */
  async initialize(): Promise<boolean> {
    const port = window.__PINFLOW_RELAY_PORT__;
    const host = window.__PINFLOW_RELAY_HOST__ ?? '127.0.0.1';
    const debug = this.store.getState().debug;

    if (!port) {
      if (debug) {
        console.warn(
          '[pinflow-overlay][relay-service] Relay port not found. ' +
            'Make sure the PinFlow plugin is configured with relay: { autoStart: true }',
        );
      }
      this.store.setRelayConnection(false);
      return false;
    }

    // Create HTTP client
    this.relayHttpClient = new RelayHttpClient(host, port);

    // Verify connection with health check
    try {
      const { status } = await this.relayHttpClient.getHealth();

      if (status !== 'healthy') {
        throw new Error('Relay is not healthy');
      }

      if (debug) {
        console.log(
          `[pinflow-overlay][relay-service] Connected to relay at ${host}:${port}`,
        );
      }
    } catch (error) {
      if (debug) {
        console.error(
          '[pinflow-overlay][relay-service] Health check failed:',
          error,
        );
      }
      this.store.setRelayConnection(false);
      return false;
    }

    // Create and connect WebSocket client
    this.wsClient = new RelayWSClient(host, port, { debug });

    // Subscribe to WebSocket events
    this.unsubscribers.push(
      this.wsClient.on(WS_EVENTS.CONNECTED, () => {
        this.store.setRelayConnection(true, port, host);
      }),
    );

    this.unsubscribers.push(
      this.wsClient.on(WS_EVENTS.DISCONNECTED, () => {
        this.store.setRelayConnection(false);
      }),
    );

    this.unsubscribers.push(
      this.wsClient.onAnnotationCreated(() => {
        this.refreshAnnotations();
      }),
    );

    this.unsubscribers.push(
      this.wsClient.onAnnotationUpdated(() => {
        this.refreshAnnotations();
      }),
    );

    // Handle context requests from relay server (bidirectional WS)
    this.unsubscribers.push(
      this.wsClient.on(WS_EVENTS.CONTEXT_REQUEST, async (data: unknown) => {
        const { requestId, entryId } = data as {
          requestId: string;
          entryId: string;
        };
        const bridge = BridgeDispatch.getInstance();

        let responseData: Record<string, unknown>;
        if (!bridge.isReady()) {
          responseData = {
            requestId,
            success: false,
            rendered: false,
            elementFound: false,
            contextCaptured: false,
            error: 'Runtime bridge is not ready',
          };
        } else {
          try {
            const context = await bridge.captureContextForEntry(entryId);
            const elementInfo = bridge.getElementInfo(entryId);
            const elementFound = elementInfo !== null;
            const contextCaptured = context !== null;
            responseData = {
              requestId,
              success: contextCaptured,
              rendered: elementFound,
              elementFound,
              contextCaptured,
              context: context ?? undefined,
              elementInfo: elementInfo
                ? {
                    tagName: elementInfo.element?.tagName?.toLowerCase(),
                    attributes: Object.fromEntries(
                      Array.from(elementInfo.element?.attributes ?? []).map(
                        (attr) => [attr.name, attr.value],
                      ),
                    ),
                    innerText: elementInfo.element?.innerText?.slice(0, 500),
                  }
                : undefined,
              error:
                elementFound && !contextCaptured
                  ? 'Context capture returned null'
                  : undefined,
            };
          } catch {
            responseData = {
              requestId,
              success: false,
              rendered: false,
              elementFound: false,
              contextCaptured: false,
              error: 'Capture failed',
            };
          }
        }

        this.wsClient?.send(WS_EVENTS.CONTEXT_RESPONSE, responseData);
      }),
    );

    // Connect WebSocket
    this.wsClient.connect();

    // Update store with initial connection state
    this.store.setRelayConnection(true, port, host);

    // Seed overlay settings from the relay (one-time HTTP GET).
    const initialSettings = await this.fetchOverlaySettings();
    if (initialSettings) {
      this.store.applySyncedSettings(initialSettings);
    }

    // Subscribe to broadcasts for cross-tab sync.
    this.unsubscribers.push(
      this.wsClient.on(WS_EVENTS.OVERLAY_SETTINGS_UPDATED, (data: unknown) => {
        try {
          const settings = OverlaySettingsSchema.parse(data);
          this.store.applySyncedSettings(settings);
        } catch {
          /* ignore malformed payload */
        }
      }),
    );

    // Load initial annotations
    await this.refreshAnnotations();
    this.startStatusPolling();

    return true;
  }

  /**
   * Fetch current overlay settings from the relay HTTP endpoint.
   * Returns null on any failure — never throws.
   */
  private async fetchOverlaySettings(): Promise<OverlaySettings | null> {
    const port = window.__PINFLOW_RELAY_PORT__;
    const host = window.__PINFLOW_RELAY_HOST__ ?? '127.0.0.1';
    if (!port) return null;
    try {
      const res = await fetch(`http://${host}:${port}/api/overlay-settings`);
      if (!res.ok) return null;
      const json = (await res.json()) as unknown;
      return OverlaySettingsSchema.parse(json);
    } catch {
      return null;
    }
  }

  /**
   * Send a partial overlay-settings update to the relay.
   * Called by the OverlayStore's user-driven setters; sync-driven setters MUST NOT call this.
   */
  requestSettingsUpdate(partial: Partial<OverlaySettings>): void {
    this.wsClient?.send(WS_EVENTS.OVERLAY_SETTINGS_REQUEST, partial);
  }

  async refreshStatus(): Promise<void> {
    if (!this.relayHttpClient) return;

    try {
      const status = await this.relayHttpClient.getStatus();
      this.store.setRunnerStatus(
        status.runner ?? RelayService.emptyRunnerStatus(),
      );
    } catch (error) {
      this.store.setRunnerStatus(RelayService.emptyRunnerStatus());
      if (this.store.getState().debug) {
        console.error(
          '[pinflow-overlay][relay-service] Failed to refresh relay status:',
          error,
        );
      }
    }
  }

  private startStatusPolling(): void {
    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer);
    }

    this.statusPollTimer = setInterval(() => {
      void this.refreshStatus();
    }, 5_000);
  }

  private static emptyRunnerStatus(): RunnerSnapshot {
    return {
      connected: false,
      activeCount: 0,
      sessions: [],
    };
  }

  /**
   * Refresh annotations from server
   */
  async refreshAnnotations(): Promise<void> {
    if (!this.relayHttpClient) return;

    try {
      const result = await this.relayHttpClient.listAnnotations({
        statuses: [
          AnnotationStatusEnum.QUEUED,
          AnnotationStatusEnum.CLAIMED,
          AnnotationStatusEnum.PROCESSING,
          AnnotationStatusEnum.PROCESSED,
          AnnotationStatusEnum.FAILED,
          AnnotationStatusEnum.ARCHIVED,
        ],
        limit: 50,
      });
      this.store.setAnnotations(result.annotations);
      await this.refreshStatus();
    } catch (error) {
      if (this.store.getState().debug) {
        console.error(
          '[pinflow-overlay][relay-service] Failed to refresh annotations:',
          error,
        );
      }
    }
  }

  /**
   * Resolve element ID to source location
   */
  async resolve(entryId: string): Promise<ManifestEntry | null> {
    if (!this.relayHttpClient) return null;

    const result = await this.relayHttpClient.resolveManifestEntry(entryId);
    return result.success ? (result.entry ?? null) : null;
  }

  /**
   * Create a new annotation
   */
  async createAnnotation({
    mode,
    interaction,
    context,
  }: {
    mode: InteractionMode;
    interaction: AnnotationInteraction;
    context: AnnotationContext;
  }): Promise<Annotation> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    this.store.setState({ isSubmitting: true });

    try {
      const annotation = await this.relayHttpClient.createAnnotation({
        mode,
        interaction,
        context,
      });

      // Clear input after successful submission
      this.store.setState({
        annotationInput: '',
        isSubmitting: false,
      });

      // Refresh to get latest list
      await this.refreshAnnotations();

      return annotation;
    } catch (error) {
      this.store.setState({ isSubmitting: false });
      throw error;
    }
  }

  /**
   * List annotations with optional filters
   */
  async listAnnotations({
    statuses,
    limit,
    offset,
  }: {
    statuses?: AnnotationStatus[];
    limit?: number;
    offset?: number;
  }) {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    return this.relayHttpClient.listAnnotations({
      statuses,
      limit,
      offset,
    });
  }

  /**
   * Dispatch selected queued annotations through the relay.
   */
  async dispatchAnnotations(
    annotationIds: AnnotationId[],
    channel: DispatchChannel,
  ): Promise<void> {
    if (channel === 'queue_only' || annotationIds.length === 0) {
      return;
    }

    if (!this.relayHttpClient) {
      const connected = await this.initialize();
      if (!connected || !this.relayHttpClient) {
        throw new Error('Lokaler PinFlow-Relay ist nicht verbunden');
      }
    }

    await this.relayHttpClient.dispatchAnnotations({
      annotationIds,
      dispatchTarget: RelayService.toDispatchTarget(channel),
    });
    await this.refreshAnnotations();
  }

  private static toDispatchTarget(
    channel: DispatchChannel,
  ): AnnotationDispatchTarget {
    switch (channel) {
      case 'codex':
        return { provider: 'codex', label: 'Codex' };
      case 'claude':
        return { provider: 'claude', label: 'Claude' };
      case 'auto':
      default:
        return { provider: 'other', label: 'Aktueller Agent' };
    }
  }

  /**
   * Get a single annotation
   */
  async getAnnotation(annotationId: AnnotationId): Promise<Annotation | null> {
    if (!this.relayHttpClient) return null;
    return this.relayHttpClient.getAnnotation(annotationId);
  }

  async getAnnotationRunEvidence(
    annotationId: AnnotationId,
  ): Promise<AnnotationRunEvidenceResponse | null> {
    if (!this.relayHttpClient) return null;
    return this.relayHttpClient.getAnnotationRunEvidence(annotationId);
  }

  /**
   * Archive an annotation (transition to archived status)
   */
  async archiveAnnotation(annotationId: AnnotationId): Promise<void> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    await this.relayHttpClient.updateAnnotationStatus(
      annotationId,
      AnnotationStatusEnum.ARCHIVED,
      {},
    );
    await this.refreshAnnotations();
  }

  /**
   * Delete an annotation permanently
   */
  async deleteAnnotation(annotationId: AnnotationId): Promise<void> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    await this.relayHttpClient.deleteAnnotation(annotationId);
    await this.refreshAnnotations();
  }

  /**
   * Update annotation status
   */
  async updateAnnotationStatus(
    annotationId: AnnotationId,
    status: AnnotationStatus,
  ): Promise<void> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    await this.relayHttpClient.updateAnnotationStatus(annotationId, status, {});
    await this.refreshAnnotations();
  }

  /**
   * Patch annotation context (partial update).
   * Used for refreshing metadata or editing the user message.
   */
  async patchAnnotation(
    annotationId: AnnotationId,
    updates: { context?: Partial<AnnotationContext> },
  ): Promise<Annotation> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    const result = await this.relayHttpClient.patchAnnotation(
      annotationId,
      updates,
    );
    await this.refreshAnnotations();
    return result.annotation;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.store.getState().relayConnected;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Unsubscribe from events
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Disconnect WebSocket
    this.wsClient?.disconnect();
    this.wsClient = null;

    // Clear HTTP client
    this.relayHttpClient = null;

    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer);
      this.statusPollTimer = null;
    }
  }
}
