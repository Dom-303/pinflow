/**
 * Runtime-specific error classes
 * @module @pinflow/runtime/errors
 */

import { PinFlowError, PinFlowErrorCode } from '@pinflow/core';

/**
 * Base error for runtime-related issues
 */
export class RuntimeError extends PinFlowError {
  constructor(message: string, _cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: message,
      detail: _cause?.message,
      status: 500,
    });
    this.name = 'RuntimeError';
  }
}

/**
 * Error thrown when runtime manager is not initialized
 */
export class RuntimeNotInitializedError extends PinFlowError {
  constructor() {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: 'RuntimeManager not initialized',
      detail: 'Call initialize() before using RuntimeManager methods.',
      status: 500,
    });
    this.name = 'RuntimeNotInitializedError';
  }
}

/**
 * Error thrown when context capture fails
 */
export class ContextCaptureError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `Context capture failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'ContextCaptureError';
  }
}

/**
 * Error thrown when element tracking fails
 */
export class ElementTrackingError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `Element tracking failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'ElementTrackingError';
  }
}

/**
 * Error thrown when serialization fails
 */
export class SerializationError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `Serialization failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'SerializationError';
  }
}
