import { DomscribeError, DomscribeErrorCode } from '@pinflow/core';
import { mcpErrorResult, MCP_TOOLS } from './tool.defs.js';
import { getResultText } from '../__test-utils__/mock-relay-client.js';

describe('tool.defs', () => {
  describe('MCP_TOOLS', () => {
    it('should define PinFlow-first tool names', () => {
      expect(MCP_TOOLS.RESOLVE).toBe('pinflow.resolve');
      expect(MCP_TOOLS.RESOLVE_BATCH).toBe('pinflow.resolve.batch');
      expect(MCP_TOOLS.MANIFEST_STATS).toBe('pinflow.manifest.stats');
      expect(MCP_TOOLS.MANIFEST_QUERY).toBe('pinflow.manifest.query');
      expect(MCP_TOOLS.ANNOTATION_LIST).toBe('pinflow.annotation.list');
      expect(MCP_TOOLS.ANNOTATION_GET).toBe('pinflow.annotation.get');
      expect(MCP_TOOLS.ANNOTATION_UPDATE_STATUS).toBe(
        'pinflow.annotation.updateStatus',
      );
      expect(MCP_TOOLS.ANNOTATION_PROCESS).toBe('pinflow.annotation.process');
      expect(MCP_TOOLS.ANNOTATION_RESPOND).toBe('pinflow.annotation.respond');
      expect(MCP_TOOLS.ANNOTATION_SEARCH).toBe('pinflow.annotation.search');
      expect(MCP_TOOLS.STATUS).toBe('pinflow.status');
    });
  });

  describe('mcpErrorResult', () => {
    it('should convert DomscribeError to structured MCP error', () => {
      // Arrange
      const error = new DomscribeError({
        code: DomscribeErrorCode.DS_VALIDATION_FAILED,
        title: 'Validation failed',
        detail: 'Invalid entry ID',
        status: 400,
      });

      // Act
      const result = mcpErrorResult(error);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(getResultText(result));
      expect(parsed.code).toBe(DomscribeErrorCode.DS_VALIDATION_FAILED);
      expect(parsed.title).toBe('Validation failed');
      expect(parsed.detail).toBe('Invalid entry ID');
      expect(parsed.status).toBe(400);
    });

    it('should convert plain Error to structured MCP error with message as title', () => {
      // Arrange
      const error = new Error('Something broke');

      // Act
      const result = mcpErrorResult(error);

      // Assert
      expect(result.isError).toBe(true);

      const parsed = JSON.parse(getResultText(result));
      expect(parsed.code).toBe(DomscribeErrorCode.DS_INTERNAL_ERROR);
      expect(parsed.title).toBe('Something broke');
    });

    it('should handle non-Error values with fallback title', () => {
      // Act
      const result = mcpErrorResult('string error');

      // Assert
      expect(result.isError).toBe(true);

      const parsed = JSON.parse(getResultText(result));
      expect(parsed.code).toBe(DomscribeErrorCode.DS_INTERNAL_ERROR);
      expect(parsed.title).toBe('Unknown error');
    });
  });
});
