import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { QueryBySourceTool } from './query-by-source.tool.js';
import {
  createMockRelayClient,
  getResultText,
} from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('QueryBySourceTool', () => {
  describe('toolCallback', () => {
    it('should return manifest and runtime data for a found entry', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({
          found: true,
          entryId: 'aB3dEf7h',
          sourceLocation: {
            file: 'src/components/Button.tsx',
            start: { line: 10, column: 4 },
            end: { line: 10, column: 30 },
            tagName: 'button',
            componentName: 'Button',
          },
          runtime: {
            rendered: true,
            componentProps: { label: 'Submit' },
            componentState: null,
            domSnapshot: {
              tagName: 'button',
              attributes: { class: 'btn' },
              innerText: 'Submit',
            },
          },
          browserConnected: true,
          match: {
            confidence: 'high',
            strategy: 'exact_line_and_column',
            lineDistance: 0,
            columnDistance: 0,
          },
          candidates: [
            {
              entryId: 'aB3dEf7h',
              confidence: 'high',
              strategy: 'exact_line_and_column',
              lineDistance: 0,
              columnDistance: 0,
              sourceLocation: {
                file: 'src/components/Button.tsx',
                start: { line: 10, column: 4 },
                end: { line: 10, column: 30 },
                tagName: 'button',
                componentName: 'Button',
              },
            },
          ],
          reasons: [],
          browser: { connected: true, clientCount: 1 },
        }),
      });
      const tool = new QueryBySourceTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        file: 'src/components/Button.tsx',
        line: 10,
        column: 4,
      });

      // Assert
      expect(mockClient.queryBySource).toHaveBeenCalledWith({
        file: 'src/components/Button.tsx',
        line: 10,
        column: 4,
      });
      expect(result.structuredContent).toEqual({
        found: true,
        entryId: 'aB3dEf7h',
        sourceLocation: {
          file: 'src/components/Button.tsx',
          start: { line: 10, column: 4 },
          end: { line: 10, column: 30 },
          tagName: 'button',
          componentName: 'Button',
        },
        runtime: {
          rendered: true,
          componentProps: { label: 'Submit' },
          componentState: null,
          domSnapshot: {
            tagName: 'button',
            attributes: { class: 'btn' },
            innerText: 'Submit',
          },
        },
        browserConnected: true,
        match: {
          confidence: 'high',
          strategy: 'exact_line_and_column',
          lineDistance: 0,
          columnDistance: 0,
        },
        candidates: [
          {
            entryId: 'aB3dEf7h',
            confidence: 'high',
            strategy: 'exact_line_and_column',
            lineDistance: 0,
            columnDistance: 0,
            sourceLocation: {
              file: 'src/components/Button.tsx',
              start: { line: 10, column: 4 },
              end: { line: 10, column: 30 },
              tagName: 'button',
              componentName: 'Button',
            },
          },
        ],
        reasons: [],
        browser: { connected: true, clientCount: 1 },
        error: undefined,
        hint: undefined,
      });
      expect(JSON.parse(getResultText(result))).toEqual(
        result.structuredContent,
      );
    });

    it('should handle not-found responses', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({
          found: false,
        }),
      });
      const tool = new QueryBySourceTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        file: 'src/components/Missing.tsx',
        line: 99,
      });

      // Assert
      expect(result.structuredContent).toEqual({
        found: false,
        entryId: undefined,
        sourceLocation: undefined,
        runtime: undefined,
        browserConnected: undefined,
        error: undefined,
        hint:
          'No manifest entry found for this source location. ' +
          'Try the PinFlow manifest query tool with the file path to discover which lines have entries, ' +
          'or use tolerance > 0 to widen the search.',
      });
    });

    it('should pass optional parameters through to the client', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({ found: false }),
      });
      const tool = new QueryBySourceTool(mockClient);

      // Act
      await tool.toolCallback({
        file: 'src/App.tsx',
        line: 5,
        column: 0,
        tolerance: 3,
        includeRuntime: false,
        sessionId: 'tab-web',
      });

      // Assert
      expect(mockClient.queryBySource).toHaveBeenCalledWith({
        file: 'src/App.tsx',
        line: 5,
        column: 0,
        tolerance: 3,
        includeRuntime: false,
        sessionId: 'tab-web',
      });
    });

    it('should return browser-not-connected hint when browserConnected is false', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({
          found: true,
          entryId: 'aB3dEf7h',
          sourceLocation: {
            file: 'src/components/Button.tsx',
            start: { line: 10, column: 4 },
          },
          browserConnected: false,
          reasons: ['browser_not_connected'],
          browser: { connected: false, clientCount: 0 },
        }),
      });
      const tool = new QueryBySourceTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        file: 'src/components/Button.tsx',
        line: 10,
      });

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['hint']).toContain('No browser is connected');
      expect(structured['hint']).toContain('Ask the user');
    });

    it('should return ambiguity hint from machine-readable reasons', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({
          found: true,
          entryId: 'aB3dEf7h',
          sourceLocation: {
            file: 'src/components/Button.tsx',
            start: { line: 10, column: 4 },
          },
          reasons: ['ambiguous_source_match'],
          candidates: [{ entryId: 'aB3dEf7h' }, { entryId: 'xY9zK2pQ' }],
        }),
      });
      const tool = new QueryBySourceTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        file: 'src/components/Button.tsx',
        line: 10,
      });

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['hint']).toContain('Multiple manifest entries match');
      expect(structured['reasons']).toEqual(['ambiguous_source_match']);
    });

    it('should return path ambiguity hint from machine-readable reasons', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({
          found: false,
          reasons: ['ambiguous_source_path'],
          pathCandidates: [
            'apps/admin/src/components/Input.tsx',
            'src/components/Input.tsx',
          ],
        }),
      });
      const tool = new QueryBySourceTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        file: 'components/Input.tsx',
        line: 5,
      });

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['hint']).toContain('matches multiple manifest files');
      expect(structured['pathCandidates']).toEqual([
        'apps/admin/src/components/Input.tsx',
        'src/components/Input.tsx',
      ]);
      expect(structured['reasons']).toEqual(['ambiguous_source_path']);
    });

    it('should return browser session ambiguity hint and sessions', async () => {
      const sessions = [
        {
          sessionId: 'tab-web',
          pageUrl: 'http://localhost:3000/',
          route: '/',
        },
        {
          sessionId: 'tab-admin',
          pageUrl: 'http://localhost:3000/admin',
          route: '/admin',
        },
      ];
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({
          found: true,
          entryId: 'aB3dEf7h',
          sourceLocation: {
            file: 'src/components/Button.tsx',
            start: { line: 10, column: 4 },
          },
          browserConnected: true,
          browser: {
            connected: true,
            clientCount: 2,
            sessions,
          },
          reasons: ['multiple_browser_sessions'],
        }),
      });
      const tool = new QueryBySourceTool(mockClient);

      const result: CallToolResult = await tool.toolCallback({
        file: 'src/components/Button.tsx',
        line: 10,
      });

      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['hint']).toContain('Multiple browser sessions');
      expect(structured['browser']).toEqual({
        connected: true,
        clientCount: 2,
        sessions,
      });
      expect(structured['reasons']).toEqual(['multiple_browser_sessions']);
    });

    it('should return manifest stale hint from machine-readable reasons', async () => {
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({
          found: true,
          entryId: 'sTaLe001',
          sourceLocation: {
            file: 'src/components/Stale.tsx',
            start: { line: 3, column: 2 },
          },
          manifest: {
            entryCount: 1,
            fileCount: 1,
            componentCount: 1,
            lastUpdated: '2026-04-29T10:00:00.000Z',
            freshness: {
              status: 'stale',
              stale: true,
              reason: 'source_newer_than_manifest',
              sourceFile: 'src/components/Stale.tsx',
              checkedAt: '2026-04-29T10:00:01.000Z',
              repairHint: 'Restart or refresh the dev server.',
            },
          },
          reasons: ['manifest_stale'],
        }),
      });
      const tool = new QueryBySourceTool(mockClient);

      const result: CallToolResult = await tool.toolCallback({
        file: 'src/components/Stale.tsx',
        line: 3,
      });

      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['hint']).toBe('Restart or refresh the dev server.');
      expect(structured['reasons']).toEqual(['manifest_stale']);
    });

    it('should return not-rendered hint when element is not rendered', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryBySource: vi.fn().mockResolvedValue({
          found: true,
          entryId: 'aB3dEf7h',
          sourceLocation: {
            file: 'src/components/Button.tsx',
            start: { line: 10, column: 4 },
          },
          runtime: { rendered: false },
          browserConnected: true,
        }),
      });
      const tool = new QueryBySourceTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        file: 'src/components/Button.tsx',
        line: 10,
      });

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['hint']).toContain('not currently rendered');
      expect(structured['hint']).toContain('Ask the user to navigate');
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryBySource: vi
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
      });
      const tool = new QueryBySourceTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        file: 'src/App.tsx',
        line: 1,
      });

      // Assert
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(getResultText(result));
      expect(parsed.title).toBe('Connection refused');
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new QueryBySourceTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.QUERY_BY_SOURCE);
    expect(tool.description).toContain('PinFlow');
    expect(tool.description).toContain('source location');
    expect(tool.inputSchema).toBeDefined();
    expect(tool.outputSchema).toBeDefined();
  });
});
