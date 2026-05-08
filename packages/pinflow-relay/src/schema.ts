/**
 * Shared API schemas — contract between server and client.
 *
 * This module is imported by both the browser client (RelayHttpClient)
 * and the server route handlers. Do NOT import anything from server/,
 * services/, or any Node-only dependency here.
 *
 * @module @pinflow/relay/schema
 */
import { z } from 'zod';
import {
  AnnotationContextSchema,
  AnnotationDispatchSchema,
  AnnotationDispatchTargetSchema,
  AnnotationIdSchema,
  AnnotationInteractionSchema,
  AnnotationSchema,
  AnnotationVerificationComparisonSchema,
  AnnotationVerificationDomSnapshotSchema,
  AnnotationVerificationSchema,
  AnnotationVerificationStatusSchema,
  InteractionModeSchema,
  ManifestEntryIdSchema,
  ManifestEntrySchema,
  RuntimeContextSchema,
  SelectedElementSchema,
  RegionSelectionSchema,
  SourcePositionSchema,
  AnnotationStatusSchema,
  AnnotationSummarySchema,
} from '@pinflow/core';

/* =============================
 * Annotation - Create
 * ============================= */
export const AnnotationCreateRequestBodySchema = z
  .object({
    mode: InteractionModeSchema,
    interaction: AnnotationInteractionSchema,
    context: AnnotationContextSchema.omit({ manifestSnapshot: true }),
  })
  .describe('The annotation to create');
export type AnnotationCreateRequestBody = z.infer<
  typeof AnnotationCreateRequestBodySchema
>;

export const AnnotationCreateResponseSchema = AnnotationSchema.describe(
  'The created annotation',
);
export type AnnotationCreateResponse = z.infer<
  typeof AnnotationCreateResponseSchema
>;

/* =============================
 * Annotation - Delete
 * ============================= */
export const AnnotationDeleteRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID to delete'),
});
export type AnnotationDeleteRequestParams = z.infer<
  typeof AnnotationDeleteRequestParamsSchema
>;

/* =============================
 * Annotation - Get
 * ============================= */
export const AnnotationGetRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID to get'),
});
export type AnnotationGetRequestParams = z.infer<
  typeof AnnotationGetRequestParamsSchema
>;

export const AnnotationGetResponseSchema = AnnotationSchema.describe(
  'The annotation to get',
);
export type AnnotationGetResponse = z.infer<typeof AnnotationGetResponseSchema>;

/* =============================
 * Annotation - List
 * ============================= */
export const AnnotationListRequestQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .describe('Comma-separated list of annotation statuses to filter by'),
  limit: z
    .string()
    .optional()
    .describe('Maximum number of annotations to return (default: 50)'),
  offset: z.string().optional().describe('Offset for pagination (default: 0)'),
});
export type AnnotationListRequestQuery = z.infer<
  typeof AnnotationListRequestQuerySchema
>;

export const AnnotationListResponseSchema = z
  .object({
    annotations: z.array(AnnotationSchema),
    total: z.number(),
    hasMore: z.boolean(),
  })
  .describe('List of annotations');
export type AnnotationListResponse = z.infer<
  typeof AnnotationListResponseSchema
>;

/* =============================
 * Annotation - Process
 * ============================= */
export const AnnotationProcessRequestBodySchema = z
  .object({
    dispatchTarget: AnnotationDispatchTargetSchema.optional().describe(
      'Session-local provider/channel that will handle the claimed annotation',
    ),
  })
  .nullish();
export type AnnotationProcessRequestBody = z.infer<
  typeof AnnotationProcessRequestBodySchema
>;

