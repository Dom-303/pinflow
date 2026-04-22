/**
 * Unit tests for error types and utilities
 * @module @pinflow/core/errors.spec
 */

import { describe, it, expect } from 'vitest';
import {
  PinFlowError,
  PinFlowErrorCode,
  PinFlowError,
  PinFlowErrorCode,
  type ProblemDetails,
} from './index.js';

describe('Error Types', () => {
  describe('PinFlowError', () => {
    it('should create a base error with all properties', () => {
      const problemDetails: ProblemDetails = {
        code: PinFlowErrorCode.DS_INTERNAL_ERROR,
        title: 'Internal server error',
        detail: 'Something went wrong',
        instance: '/api/v1/test',
        status: 500,
        extensions: { requestId: '123' },
      };

      const error = new PinFlowError(problemDetails);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PinFlowError);
      expect(error.name).toBe('PinFlowError');
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe(PinFlowErrorCode.DS_INTERNAL_ERROR);
      expect(error.detail).toBe('Something went wrong');
      expect(error.instance).toBe('/api/v1/test');
      expect(error.status).toBe(500);
      expect(error.extensions).toEqual({ requestId: '123' });
    });

    it('should convert to ProblemDetails', () => {
      const problemDetails: ProblemDetails = {
        code: PinFlowErrorCode.DS_INTERNAL_ERROR,
        title: 'Internal server error',
        detail: 'Something went wrong',
        instance: '/api/v1/test',
        status: 500,
        extensions: { requestId: '123' },
      };

      const error = new PinFlowError(problemDetails);
      const converted = error.toProblemDetails();

      expect(converted).toEqual(problemDetails);
    });

    it('should convert to JSON', () => {
      const error = new PinFlowError({
        code: PinFlowErrorCode.DS_INTERNAL_ERROR,
        title: 'Error',
        detail: 'Details',
        status: 500,
        extensions: { extra: 'data' },
      });

      const json = error.toJSON();

      expect(json).toEqual({
        code: PinFlowErrorCode.DS_INTERNAL_ERROR,
        title: 'Error',
        detail: 'Details',
        status: 500,
        extra: 'data',
      });
    });

    it('should maintain stack trace', () => {
      const error = new PinFlowError({
        code: PinFlowErrorCode.DS_INTERNAL_ERROR,
        title: 'Error',
      });

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('PinFlowError');
    });
  });

  describe('PinFlow compatibility aliases', () => {
    it('should keep PinFlowError as a compatibility alias', () => {
      expect(PinFlowError).toBe(PinFlowError);
    });

    it('should keep PinFlowErrorCode as a compatibility alias', () => {
      expect(PinFlowErrorCode).toBe(PinFlowErrorCode);
    });
  });
});
