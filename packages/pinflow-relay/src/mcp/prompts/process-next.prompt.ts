import {
  McpPromptDefinition,
  McpPromptMessage,
  MCP_PROMPTS,
} from './prompt.defs.js';

const ProcessNextArgsSchema = {};

export class ProcessNextPrompt implements McpPromptDefinition<
  typeof ProcessNextArgsSchema
> {
  name = MCP_PROMPTS.PROCESS_NEXT;
  description =
    'Process the next queued PinFlow UI annotation. Claims one annotation with a visible lease, then completes it.';
  argsSchema = ProcessNextArgsSchema;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  promptCallback(_args: Record<string, string>): McpPromptMessage[] {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Process the next queued PinFlow annotation.

Use the pinflow.annotation.process tool to claim the next annotation. The claim has a lease so other agents can see the task is already taken.

If an annotation is found:
1. Read the userIntent and sourceLocation
2. Navigate to the source file and understand the context
3. Implement the requested change
4. Use pinflow.annotation.respond to store your response
5. Use pinflow.annotation.verify to re-capture and compare the live UI
6. If verification is confident, use pinflow.annotation.updateStatus to mark it as 'processed'

If no annotation is found, inform the user that the queue is empty.`,
        },
      },
    ];
  }
}