export const AnnotationProcessResponseSchema = z
  .object({
    found: z.boolean().describe('Whether an annotation was found and claimed'),
    annotationId: AnnotationIdSchema.optional().describe('The annotation ID'),
    userIntent: z.string().optional().describe('The user intent'),
    selectionMode: InteractionModeSchema.optional().describe(
      'The picker mode used for the annotation',
    ),
    element: SelectedElementSchema.optional().describe('The selected element'),
    elements: z
      .array(SelectedElementSchema)
      .optional()
      .describe('Multiple selected elements'),
    region: RegionSelectionSchema.optional().describe(
      'Selected viewport region',
    ),
    sourceLocation: z
      .object({
        file: ManifestEntrySchema.shape.file,
        line: SourcePositionSchema.shape.line,
        column: SourcePositionSchema.shape.column,
        componentName: ManifestEntrySchema.shape.componentName,
        tagName: ManifestEntrySchema.shape.tagName,
      })
      .optional()
      .describe('The source location'),
    runtimeContext: RuntimeContextSchema.optional().describe(
      'The runtime context',
    ),
    claim: AnnotationSchema.shape.metadata.shape.claim
      .optional()
      .describe('Claim and lease metadata for this annotation'),
    dispatch: AnnotationDispatchSchema.optional().describe(
      'Provider-neutral handling assignment',
    ),
    fullAnnotation: AnnotationSchema.optional().describe('The full annotation'),
  })
  .describe('The response from the annotation process endpoint');
export type AnnotationProcessResponse = z.infer<
  typeof AnnotationProcessResponseSchema
>;

/* =============================
 * Annotation - Dispatch
 * ============================= */
export const AnnotationDispatchRequestBodySchema = z.object({
  annotationIds: z
    .array(AnnotationIdSchema)
    .min(1)
    .describe('Annotation IDs selected for release into the next run'),
  dispatchTarget: AnnotationDispatchTargetSchema.optional().describe(
    'Session-local provider/channel that will handle the selected annotations',
  ),
});
export type AnnotationDispatchRequestBody = z.infer<
  typeof AnnotationDispatchRequestBodySchema
>;

export const AnnotationDispatchResponseSchema = z.object({
  dispatchedIds: z
    .array(AnnotationIdSchema)
    .describe('Annotation IDs released for agent pickup'),
  skippedIds: z
    .array(AnnotationIdSchema)
    .describe('Annotation IDs that were not queued anymore'),
  annotations: z
    .array(AnnotationSchema)
    .describe('Queued annotations with dispatch metadata'),
});
export type AnnotationDispatchResponse = z.infer<
  typeof AnnotationDispatchResponseSchema
>;

/* =============================
 * Annotation - Search
 * ============================= */
export const AnnotationSearchRequestQuerySchema = z.object({
  entryId: ManifestEntryIdSchema.optional().describe('The manifest entry ID'),
  file: z.string().optional(),
  query: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().optional(),
});
export type AnnotationSearchRequestQuery = z.infer<
  typeof AnnotationSearchRequestQuerySchema
>;

export const AnnotationSearchResponseSchema = z.object({
  annotations: z.array(AnnotationSummarySchema),
  total: z.number(),
});
export type AnnotationSearchResponse = z.infer<
  typeof AnnotationSearchResponseSchema
>;

/* =============================
 * Annotation - Update Response
 * ============================= */
export const AnnotationUpdateResponseRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe(
    'The annotation ID whose response is being updated',
  ),
});
export const AnnotationUpdateResponseRequestBodySchema = z.object({
  message: z
    .string()
    .optional()
    .describe("Agent's explanation of what was done"),
});
export type AnnotationUpdateResponseRequestParams = z.infer<
  typeof AnnotationUpdateResponseRequestParamsSchema
>;
export type AnnotationUpdateResponseRequestBody = z.infer<
  typeof AnnotationUpdateResponseRequestBodySchema
>;

export const AnnotationUpdateResponseResponseSchema = z.object({
  success: z
    .boolean()
    .describe('Whether the response was updated successfully'),
  annotation: AnnotationSchema.describe('The updated annotation'),
});

export type AnnotationUpdateResponseResponse = z.infer<
  typeof AnnotationUpdateResponseResponseSchema
>;

/* =============================
 * Annotation - Run Evidence
 * ============================= */
export const AnnotationRunEvidenceRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe(
    'The annotation ID whose latest run evidence should be returned',
  ),
});
export type AnnotationRunEvidenceRequestParams = z.infer<
  typeof AnnotationRunEvidenceRequestParamsSchema
>;

export const AnnotationRunEvidenceChangedFileSchema = z.object({
  path: z.string(),
});
export type AnnotationRunEvidenceChangedFile = z.infer<
  typeof AnnotationRunEvidenceChangedFileSchema
>;

