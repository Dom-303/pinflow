/**
 * Constants and configuration values for PinFlow.
 * @module @pinflow/core/constants
 */

/**
 * Base API paths
 */
export const API_PATHS = {
  // Base path for all API endpoints
  BASE: `/api/:version`,

  // Annotation endpoints
  ANNOTATIONS: `/annotations`,
  ANNOTATION_BY_ID: `/annotations/:id`,
  ANNOTATION_STATUS: `/annotations/:id/status`,
  ANNOTATION_RESPONSE: `/annotations/:id/response`,
  ANNOTATION_PROCESS: `/annotations/process`,
  ANNOTATION_SEARCH: `/annotations/search`,

  // Manifest endpoints
  MANIFEST: `/manifest`,
  MANIFEST_STATS: `/manifest/stats`,
  MANIFEST_QUERY: `/manifest/query`,
  MANIFEST_RESOLVE: '/manifest/resolve',
  MANIFEST_RESOLVE_BATCH: '/manifest/resolve/batch',
  MANIFEST_RESOLVE_BY_SOURCE: '/manifest/resolve-by-source',

  // System endpoints
  STATUS: `/status`,
  HEALTH: `/health`,
  SHUTDOWN: `/shutdown`,

  // WebSocket endpoint
  WS: `/ws`,
} as const;

/**
 * WebSocket event types
 */
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',

  // Annotation events
  ANNOTATION_CREATED: 'annotation:created',
  ANNOTATION_UPDATED: 'annotation:updated',

  // Manifest events
  MANIFEST_UPDATED: 'manifest:updated',

  // Context request/response events (relay↔browser bidirectional)
  CONTEXT_REQUEST: 'context:request',
  CONTEXT_RESPONSE: 'context:response',
} as const;

/**
 * Regular expressions for validation and parsing
 */
export const PATTERNS = {
  // Manifest entry ID pattern (8 alphanumeric characters)
  MANIFEST_ENTRY_ID: /^[0-9A-HJ-NP-Za-hj-np-z]{8}$/,

  // Annotation ID pattern (ann_<nanoid>_<timestamp>)
  ANNOTATION_ID: /^ann_[0-9A-HJ-NP-Za-hj-np-z]{8}_\d+$/,

  // Namespaced entry ID pattern (frameId:entryId)
  NAMESPACED_ID: /^[^:]+:[0-9A-HJ-NP-Za-hj-np-z]{8}$/,
} as const;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  // Relay configuration
  RELAY_HOST: '127.0.0.1',
  /** Port to listen on (default: 0 for dynamic port assignment) */
  RELAY_PORT: 0,
  /** Maximum request body size in bytes (10 MB) */
  RELAY_BODY_LIMIT: 10 * 1024 * 1024,
  /** Timeout for health check requests in milliseconds */
  RELAY_HEALTH_TIMEOUT_MS: 500,
  /** Maximum time to wait for relay health check in milliseconds */
  RELAY_HEALTH_WAIT_MS: 5000,
  /** Timeout for shutdown requests in milliseconds */
  RELAY_SHUTDOWN_TIMEOUT_MS: 500,
  /** Maximum time to wait for relay shutdown in milliseconds */
  RELAY_SHUTDOWN_WAIT_MS: 5000,
  /** Lock file name (stored in the product artifact directory) */
  RELAY_LOCK_FILE: 'relay.lock',
} as const;

/**
 * File and directory paths
 */
export const PATHS = {
  // Root directory for PinFlow data
  DOMSCRIBE_DIR: '.pinflow',
  LEGACY_DOMSCRIBE_DIR: '.domscribe',

  // Subdirectories
  ANNOTATIONS_DIR: '.pinflow/annotations',
  ANNOTATIONS_QUEUED: '.pinflow/annotations/queued',
  ANNOTATIONS_PROCESSING: '.pinflow/annotations/processing',
  ANNOTATIONS_PROCESSED: '.pinflow/annotations/processed',
  ANNOTATIONS_FAILED: '.pinflow/annotations/failed',
  ANNOTATIONS_ARCHIVED: '.pinflow/annotations/archived',
  LEGACY_ANNOTATIONS_DIR: '.domscribe/annotations',
  LEGACY_ANNOTATIONS_QUEUED: '.domscribe/annotations/queued',
  LEGACY_ANNOTATIONS_PROCESSING: '.domscribe/annotations/processing',
  LEGACY_ANNOTATIONS_PROCESSED: '.domscribe/annotations/processed',
  LEGACY_ANNOTATIONS_FAILED: '.domscribe/annotations/failed',
  LEGACY_ANNOTATIONS_ARCHIVED: '.domscribe/annotations/archived',

  // Manifest files
  MANIFEST_FILE: '.pinflow/manifest.jsonl',
  MANIFEST_INDEX: '.pinflow/manifest.index.json',
  MANIFEST_SNAPSHOTS: '.pinflow/manifest.snapshots',
  LEGACY_MANIFEST_FILE: '.domscribe/manifest.jsonl',
  LEGACY_MANIFEST_INDEX: '.domscribe/manifest.index.json',
  LEGACY_MANIFEST_SNAPSHOTS: '.domscribe/manifest.snapshots',

  // Cache directories
  TRANSFORM_CACHE: '.pinflow/transform-cache',
  SESSIONS: '.pinflow/sessions',
  AGENT_INSTRUCTIONS: '.pinflow/agent-instructions',
  LEGACY_TRANSFORM_CACHE: '.domscribe/transform-cache',
  LEGACY_SESSIONS: '.domscribe/sessions',
  LEGACY_AGENT_INSTRUCTIONS: '.domscribe/agent-instructions',

  // Config files
  CONFIG_JSON_FILE: 'pinflow.config.json',
  CONFIG_FILE: 'pinflow.config.ts',
  CONFIG_JS_FILE: 'pinflow.config.js',
  LEGACY_CONFIG_JSON_FILE: 'domscribe.config.json',
  LEGACY_CONFIG_FILE: 'domscribe.config.ts',
  LEGACY_CONFIG_JS_FILE: 'domscribe.config.js',
  VALIDATION_RECIPE: 'pinflow.validation.yaml',
} as const;

/**
 * HTTP status codes used in the system
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
