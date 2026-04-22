import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { InitCommand } from './init.command.js';
import { McpCommand } from './mcp.command.js';
import { ServeCommand } from './serve.command.js';
import { StatusCommand } from './status.command.js';
import { StopCommand } from './stop.command.js';

function readCommandSource(filename: string): string {
  return readFileSync(resolve(import.meta.dirname, filename), 'utf8');
}

describe('relay cli command branding', () => {
  it('uses PinFlow wording in command descriptions', () => {
    expect(InitCommand.description()).toBe(
      'Initialize PinFlow and configure your coding agent',
    );
    expect(McpCommand.description()).toBe(
      'Start the PinFlow MCP adapter for agent integration (stdio transport)',
    );
    expect(ServeCommand.description()).toBe('Start the PinFlow relay server');
    expect(StatusCommand.description()).toBe(
      'Check whether the PinFlow relay is running',
    );
    expect(StopCommand.description()).toBe('Stop the running PinFlow relay');
  });

  it('uses pinflow-preferring help text in command output', () => {
    const serveSource = readCommandSource('serve.command.ts');
    const statusSource = readCommandSource('status.command.ts');
    const stopSource = readCommandSource('stop.command.ts');
    const initSource = readCommandSource('init.command.ts');
    const mcpSource = readCommandSource('mcp.command.ts');

    expect(serveSource).toContain('[pinflow-cli] Relay daemon started');
    expect(serveSource).toContain('To check status: pinflow status');
    expect(serveSource).toContain('To stop it: pinflow stop');

    expect(statusSource).toContain('[pinflow-cli] Relay is running');
    expect(statusSource).toContain('Start with: pinflow serve');

    expect(stopSource).toContain('[pinflow-cli] Stopping relay daemon...');
    expect(stopSource).toContain('[pinflow-cli] Relay daemon stopped');

    expect(initSource).toContain('[pinflow-cli] Invalid agent:');
    expect(initSource).toContain('[pinflow-cli] Init failed:');

    expect(mcpSource).toContain('[pinflow-cli] Failed to start MCP adapter:');
    expect(mcpSource).toContain('[pinflow-cli] No workspace found, starting in dormant mode');
    expect(mcpSource).toContain('[pinflow-cli] Starting MCP adapter');
  });
});