export const AnnotationRunEvidenceSchema = z.object({
  annotationId: AnnotationIdSchema,
  runId: z.string(),
  runDir: z.string(),
  status: z.enum(['claimed', 'processing', 'processed', 'failed']),
  provider: z.string(),
  label: z.string(),
  model: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  durationMs: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Wallclock duration of the run in milliseconds (finishedAt - startedAt)',
    ),
  totalTokens: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Total tokens consumed by the agent (input + output combined; some agents only expose this aggregate)',
    ),
  costUsd: z
    .number()
    .min(0)
    .optional()
    .describe(
      'Estimated cost in USD based on a blended per-model rate; treat as approximate',
    ),
  exitCode: z.number().nullable().optional(),
  errorDetails: z.string().optional(),
  promptPath: z.string(),
  contextPath: z.string().optional(),
  transcriptPath: z.string(),
  diffPath: z.string(),
  hasDiff: z.boolean(),
  changedFiles: z.array(AnnotationRunEvidenceChangedFileSchema),
  additions: z.number().int().min(0),
  deletions: z.number().int().min(0),
});
export type AnnotationRunEvidence = z.infer<typeof AnnotationRunEvidenceSchema>;

export const AnnotationRunEvidenceResponseSchema = z.object({
  found: z.boolean(),
  annotationId: AnnotationIdSchema,
  evidence: AnnotationRunEvidenceSchema.optional(),
});
export type AnnotationRunEvidenceResponse = z.infer<
  typeof AnnotationRunEvidenceResponseSchema
>;

/* =============================
 * Annotation - Verify
 * ============================= */
export const AnnotationVerifyRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID to verify'),
});
export type AnnotationVerifyRequestParams = z.infer<
  typeof AnnotationVerifyRequestParamsSchema
>;

export const AnnotationVerifyResponseSchema =
  AnnotationVerificationSchema.extend({
    annotationId: AnnotationIdSchema,
    sourceLocation: AnnotationVerificationSchema.shape.sourceLocation,
    runtime: z
      .object({
        rendered: z.boolean(),
        elementFound: z.boolean().optional(),
        contextCaptured: z.boolean().optional(),
        domSnapshot: AnnotationVerificationDomSnapshotSchema.optional(),
      })
      .optional(),
    comparison: AnnotationVerificationComparisonSchema.optional(),
    status: AnnotationVerificationStatusSchema,
    annotation: AnnotationSchema.optional(),
  });
export type AnnotationVerifyResponse = z.infer<
  typeof AnnotationVerifyResponseSchema
>;

/* =============================
 * Annotation - Update Status
 * ============================= */
export const AnnotationUpdateStatusRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe(
    'The annotation ID whose status is being updated',
  ),
});
export const AnnotationUpdateStatusRequestBodySchema = z.object({
  status: AnnotationStatusSchema.describe('The new status for the annotation'),
  errorDetails: z.string().optional(),
});
export type AnnotationUpdateStatusRequestParams = z.infer<
  typeof AnnotationUpdateStatusRequestParamsSchema
>;
export type AnnotationUpdateStatusRequestBody = z.infer<
  typeof AnnotationUpdateStatusRequestBodySchema
>;

export const AnnotationUpdateStatusResponseSchema = z.object({
  annotation: AnnotationSchema.describe('The annotation that was updated'),
});
export type AnnotationUpdateStatusResponse = z.infer<
  typeof AnnotationUpdateStatusResponseSchema
>;

/* =============================
 * Annotation - Patch (partial update)
 * ============================= */
export const AnnotationPatchRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID to patch'),
});
export type AnnotationPatchRequestParams = z.infer<
  typeof AnnotationPatchRequestParamsSchema
>;

export const AnnotationPatchRequestBodySchema = z.object({
  context: AnnotationContextSchema.partial()
    .optional()
    .describe(
      'Partial context fields to merge (e.g. userMessage, manifestSnapshot, runtimeContext)',
    ),
});
export type AnnotationPatchRequestBody = z.infer<
  typeof AnnotationPatchRequestBodySchema
>;

export const AnnotationPatchResponseSchema = z.object({
  annotation: AnnotationSchema.describe('The updated annotation'),
});
export type AnnotationPatchResponse = z.infer<
  typeof AnnotationPatchResponseSchema
>;

/* =============================
 * Manifest - Batch Resolve
 * ============================= */
