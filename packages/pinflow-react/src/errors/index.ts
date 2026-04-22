/**
 * React adapter-specific error classes
 * @module @pinflow/react/errors
 */

import { PinFlowError, PinFlowErrorCode } from '@pinflow/core';

/**
 * Error thrown when accessing React Fiber fails
 */
export class FiberAccessError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `Fiber access failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'FiberAccessError';
  }
}

/**
 * Error thrown when component resolution fails
 */
export class ComponentResolutionError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `Component resolution failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'ComponentResolutionError';
  }
}

/**
 * Error thrown when component name resolution fails
 */
export class NameResolutionError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `Component name resolution failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'NameResolutionError';
  }
}

/**
 * Error thrown when props extraction fails
 */
export class PropsExtractionError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `Props extraction failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'PropsExtractionError';
  }
}

/**
 * Error thrown when state extraction fails
 */
export class StateExtractionError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `State extraction failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'StateExtractionError';
  }
}
