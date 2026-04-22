/**
 * MCP tool definitions, base class, and shared helpers
 * @module @pinflow/relay/mcp/tools/tool-defs
 */
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { PinFlowError, PinFlowErrorCode } from '@pinflow/core';

/**
 * Available MCP tool names
 */
export const MCP_TOOLS = {
  // Resolve tools
  RESOLVE: 'pinflow.resolve',
  RESOLVE_BATCH: 'pinflow.resolve.batch',
  // Manifest tools
  MANIFEST_STATS: 'pinflow.manifest.stats',
  MANIFEST_QUERY: 'pinflow.manifest.query',
  // Annotation tools
  ANNOTATION_LIST: 'pinflow.annotation.list',
  ANNOTATION_GET: 'pinflow.annotation.get',
  ANNOTATION_UPDATE_STATUS: 'pinflow.annotation.updateStatus',
  ANNOTATION_PROCESS: 'pinflow.annotation.process',
  ANNOTATION_RESPOND: 'pinflow.annotation.respond',
  ANNOTATION_SEARCH: 'pinflow.annotation.search',
  // Query tools
  QUERY_BY_SOURCE: 'pinflow.query.bySource',
  // System tools
  STATUS: 'pinflow.status',
} as const;

export const MCP_TOOL_COMPAT_ALIASES: Record<McpToolName, string[]> = {
  [MCP_TOOLS.RESOLVE]: ['pinflow.resolve'],
  [MCP_TOOLS.RESOLVE_BATCH]: ['pinflow.resolve.batch'],
  [MCP_TOOLS.MANIFEST_STATS]: ['pinflow.manifest.stats'],
  [MCP_TOOLS.MANIFEST_QUERY]: ['pinflow.manifest.query'],
  [MCP_TOOLS.ANNOTATION_LIST]: ['pinflow.annotation.list'],
  [MCP_TOOLS.ANNOTATION_GET]: ['pinflow.annotation.get'],
  [MCP_TOOLS.ANNOTATION_UPDATE_STATUS]: ['pinflow.annotation.updateStatus'],
  [MCP_TOOLS.ANNOTATION_PROCESS]: ['pinflow.annotation.process'],
  [MCP_TOOLS.ANNOTATION_RESPOND]: ['pinflow.annotation.respond'],
  [MCP_TOOLS.ANNOTATION_SEARCH]: ['pinflow.annotation.search'],
  [MCP_TOOLS.QUERY_BY_SOURCE]: ['pinflow.query.bySource'],
  [MCP_TOOLS.STATUS]: ['pinflow.status'],
};

export type McpToolName = (typeof MCP_TOOLS)[keyof typeof MCP_TOOLS];

/**
 * MCP tool definition with Zod schema for input validation.
 * Each tool class implements this interface.
 */
export interface McpToolDefinition<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TInput extends z.ZodType<any> = z.ZodType<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TOutput extends z.ZodType<any> = z.ZodType<any>,
> {
  name: McpToolName;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  toolCallback: (args: z.infer<TInput>) => Promise<CallToolResult>;
}

/**
 * Base output schema for all MCP tools.
 * Tool output schemas extend this via `.extend()`.
 */
export const McpToolOutputSchema = z.object({
  error: z
    .string()
    .optional()
    .describe('Error message if the tool call failed'),
});

/**
 * Converts any caught error into a structured MCP error result.
 */
export function mcpErrorResult(error: unknown): CallToolResult {
  const problemDetails =
    error instanceof PinFlowError
      ? error.toProblemDetails()
      : {
          code: PinFlowErrorCode.DS_INTERNAL_ERROR,
          title: error instanceof Error ? error.message : 'Unknown error',
        };

  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(problemDetails),
      },
    ],
  };
}