export const ManifestBatchResolveRequestBodySchema = z.object({
  entryIds: z.array(ManifestEntryIdSchema).describe('The entry IDs to resolve'),
});
export type ManifestBatchResolveRequestBody = z.infer<
  typeof ManifestBatchResolveRequestBodySchema
>;

export const ManifestBatchResolveResponseSchema = z.object({
  results: z.record(
    ManifestEntryIdSchema,
    z.object({
      success: z.boolean(),
      entry: ManifestEntrySchema.optional(),
      resolveTimeMs: z.number(),
      cacheHit: z.boolean(),
      error: z.string().optional(),
    }),
  ),
  resolveTimeMs: z.number(),
  count: z.number(),
});
export type ManifestBatchResolveResponse = z.infer<
  typeof ManifestBatchResolveResponseSchema
>;

/* =============================
 * Manifest - Query
 * ============================= */
export const ManifestQueryRequestQuerySchema = z.object({
  file: z.string().optional(),
  componentName: z.string().optional(),
  tagName: z.string().optional(),
  limit: z.string().optional(),
});
export type ManifestQueryRequestQuery = z.infer<
  typeof ManifestQueryRequestQuerySchema
>;

export const ManifestQueryResponseSchema = z.object({
  entries: z.array(ManifestEntrySchema),
  total: z.number(),
  hasMore: z.boolean(),
});
export type ManifestQueryResponse = z.infer<typeof ManifestQueryResponseSchema>;

/* =============================
 * Manifest - Resolve
 * ============================= */
export const ManifestResolveRequestQuerySchema = z.object({
  id: ManifestEntryIdSchema.describe('The entry ID to resolve'),
});
export type ManifestResolveRequestQuery = z.infer<
  typeof ManifestResolveRequestQuerySchema
>;

export const ManifestResolveResponseSchema = z.object({
  success: z.boolean(),
  entry: ManifestEntrySchema.optional(),
  resolveTimeMs: z.number(),
  cacheHit: z.boolean(),
  error: z.string().optional(),
});
export type ManifestResolveResponse = z.infer<
  typeof ManifestResolveResponseSchema
>;

/* =============================
 * Manifest - Stats
 * ============================= */
export const ManifestStatsResponseSchema = z.object({
  entryCount: z.number(),
  fileCount: z.number(),
  componentCount: z.number(),
  lastUpdated: z.string().nullable(),
  cacheHitRate: z.number(),
});
export type ManifestStatsResponse = z.infer<typeof ManifestStatsResponseSchema>;

