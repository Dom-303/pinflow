/**
 * Canonical Annotation data model for PinFlow.
 * Represents a structured record of a user interaction with captured context.
 * @module @pinflow/core/types/annotation
 */
import { ManifestEntryIdSchema, ManifestEntrySchema } from './manifest.js';
import { z } from 'zod';
import { PATTERNS } from '../constants/index.js';

export enum AnnotationStatusEnum {
  QUEUED = 'queued',
  CLAIMED = 'claimed',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export const AnnotationStatusSchema = z.enum([
  AnnotationStatusEnum.QUEUED,
  AnnotationStatusEnum.CLAIMED,
  AnnotationStatusEnum.PROCESSING,
  AnnotationStatusEnum.PROCESSED,
  AnnotationStatusEnum.FAILED,
  AnnotationStatusEnum.ARCHIVED,
]);

export enum InteractionModeEnum {
  ELEMENT_CLICK = 'element-click',
  REGION_SELECT = 'region-select',
  MULTI_ELEMENT = 'multi-element',
  TEXT_SELECTION = 'text-selection',
}

export const InteractionModeSchema = z.enum([
  InteractionModeEnum.ELEMENT_CLICK,
  InteractionModeEnum.REGION_SELECT,
  InteractionModeEnum.MULTI_ELEMENT,
  InteractionModeEnum.TEXT_SELECTION,
]);

export enum InteractionTypeEnum {
  ELEMENT_ANNOTATION = 'element-annotation',
  REGION_ANNOTATION = 'region-annotation',
  MULTI_ELEMENT_ANNOTATION = 'multi-element-annotation',
  TEXT_SELECTION = 'text-selection',
}

export const InteractionTypeSchema = z.enum([
  InteractionTypeEnum.ELEMENT_ANNOTATION,
  InteractionTypeEnum.REGION_ANNOTATION,
  InteractionTypeEnum.MULTI_ELEMENT_ANNOTATION,
  InteractionTypeEnum.TEXT_SELECTION,
]);

export const ViewportSchema = z.object({
  width: z.number().describe('Width of the viewport'),
  height: z.number().describe('Height of the viewport'),
});

export const EnvironmentSchema = z.object({
  nodeVersion: z.string().optional().describe('Node.js version'),
  frameworkVersion: z.string().optional().describe('Framework version'),
  packageManager: z.string().optional().describe('Package manager used'),
});

export const RuntimeContextSchema = z.object({
  componentProps: z.unknown().optional().describe('Component props snapshot'),
  componentState: z.unknown().optional().describe('Component state snapshot'),
  eventFlow: z.unknown().optional().describe('Event flow breadcrumbs'),
  performance: z.unknown().optional().describe('Performance metrics'),
});

export const AnnotationIdSchema = z
  .string()
  .regex(PATTERNS.ANNOTATION_ID)
  .describe('Unique identifier: ann_<nanoid>_<timestamp>');

/**
 * Current annotation schema version. Bump when the Annotation shape changes.
 */
export const ANNOTATION_SCHEMA_VERSION = 1;

export const AnnotationMetadataSchema = z.object({
  id: AnnotationIdSchema,
  timestamp: z.string().describe('ISO 8601 timestamp'),
  mode: InteractionModeSchema.describe('Mode of interaction'),
  status: AnnotationStatusSchema.describe('Current status in the lifecycle'),
  schemaVersion: z
    .number()
    .int()
    .default(ANNOTATION_SCHEMA_VERSION)
    .describe('Schema version for forward migration'),
  errorDetails: z
    .string()
    .optional()
    .describe('Details about any errors that occurred'),
  retryCount: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Number of times this annotation was returned to the queue'),
  claim: z
    .object({
      claimedBy: z.string().describe('Agent or process that owns the lease'),
      claimedAt: z.string().describe('ISO 8601 claim timestamp'),
      leaseExpiresAt: z.string().describe('ISO 8601 lease expiration time'),
      token: z.string().describe('Opaque claim token for diagnostics'),
    })
    .optional()
    .describe('Current claim and lease metadata'),
});

export const SelectedElementSchema = z.object({
  tagName: z.string().describe('HTML tag name'),
  selector: z.string().describe('CSS selector path to the element'),
  dataDs: z.string().optional().describe('PinFlow element ID if transformed'),
  attributes: z
    .record(z.string(), z.string())
    .optional()
    .describe('Element attributes'),
  innerText: z
    .string()
    .optional()
    .describe('First 100 characters of inner text'),
  computedStyles: z
    .record(z.string(), z.string())
    .optional()
    .describe('Computed styles for the element'),
});

export const BoundingRectSchema = z.object({
  x: z.number().describe('X coordinate of the top-left corner'),
  y: z.number().describe('Y coordinate of the top-left corner'),
  width: z.number().describe('Width of the rectangle'),
  height: z.number().describe('Height of the rectangle'),
  top: z.number().describe('Y coordinate of the top edge'),
  right: z.number().describe('X coordinate of the right edge'),
  bottom: z.number().describe('Y coordinate of the bottom edge'),
  left: z.number().describe('X coordinate of the left edge'),
});

export const RegionSelectionSchema = z.object({
  boundingRect: BoundingRectSchema.describe('Selected viewport region'),
  devicePixelRatio: z
    .number()
    .optional()
    .describe('Device pixel ratio at capture time'),
  elementCount: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Number of matching elements inside the region'),
});

export const AnnotationInteractionSchema = z.object({
  type: InteractionTypeSchema.describe('Type of interaction'),
  selectedText: z
    .string()
    .optional()
    .describe('Selected text content if applicable'),
  selectedElement: SelectedElementSchema.optional().describe(
    'Selected element details if applicable',
  ),
  selectedElements: z
    .array(SelectedElementSchema)
    .optional()
    .describe('Multiple selected elements if applicable'),
  region: RegionSelectionSchema.optional().describe(
    'Selected viewport region if applicable',
  ),
  boundingRect: BoundingRectSchema.optional().describe(
    'Bounding rectangle of the selection',
  ),
});

export const AnnotationContextSchema = z.object({
  pageUrl: z.string().describe('URL of the page'),
  pageTitle: z.string().describe('Title of the page'),
  viewport: ViewportSchema.describe('Viewport dimensions'),
  userAgent: z.string().describe('User agent string'),
  domSnapshot: z
    .string()
    .optional()
    .describe('DOM snapshot at time of interaction'),
  manifestSnapshot: z
    .array(ManifestEntrySchema)
    .optional()
    .describe('Manifest snapshot at time of interaction'),
  userMessage: z.string().optional().describe("User's message/intent"),
  environment: EnvironmentSchema.optional().describe(
    'Development environment info',
  ),
  runtimeContext: RuntimeContextSchema.optional().describe(
    'Runtime context (Phase 1 & 2 features)',
  ),
});

export const AgentResponseSchema = z.object({
  message: z.string().optional().describe('Message from the agent'),
});

export const AnnotationDispatchProviderSchema = z.enum([
  'codex',
  'claude',
  'manual',
  'other',
]);

export const AnnotationDispatchTargetSchema = z.object({
  provider: AnnotationDispatchProviderSchema.describe(
    'Provider-neutral channel handling this annotation',
  ),
  label: z.string().optional().describe('Human-readable channel label'),
  sessionId: z
    .string()
    .optional()
    .describe('Session-local channel ID, without mutating project defaults'),
});

export const AnnotationDispatchSchema = z.object({
  target: AnnotationDispatchTargetSchema,
  assignedAt: z.string().describe('ISO 8601 dispatch assignment timestamp'),
});

export const AnnotationVerificationStatusSchema = z.enum([
  'verified',
  'uncertain',
  'unable',
]);

export const AnnotationVerificationDomSnapshotSchema = z.object({
  tagName: z.string().optional(),
  innerText: z.string().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
});

export const AnnotationVerificationFieldComparisonSchema = z.object({
  before: z.string().optional(),
  after: z.string().optional(),
  changed: z.boolean(),
});

export const AnnotationVerificationAttributeComparisonSchema = z.object({
  before: z.record(z.string(), z.string()).optional(),
  after: z.record(z.string(), z.string()).optional(),
  changed: z.boolean(),
  changedKeys: z.array(z.string()),
});

export const AnnotationVerificationComparisonSchema = z.object({
  tagName: AnnotationVerificationFieldComparisonSchema,
  innerText: AnnotationVerificationFieldComparisonSchema,
  attributes: AnnotationVerificationAttributeComparisonSchema,
});

export const AnnotationVerificationSchema = z.object({
  status: AnnotationVerificationStatusSchema,
  checkedAt: z.string().describe('ISO 8601 verification timestamp'),
  reasons: z
    .array(z.string())
    .describe('Machine-readable verification reasons'),
  sourceLocation: z
    .object({
      file: z.string(),
      start: ManifestEntrySchema.shape.start,
      end: ManifestEntrySchema.shape.end,
      tagName: z.string().optional(),
      componentName: z.string().optional(),
    })
    .optional(),
  before: AnnotationVerificationDomSnapshotSchema.optional(),
  after: AnnotationVerificationDomSnapshotSchema.optional(),
  comparison: AnnotationVerificationComparisonSchema.optional(),
});

export const AnnotationSchema = z.object({
  metadata: AnnotationMetadataSchema.describe('Annotation metadata'),
  interaction: AnnotationInteractionSchema.describe('User interaction details'),
  context: AnnotationContextSchema.describe('Context at time of interaction'),
  agentResponse: AgentResponseSchema.optional().describe(
    "Agent's response if processed",
  ),
  dispatch: AnnotationDispatchSchema.optional().describe(
    'Provider-neutral agent or manual handling assignment',
  ),
  verification: AnnotationVerificationSchema.optional().describe(
    'Latest verification result for this annotation',
  ),
});

export const AnnotationSummarySchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID'),
  status: AnnotationStatusSchema.describe('The status of the annotation'),
  timestamp: z.string().describe('ISO 8601 timestamp of the annotation'),
  entryId: ManifestEntryIdSchema.optional().describe(
    'Associated manifest entry ID',
  ),
  componentName: z.string().optional().describe('The component name'),
  userMessageExcerpt: z
    .string()
    .optional()
    .describe('The user message excerpt'),
});

