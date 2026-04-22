import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DormantStatusTool } from './dormant-status.tool.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('DormantStatusTool', () => {
  describe('toolCallback', () => {
    it('should return dormant status with correct cwd', async () => {
      // Arrange
      const cwd = '/home/user/some-project';
      const tool = new DormantStatusTool(cwd);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['active']).toBe(false);
      expect(structured['cwd']).toBe(cwd);
    });

    it('should return guidance explaining dormant state', async () => {
      // Arrange
      const tool = new DormantStatusTool('/tmp/test');

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['guidance']).toEqual(expect.any(String));
      expect(structured['guidance']).toContain('.pinflow');
    });

    it('should return actionable next steps for the agent', async () => {
      // Arrange
      const tool = new DormantStatusTool('/tmp/test');

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['nextSteps']).toEqual(expect.any(String));
      expect(structured['nextSteps']).toContain('package.json');
      expect(structured['nextSteps']).toContain('@domscribe');
    });

    it('should return text content matching structured content', async () => {
      // Arrange
      const tool = new DormantStatusTool('/tmp/test');

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.content).toHaveLength(1);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]).toEqual({
        type: 'text',
        text: JSON.stringify(result.structuredContent, null, 2),
      });
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new DormantStatusTool('/tmp/test');

    expect(tool.name).toBe(MCP_TOOLS.STATUS);
    expect(tool.description).toContain('PinFlow workspace status');
    expect(tool.description).toContain('PinFlow is not active');
  });

  it('should use PinFlow wording while preserving compatibility guidance', async () => {
    const tool = new DormantStatusTool('/tmp/test');

    const result: CallToolResult = await tool.toolCallback({});
    const structured = result.structuredContent as Record<string, unknown>;

    expect(structured['guidance']).toContain('PinFlow is not active');
    expect(structured['guidance']).toContain('.pinflow');
    expect(structured['nextSteps']).toContain('PinFlow');
    expect(structured['nextSteps']).toContain('@domscribe');
  });
});
