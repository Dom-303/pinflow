/**
 * AnnotationService - Domain logic for annotation lifecycle management.
 *
 * Storage is delegated to an AnnotationStorageProvider, keeping this
 * service focused on status transitions, events, search, and pagination.
 */
import type {
  AgentResponse,
  Annotation,
  AnnotationContext,
  AnnotationDispatchTarget,
  AnnotationId,
  AnnotationInteraction,
  AnnotationStatus,
  AnnotationSummary,
  AnnotationVerification,
  InteractionMode,
  ManifestEntry,
  ManifestEntryId,
} from '@pinflow/core';
import {
  ANNOTATION_SCHEMA_VERSION,
  AnnotationStatusEnum,
  generateAnnotationId,
  WS_EVENTS,
} from '@pinflow/core';
import { randomUUID } from 'crypto';
import type { AnnotationStorageProvider } from './storage/annotation-storage.js';

/**
 * Valid annotation status values
 */
const STATUSES: readonly AnnotationStatus[] = [
  AnnotationStatusEnum.QUEUED,
  AnnotationStatusEnum.CLAIMED,
  AnnotationStatusEnum.PROCESSING,
  AnnotationStatusEnum.PROCESSED,
  AnnotationStatusEnum.FAILED,
  AnnotationStatusEnum.ARCHIVED,
] as const;

/**
 * Valid status transitions for annotation lifecycle
 */
const VALID_TRANSITIONS: Record<AnnotationStatus, AnnotationStatus[]> = {
  [AnnotationStatusEnum.QUEUED]: [
    AnnotationStatusEnum.CLAIMED,
    AnnotationStatusEnum.PROCESSING,
    AnnotationStatusEnum.ARCHIVED,
  ],
  [AnnotationStatusEnum.CLAIMED]: [
    AnnotationStatusEnum.QUEUED,
    AnnotationStatusEnum.PROCESSING,
    AnnotationStatusEnum.PROCESSED,
    AnnotationStatusEnum.FAILED,
    AnnotationStatusEnum.ARCHIVED,
  ],
  [AnnotationStatusEnum.PROCESSING]: [
    AnnotationStatusEnum.PROCESSED,
    AnnotationStatusEnum.FAILED,
    AnnotationStatusEnum.ARCHIVED,
  ],
  [AnnotationStatusEnum.PROCESSED]: [AnnotationStatusEnum.ARCHIVED],
  [AnnotationStatusEnum.FAILED]: [
    AnnotationStatusEnum.QUEUED,
    AnnotationStatusEnum.ARCHIVED,
  ], // Allow retry (queued) from failed
  [AnnotationStatusEnum.ARCHIVED]: [], // Terminal state
};

export interface CreateAnnotationInput {
  mode: InteractionMode;
  interaction: AnnotationInteraction;
  context: Omit<AnnotationContext, 'manifestSnapshot'>;
}

export interface ListAnnotationsOptions {
  status?: AnnotationStatus[];
  limit?: number;
  offset?: number;
}

export interface ListAnnotationsResult {
  annotations: Annotation[];
  total: number;
  hasMore: boolean;
}

export interface SearchAnnotationsOptions {
  entryId?: ManifestEntryId;
  file?: string;
  query?: string;
  status?: AnnotationStatus[];
  limit?: number;
}

export interface SearchAnnotationsResult {
  annotations: AnnotationSummary[];
  total: number;
}

export interface UpdateStatusOptions {
  errorDetails?: string;
}

export interface ClaimNextOptions {
  maxRetries?: number;
  agentId?: string;
  leaseMs?: number;
  now?: Date;
  dispatchTarget?: AnnotationDispatchTarget;
}

export interface ClaimByIdsOptions {
  annotationIds: AnnotationId[];
  agentId?: string;
  leaseMs?: number;
  now?: Date;
  dispatchTarget?: AnnotationDispatchTarget;
}

export interface ClaimByIdsResult {
  claimed: Annotation[];
  skippedIds: AnnotationId[];
}

