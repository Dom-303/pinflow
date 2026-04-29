import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AnnotationVerifyTool } from './annotation-verify.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('AnnotationVerifyTool', () => {
  it('should return verification result with next step', async () => {
    const verifyResponse = {
      annotationId: 'ann_123',
      status: 'verified',
      checkedAt: '2026-04-29T10:00:00.000Z',
      reasons: [],
      comparison: {
        innerText: {
          before: 'Click me',
          after: 'Send',
          changed: true,
        },
        attributes: {
          before: { class: 'btn-primary' },
          after: { class: 'btn-primary active' },
          changed: true,
          changedKeys: ['class'],
        },
      },
    };
    const mockClient = createMockRelayClient({
      verifyAnnotation: vi.fn().mockResolvedValue(verifyResponse),
    });
    const tool = new AnnotationVerifyTool(mockClient);

    const result: CallToolResult = await tool.toolCallback({
      annotationId: 'ann_123',
    });

    expect(mockClient.verifyAnnotation).toHaveBeenCalledWith('ann_123');
    expect(result.structuredContent).toEqual({
      ...verifyResponse,
      nextStep:
        'Verification is confident. If the user request is complete, call pinflow.annotation.updateStatus with status "processed".',
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new AnnotationVerifyTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.ANNOTATION_VERIFY);
    expect(tool.description).toContain('verify');
    expect(tool.description).toContain('PinFlow');
  });
});
