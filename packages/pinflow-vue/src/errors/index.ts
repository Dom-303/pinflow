/**
 * Vue adapter-specific error classes
 * @module @pinflow/vue/errors
 */

import { PinFlowError, PinFlowErrorCode } from '@pinflow/core';

/**
 * Error thrown when VNode access fails
 */
export class VNodeAccessError extends PinFlowError {
  constructor(message: string, cause?: Error) {
    super({
      code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      title: `VNode access failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'VNodeAccessError';
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