/* =============================
 * Health
 * ============================= */
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']).describe('The health status'),
  pid: z.number().describe('The PID of the relay'),
  nonce: z.string().describe('The nonce of the relay'),
  version: z.string().describe('The version of the relay'),
  workspaceRoot: z.string().describe('The workspace root of the relay'),
  timestamp: z.string().describe('The timestamp of the health check'),
  services: z.object({
    annotations: z.object({
      counts: z.record(AnnotationStatusSchema, z.number()),
    }),
    manifest: z.object({
      entryCount: z.number(),
      fileCount: z.number(),
      componentCount: z.number(),
      lastUpdated: z.string().nullable(),
      cacheHitRate: z.number(),
    }),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/* =============================
 * Shutdown
 * ============================= */
export const ShutdownRequestBodySchema = z.object({
  nonce: z.string().describe('The nonce of the relay'),
});
export type ShutdownRequestBody = z.infer<typeof ShutdownRequestBodySchema>;

export const ShutdownResponseSchema = z.object({
  success: z.boolean().describe('Whether the shutdown was successful'),
});
export type ShutdownResponse = z.infer<typeof ShutdownResponseSchema>;

/* =============================
 * Runner
 * ============================= */
export const RunnerStatusSchema = z.enum(['idle', 'processing', 'stopping']);
export type RunnerStatus = z.infer<typeof RunnerStatusSchema>;
export const RunnerSurfaceSchema = z.enum([
  'terminal',
  'background',
  'external',
]);
export type RunnerSurface = z.infer<typeof RunnerSurfaceSchema>;

export const RunnerSessionSchema = z.object({
  runnerId: z.string().min(1),
  provider: z.string().min(1),
  label: z.string().min(1),
  status: RunnerStatusSchema,
  surface: RunnerSurfaceSchema.optional(),
  currentAnnotationId: AnnotationIdSchema.optional(),
  currentRunId: z.string().min(1).optional(),
  currentRunDir: z.string().min(1).optional(),
  pid: z.number().int().positive().optional(),
  lastSeenAt: z.string(),
});
export type RunnerSession = z.infer<typeof RunnerSessionSchema>;

export const RunnerHeartbeatRequestBodySchema = z.object({
  runnerId: RunnerSessionSchema.shape.runnerId,
  provider: RunnerSessionSchema.shape.provider,
  label: RunnerSessionSchema.shape.label,
  status: RunnerStatusSchema,
  surface: RunnerSessionSchema.shape.surface,
  currentAnnotationId: AnnotationIdSchema.optional(),
  currentRunId: RunnerSessionSchema.shape.currentRunId,
  currentRunDir: RunnerSessionSchema.shape.currentRunDir,
  pid: RunnerSessionSchema.shape.pid,
});
export type RunnerHeartbeatRequestBody = z.infer<
  typeof RunnerHeartbeatRequestBodySchema
>;

export const RunnerHeartbeatResponseSchema = z.object({
  ok: z.boolean(),
  runner: RunnerSessionSchema,
});
export type RunnerHeartbeatResponse = z.infer<
  typeof RunnerHeartbeatResponseSchema
>;

export const RunnerSnapshotSchema = z.object({
  connected: z.boolean(),
  activeCount: z.number().int().min(0),
  sessions: z.array(RunnerSessionSchema),
});
export type RunnerSnapshot = z.infer<typeof RunnerSnapshotSchema>;

/* =============================
 * Status
 * ============================= */
export const StatusResponseSchema = z.object({
  relay: z.object({
    version: z.string(),
    uptime: z.number(),
    port: z.number(),
  }),
  manifest: z.object({
    entryCount: z.number(),
    fileCount: z.number(),
    componentCount: z.number(),
    lastUpdated: z.string().nullable(),
    cacheHitRate: z.number(),
  }),
  annotations: z.record(AnnotationStatusSchema, z.number()),
  browser: z
    .object({
      connected: z.boolean(),
      clientCount: z.number(),
      sessions: z.array(z.lazy(() => BrowserSessionSchema)).optional(),
    })
    .optional(),
  runner: RunnerSnapshotSchema.optional(),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;

/* =============================
 * WS - Context Request/Response
 * ============================= */
export const WSContextRequestSchema = z.object({
  requestId: z.string(),
  entryId: ManifestEntryIdSchema,
});
export type WSContextRequest = z.infer<typeof WSContextRequestSchema>;

export const WSContextResponseSchema = z.object({
  requestId: z.string(),
  success: z.boolean(),
  rendered: z.boolean().optional(),
  elementFound: z.boolean().optional(),
  contextCaptured: z.boolean().optional(),
  context: RuntimeContextSchema.optional(),
  elementInfo: z
    .object({
      tagName: z.string().optional(),
      attributes: z.record(z.string(), z.string()).optional(),
      innerText: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});
export type WSContextResponse = z.infer<typeof WSContextResponseSchema>;

export const BrowserSessionSchema = z.object({
  sessionId: z.string(),
  pageUrl: z.string().optional(),
  route: z.string().optional(),
  pageTitle: z.string().optional(),
  connectedAt: z.string().optional(),
  lastSeenAt: z.string().optional(),
});
export type BrowserSession = z.infer<typeof BrowserSessionSchema>;

export const BrowserSessionUpdateSchema = BrowserSessionSchema.partial().extend(
  {
    sessionId: z.string(),
  },
);
export type BrowserSessionUpdate = z.infer<typeof BrowserSessionUpdateSchema>;

/* =============================
 * Query By Source
 * ============================= */
export const QueryBySourceRequestSchema = z.object({
  file: z.string().describe('Absolute file path as stored in the manifest'),
  line: z.number().int().positive().describe('Line number (1-indexed)'),
  column: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Column number (0-indexed)'),
  tolerance: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .default(0)
    .describe('Maximum line distance to consider'),
  includeRuntime: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to query live runtime context from the browser'),
  sessionId: z
    .string()
    .optional()
    .describe('Browser session ID to target for runtime context'),
});
export type QueryBySourceRequest = z.infer<typeof QueryBySourceRequestSchema>;

export const QueryBySourceReasonSchema = z.enum([
  'manifest_entry_not_found',
  'manifest_stale',
  'browser_not_connected',
  'runtime_not_requested',
  'runtime_timeout',
  'element_not_rendered',
  'capture_failed',
  'ambiguous_source_match',
  'ambiguous_source_path',
  'manifest_empty',
  'file_not_in_manifest',
  'source_line_not_found',
  'multiple_browser_sessions',
  'browser_session_not_found',
]);

export const QueryBySourceMatchSchema = z.object({
  confidence: z.enum(['high', 'medium', 'low']),
  strategy: z.enum([
    'exact_line_and_column',
    'exact_line',
    'nearest_column_same_line',
    'nearest_within_tolerance',
  ]),
  lineDistance: z.number(),
  columnDistance: z.number().nullable(),
});

export const QueryBySourceCandidateSchema = QueryBySourceMatchSchema.extend({
  entryId: z.string(),
  sourceLocation: z.object({
    file: z.string(),
    start: SourcePositionSchema,
    end: SourcePositionSchema.optional(),
    tagName: z.string().optional(),
    componentName: z.string().optional(),
  }),
});

export const QueryBySourceResponseSchema = z.object({
  found: z.boolean().describe('Whether a manifest entry was found'),
  entryId: z.string().optional().describe('The matching manifest entry ID'),
  sourceLocation: z
    .object({
      file: z.string(),
      start: SourcePositionSchema,
      end: SourcePositionSchema.optional(),
      tagName: z.string().optional(),
      componentName: z.string().optional(),
    })
    .optional()
    .describe('Source location from the manifest'),
  runtime: z
    .object({
      rendered: z.boolean(),
      elementFound: z.boolean().optional(),
      contextCaptured: z.boolean().optional(),
      componentProps: z.unknown().optional(),
      componentState: z.unknown().optional(),
      domSnapshot: z
        .object({
          tagName: z.string().optional(),
          attributes: z.record(z.string(), z.string()).optional(),
          innerText: z.string().optional(),
        })
        .optional(),
    })
    .optional()
    .describe('Live runtime context from the browser'),
  browserConnected: z
    .boolean()
    .optional()
    .describe('Whether a browser client is connected via WebSocket'),
  browser: z
    .object({
      connected: z.boolean(),
      clientCount: z.number(),
      sessions: z.array(BrowserSessionSchema).optional(),
      selectedSessionId: z.string().optional(),
    })
    .optional()
    .describe('Browser connection details for runtime context capture'),
  manifest: z
    .object({
      entryCount: z.number(),
      fileCount: z.number(),
      componentCount: z.number(),
      lastUpdated: z.string().nullable(),
      freshness: z
        .object({
          status: z.enum(['fresh', 'stale', 'unknown']),
          stale: z.boolean(),
          reason: z.enum([
            'source_newer_than_manifest',
            'source_not_found',
            'manifest_not_found',
            'source_not_on_disk',
            'manifest_fresh',
          ]),
          sourceFile: z.string(),
          sourceMtimeMs: z.number().optional(),
          manifestMtimeMs: z.number().optional(),
          checkedAt: z.string(),
          repairHint: z.string().optional(),
        })
        .optional(),
    })
    .optional()
    .describe('Manifest metadata at query time'),
  match: QueryBySourceMatchSchema.optional().describe(
    'Confidence and strategy for the selected best match',
  ),
  candidates: z
    .array(QueryBySourceCandidateSchema)
    .optional()
    .describe('Source match candidates sorted by closeness'),
  pathCandidates: z
    .array(z.string())
    .optional()
    .describe('Manifest file paths matching an ambiguous source path'),
  reasons: z
    .array(QueryBySourceReasonSchema)
    .optional()
    .describe('Machine-readable reasons explaining uncertainty or failure'),
  error: z.string().optional().describe('Error message if something failed'),
});
export type QueryBySourceResponse = z.infer<typeof QueryBySourceResponseSchema>;

/* =============================
 * WS - Events
 * ============================= */
export const WSMessageSchema = z.object({
  event: z.string(),
  data: z.unknown(),
});

export type WSMessage = z.infer<typeof WSMessageSchema>;