export type Annotation = z.infer<typeof AnnotationSchema>;
export type AnnotationSummary = z.infer<typeof AnnotationSummarySchema>;
export type AnnotationId = z.infer<typeof AnnotationIdSchema>;
export type AnnotationStatus = z.infer<typeof AnnotationStatusSchema>;
export type AnnotationInteraction = z.infer<typeof AnnotationInteractionSchema>;
export type AnnotationContext = z.infer<typeof AnnotationContextSchema>;
export type AnnotationMetadata = z.infer<typeof AnnotationMetadataSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AnnotationDispatch = z.infer<typeof AnnotationDispatchSchema>;
export type AnnotationDispatchTarget = z.infer<
  typeof AnnotationDispatchTargetSchema
>;
export type AnnotationVerification = z.infer<
  typeof AnnotationVerificationSchema
>;

export type InteractionMode = z.infer<typeof InteractionModeSchema>;
export type InteractionType = z.infer<typeof InteractionTypeSchema>;
export type SelectedElement = z.infer<typeof SelectedElementSchema>;
export type BoundingRect = z.infer<typeof BoundingRectSchema>;
export type RegionSelection = z.infer<typeof RegionSelectionSchema>;

export type Viewport = z.infer<typeof ViewportSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type RuntimeContext = z.infer<typeof RuntimeContextSchema>;
