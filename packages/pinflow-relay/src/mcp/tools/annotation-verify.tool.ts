import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';
import {
  AnnotationVerificationComparisonSchema,
  AnnotationVerificationStatusSchema,
} from '@pinflow/core';

const AnnotationVerifyToolInputSchema = z.object({
  annotationId: z.string().describe('The annotation ID to verify'),
});

type AnnotationVerifyToolInput = z.infer<
  typeof AnnotationVerifyToolInputSchema
>;

const AnnotationVerifyToolOutputSchema = McpToolOutputSchema.extend({
  annotationId: z.string(),
  status: AnnotationVerificationStatusSchema,
  checkedAt: z.string(),
  reasons: z.array(z.string()),
  comparison: AnnotationVerificationComparisonSchema.optional(),
  nextStep: z.string().optional(),
});

type AnnotationVerifyToolOutput = z.infer<
  typeof AnnotationVerifyToolOutputSchema
>;

export class AnnotationVerifyTool implements McpToolDefinition<
  typeof AnnotationVerifyToolInputSchema,
  typeof AnnotationVerifyToolOutputSchema
> {
  name = MCP_TOOLS.ANNOTATION_VERIFY;
  description =
    'verify a PinFlow annotation after an edit by re-capturing the original source-exact live element and comparing DOM text/attributes.';
  inputSchema = AnnotationVerifyToolInputSchema;
  outputSchema = AnnotationVerifyToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: AnnotationVerifyToolInput) {
    try {
      const response = await this.relayHttpClient.verifyAnnotation(
        input.annotationId,
      );

      const output: AnnotationVerifyToolOutput = {
        annotationId: response.annotationId,
        status: response.status,
        checkedAt: response.checkedAt,
        reasons: response.reasons,
        comparison: response.comparison,
        nextStep: this.getNextStep(response.status),
      };

      return {
        structuredContent: output,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      return mcpErrorResult(error);
    }
  }

  private getNextStep(status: AnnotationVerifyToolOutput['status']): string {
    if (status === 'verified') {
      return 'Verification is confident. If the user request is complete, call pinflow.annotation.updateStatus with status "processed".';
    }

    if (status === 'uncertain') {
      return 'Verification is uncertain. Inspect the reasons and ask the user or re-query PinFlow before marking the annotation processed.';
    }

    return 'Verification could not confirm the live UI. Inspect the reasons, fix the issue, or mark the annotation failed with errorDetails.';
  }
}