export interface ReleaseByIdsResult {
  released: Annotation[];
  skippedIds: AnnotationId[];
}

const DEFAULT_CLAIM_AGENT_ID = 'pinflow-agent';
const DEFAULT_CLAIM_LEASE_MS = 15 * 60 * 1000;

/**
 * Event types emitted by AnnotationService
 */
type AnnotationEvent =
  | {
      type: typeof WS_EVENTS.ANNOTATION_CREATED;
      data: { id: string; status: AnnotationStatus };
    }
  | {
      type: typeof WS_EVENTS.ANNOTATION_UPDATED;
      data: { id: string; status: AnnotationStatus };
    };

/**
 * Listener for annotation events
 */
type AnnotationEventListener = (event: AnnotationEvent) => void;

/**
 * AnnotationService - Annotation lifecycle management with pluggable storage.
 */
export class AnnotationService {
  private readonly listeners: Set<AnnotationEventListener> = new Set();

  constructor(private readonly storage: AnnotationStorageProvider) {}

  /**
   * Initialize the service by preparing storage buckets.
   */
  async initialize(): Promise<void> {
    await this.storage.initialize(STATUSES);
  }

  /**
   * Create a new annotation
   */
  async create(
    input: CreateAnnotationInput,
    manifestSnapshot?: ManifestEntry[],
  ): Promise<Annotation> {
    const timestamp = new Date().toISOString();
    const id = generateAnnotationId();

    const annotation: Annotation = {
      metadata: {
        id,
        timestamp,
        mode: input.mode,
        status: AnnotationStatusEnum.QUEUED,
        schemaVersion: ANNOTATION_SCHEMA_VERSION,
      },
      interaction: input.interaction,
      context: {
        ...input.context,
        manifestSnapshot,
      },
    };

    await this.storage.write(annotation);
    this.emit({
      type: WS_EVENTS.ANNOTATION_CREATED,
      data: { id, status: AnnotationStatusEnum.QUEUED },
    });

    return annotation;
  }

  /**
   * Get an annotation by ID
   */
  async get(id: AnnotationId): Promise<Annotation | null> {
    for (const status of STATUSES) {
      const annotation = await this.storage.read(id, status);
      if (annotation) {
        return annotation;
      }
    }
    return null;
  }

