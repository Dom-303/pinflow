import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResolveTool } from './resolve.tool.js';
import {
  createMockRelayClient,
  getResultText,
} from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('ResolveTool', () => {
  describe('toolCallback', () => {
    it('should resolve a manifest entry and return structured output', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        resolveManifestEntry: vi.fn().mockResolvedValue({
          success: true,
          entry: {
            file: 'src/components/Button.tsx',
            start: { line: 10, column: 5 },
            end: { line: 10, column: 30 },
            componentName: 'Button',
            tagName: 'button',
          },
        }),
      });
      const tool = new ResolveTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        entryId: 'ds_abc123',
      });

      // Assert
      expect(mockClient.resolveManifestEntry).toHaveBeenCalledWith('ds_abc123');
      expect(result.structuredContent).toEqual({
        found: true,
        file: 'src/components/Button.tsx',
        start: { line: 10, column: 5 },
        end: { line: 10, column: 30 },
        componentName: 'Button',
        tagName: 'button',
        error: undefined,
      });
      expect(JSON.parse(getResultText(result))).toEqual(
        result.structuredContent,
      );
    });

    it('should handle not-found entries', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        resolveManifestEntry: vi.fn().mockResolvedValue({
          success: false,
          error: 'Entry not found',
        }),
      });
      const tool = new ResolveTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        entryId: 'ds_missing',
      });

      // Assert
      expect(result.structuredContent).toEqual({
        found: false,
        file: undefined,
        start: undefined,
        end: undefined,
        componentName: undefined,
        tagName: undefined,
        error: 'Entry not found',
      });
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        resolveManifestEntry: vi
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
      });
      const tool = new ResolveTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        entryId: 'ds_abc123',
      });

      // Assert
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(getResultText(result));
      expect(parsed.title).toBe('Connection refused');
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new ResolveTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.RESOLVE);
    expect(tool.description).toContain('Resolve');
    expect(tool.description).toContain('PinFlow element ID');
    expect(tool.inputSchema).toBeDefined();
    expect(tool.outputSchema).toBeDefined();
  });
});