  /**
   * List annotations with optional filters
   */
  async list(
    options: ListAnnotationsOptions = {},
  ): Promise<ListAnnotationsResult> {
    const statuses = options.status ?? [
      AnnotationStatusEnum.QUEUED,
      AnnotationStatusEnum.CLAIMED,
      AnnotationStatusEnum.PROCESSING,
      AnnotationStatusEnum.PROCESSED,
      AnnotationStatusEnum.FAILED,
    ];
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    const annotations: Annotation[] = [];

    for (const status of statuses) {
      const items = await this.storage.listByStatus(status);
      annotations.push(...items);
    }

    // Sort by timestamp descending (newest first)
    annotations.sort(
      (a, b) =>
        new Date(b.metadata.timestamp).getTime() -
        new Date(a.metadata.timestamp).getTime(),
    );

    const total = annotations.length;
    const paged = annotations.slice(offset, offset + limit);

    return {
      annotations: paged,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Update annotation status with validation
   */
  async updateStatus(
    id: string,
    newStatus: AnnotationStatus,
    options: UpdateStatusOptions = {},
  ): Promise<Annotation> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    const currentStatus = annotation.metadata.status;

    // Validate transition
    if (!VALID_TRANSITIONS[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${currentStatus} → ${newStatus}`,
      );
    }

    // Update metadata
    annotation.metadata.status = newStatus;
    if (options.errorDetails !== undefined) {
      annotation.metadata.errorDetails = options.errorDetails;
    }
    if (newStatus === AnnotationStatusEnum.CLAIMED) {
      this.setClaimMetadata(annotation, {});
    } else if (newStatus === AnnotationStatusEnum.QUEUED) {
      delete annotation.metadata.claim;
      if (currentStatus === AnnotationStatusEnum.FAILED) {
        annotation.metadata.retryCount =
          (annotation.metadata.retryCount ?? 0) + 1;
      }
    } else if (
      newStatus === AnnotationStatusEnum.PROCESSED ||
      newStatus === AnnotationStatusEnum.FAILED ||
      newStatus === AnnotationStatusEnum.ARCHIVED
    ) {
      delete annotation.metadata.claim;
    }

    // Write to new location
    await this.storage.write(annotation);

    // Remove from old location if different
    if (currentStatus !== newStatus) {
      await this.storage.remove(id, currentStatus);
    }

    this.emit({
      type: WS_EVENTS.ANNOTATION_UPDATED,
      data: { id, status: newStatus },
    });

    return annotation;
  }

  /**
   * Archive an annotation (move to archived status)
   */
  async archive(id: string): Promise<void> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    // Any status can transition to archived
    const currentStatus = annotation.metadata.status;
    if (currentStatus === AnnotationStatusEnum.ARCHIVED) {
      return; // Already archived
    }

    annotation.metadata.status = AnnotationStatusEnum.ARCHIVED;
    delete annotation.metadata.claim;
    await this.storage.write(annotation);
    await this.storage.remove(id, currentStatus);

    this.emit({
      type: WS_EVENTS.ANNOTATION_UPDATED,
      data: { id, status: AnnotationStatusEnum.ARCHIVED },
    });
  }

  /**
   * Delete an annotation permanently
   */
  async delete(id: string): Promise<boolean> {
    for (const status of STATUSES) {
      const removed = await this.storage.remove(id, status);
      if (removed) {
        return true;
      }
    }
    return false;
  }

  /**
   * Subscribe to annotation events
   */
  onEvent(listener: AnnotationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get the count of annotations by status
   */
  async getCountByStatus(): Promise<Record<AnnotationStatus, number>> {
    const counts: Record<AnnotationStatus, number> = {
      [AnnotationStatusEnum.QUEUED]: 0,
      [AnnotationStatusEnum.CLAIMED]: 0,
      [AnnotationStatusEnum.PROCESSING]: 0,
      [AnnotationStatusEnum.PROCESSED]: 0,
      [AnnotationStatusEnum.FAILED]: 0,
      [AnnotationStatusEnum.ARCHIVED]: 0,
    };

    for (const status of STATUSES) {
      counts[status] = await this.storage.countByStatus(status);
    }

    return counts;
  }

  /**
   * Atomically claim the next queued annotation for processing.
   */
  async claimNext(
    optionsOrMaxRetries: ClaimNextOptions | number = {},
  ): Promise<Annotation | null> {
    const options =
      typeof optionsOrMaxRetries === 'number'
        ? { maxRetries: optionsOrMaxRetries }
        : optionsOrMaxRetries;
    const maxRetries = options.maxRetries ?? 3;
    const now = options.now ?? new Date();

    await this.requeueExpiredLeases(now);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { annotations } = await this.list({
        status: [AnnotationStatusEnum.QUEUED],
      });

      if (annotations.length === 0) {
        return null;
      }

      const annotation = this.getNextClaimCandidate(annotations);

      try {
        const claimed = await this.updateStatus(
          annotation.metadata.id,
          AnnotationStatusEnum.CLAIMED,
        );
        this.setClaimMetadata(claimed, options, now);
        if (options.dispatchTarget) {
          claimed.dispatch = {
            target: options.dispatchTarget,
            assignedAt: now.toISOString(),
          };
        }
        await this.storage.write(claimed);
        return claimed;
      } catch (error) {
        // Race condition - another agent claimed it first, retry with next
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes('not found') ||
          message.includes('Invalid status transition')
        ) {
          continue;
        }
        throw error;
      }
    }

    return null;
  }

  /**
   * Atomically claim selected queued annotations for a dispatch release.
   */
  async claimByIds(options: ClaimByIdsOptions): Promise<ClaimByIdsResult> {
    const now = options.now ?? new Date();
    const claimed: Annotation[] = [];
    const skippedIds: AnnotationId[] = [];

    await this.requeueExpiredLeases(now);

    for (const annotationId of options.annotationIds) {
      const annotation = await this.get(annotationId);
      if (
        !annotation ||
        annotation.metadata.status !== AnnotationStatusEnum.QUEUED
      ) {
        skippedIds.push(annotationId);
        continue;
      }

      try {
        const next = await this.updateStatus(
          annotationId,
          AnnotationStatusEnum.CLAIMED,
        );
        this.setClaimMetadata(next, options, now);
        if (options.dispatchTarget) {
          next.dispatch = {
            target: options.dispatchTarget,
            assignedAt: now.toISOString(),
          };
        }
        await this.storage.write(next);
        claimed.push(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes('not found') ||
          message.includes('Invalid status transition')
        ) {
          skippedIds.push(annotationId);
          continue;
        }
        throw error;
      }
    }

    return { claimed, skippedIds };
  }

  /**
   * Mark selected queued annotations as released for agent pickup without
   * claiming them. The MCP process tool remains the single owner of claims.
   */
  async releaseByIds(options: ClaimByIdsOptions): Promise<ReleaseByIdsResult> {
    const now = options.now ?? new Date();
    const released: Annotation[] = [];
    const skippedIds: AnnotationId[] = [];

    await this.requeueExpiredLeases(now);

    for (const annotationId of options.annotationIds) {
      const annotation = await this.get(annotationId);
      if (
        !annotation ||
        annotation.metadata.status !== AnnotationStatusEnum.QUEUED
      ) {
        skippedIds.push(annotationId);
        continue;
      }

      if (options.dispatchTarget) {
        annotation.dispatch = {
          target: options.dispatchTarget,
          assignedAt: now.toISOString(),
        };
      }

      await this.storage.write(annotation);
      this.emit({
        type: WS_EVENTS.ANNOTATION_UPDATED,
        data: {
          id: annotation.metadata.id,
          status: annotation.metadata.status,
        },
      });
      released.push(annotation);
    }

    return { released, skippedIds };
  }

  /**
   * Store agent response on an annotation.
   */
  async respond(
    id: string,
    response: Pick<AgentResponse, 'message'>,
  ): Promise<Annotation> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    if (
      annotation.metadata.status !== AnnotationStatusEnum.CLAIMED &&
      annotation.metadata.status !== AnnotationStatusEnum.PROCESSING
    ) {
      throw new Error(
        `Cannot respond to annotation in '${annotation.metadata.status}' status. ` +
          `Must be in '${AnnotationStatusEnum.CLAIMED}' or '${AnnotationStatusEnum.PROCESSING}' status.`,
      );
    }

    // Set agent response with timestamp
    annotation.agentResponse = {
      message: response.message,
    };

    // Write updated annotation
    await this.storage.write(annotation);

    return annotation;
  }

  /**
   * Patch an annotation with partial context updates.
   */
  async patch(
    id: string,
    updates: { context?: Partial<AnnotationContext> },
  ): Promise<Annotation> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    if (updates.context) {
      annotation.context = {
        ...annotation.context,
        ...updates.context,
      };
    }

    await this.storage.write(annotation);
    this.emit({
      type: WS_EVENTS.ANNOTATION_UPDATED,
      data: { id, status: annotation.metadata.status },
    });

    return annotation;
  }

  /**
   * Persist the latest verification result on an annotation.
   */
  async recordVerification(
    id: string,
    verification: AnnotationVerification,
  ): Promise<Annotation> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    annotation.verification = verification;

    await this.storage.write(annotation);
    this.emit({
      type: WS_EVENTS.ANNOTATION_UPDATED,
      data: { id, status: annotation.metadata.status },
    });

    return annotation;
  }

  /**
   * Search annotations by various criteria.
   */
  async search(
    options: SearchAnnotationsOptions = {},
  ): Promise<SearchAnnotationsResult> {
    const { entryId, file, query, status, limit = 50 } = options;
    const maxLimit = Math.min(limit, 100);

    const statuses = status ?? [
      AnnotationStatusEnum.QUEUED,
      AnnotationStatusEnum.CLAIMED,
      AnnotationStatusEnum.PROCESSING,
      AnnotationStatusEnum.PROCESSED,
      AnnotationStatusEnum.FAILED,
    ];

    const allAnnotations: Annotation[] = [];

    for (const s of statuses) {
      const items = await this.storage.listByStatus(s);
      allAnnotations.push(...items);
    }

    // Apply filters
    let filtered = allAnnotations;

    if (entryId) {
      filtered = filtered.filter(
        (a) => a.interaction.selectedElement?.dataDs === entryId,
      );
    }

    if (file) {
      filtered = filtered.filter((a) =>
        a.context.manifestSnapshot?.some((m) => m.file === file),
      );
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.context.userMessage?.toLowerCase().includes(lowerQuery) ?? false,
      );
    }

    // Sort by timestamp descending
    filtered.sort(
      (a, b) =>
        new Date(b.metadata.timestamp).getTime() -
        new Date(a.metadata.timestamp).getTime(),
    );

    const total = filtered.length;

    // Apply limit and convert to summaries
    const summaries: AnnotationSummary[] = filtered
      .slice(0, maxLimit)
      .map((a) => ({
        id: a.metadata.id,
        status: a.metadata.status,
        timestamp: a.metadata.timestamp,
        entryId: a.interaction.selectedElement?.dataDs,
        file: a.context.manifestSnapshot?.[0]?.file,
        userMessage: a.context.userMessage,
      }));

    return {
      annotations: summaries,
      total,
    };
  }

  private emit(event: AnnotationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private setClaimMetadata(
    annotation: Annotation,
    options: Pick<
      ClaimNextOptions,
      'agentId' | 'leaseMs' | 'dispatchTarget'
    > = {},
    now = new Date(),
  ): void {
    const leaseMs = options.leaseMs ?? DEFAULT_CLAIM_LEASE_MS;
    const claimedBy =
      options.agentId ??
      options.dispatchTarget?.label ??
      options.dispatchTarget?.provider ??
      DEFAULT_CLAIM_AGENT_ID;
    annotation.metadata.claim = {
      claimedBy,
      claimedAt: now.toISOString(),
      leaseExpiresAt: new Date(now.getTime() + leaseMs).toISOString(),
      token: randomUUID(),
    };
  }

  private async requeueExpiredLeases(now: Date): Promise<void> {
    for (const status of [
      AnnotationStatusEnum.CLAIMED,
      AnnotationStatusEnum.PROCESSING,
    ] as const) {
      const annotations = await this.storage.listByStatus(status);

      for (const annotation of annotations) {
        const claim = annotation.metadata.claim;
        if (!claim) {
          continue;
        }

        if (new Date(claim.leaseExpiresAt).getTime() > now.getTime()) {
          continue;
        }

        annotation.metadata.status = AnnotationStatusEnum.QUEUED;
        annotation.metadata.retryCount =
          (annotation.metadata.retryCount ?? 0) + 1;
        annotation.metadata.errorDetails = `Claim lease expired for agent ${claim.claimedBy}`;
        delete annotation.metadata.claim;

        await this.storage.write(annotation);
        await this.storage.remove(annotation.metadata.id, status);

        this.emit({
          type: WS_EVENTS.ANNOTATION_UPDATED,
          data: {
            id: annotation.metadata.id,
            status: AnnotationStatusEnum.QUEUED,
          },
        });
      }
    }
  }

  private getNextClaimCandidate(annotations: Annotation[]): Annotation {
    return [...annotations].sort((a, b) => {
      const aReleased = Boolean(a.dispatch?.assignedAt);
      const bReleased = Boolean(b.dispatch?.assignedAt);

      if (aReleased !== bReleased) {
        return aReleased ? -1 : 1;
      }

      const aTime = Date.parse(a.dispatch?.assignedAt ?? a.metadata.timestamp);
      const bTime = Date.parse(b.dispatch?.assignedAt ?? b.metadata.timestamp);

      return aTime - bTime;
    })[0];
  }
}
