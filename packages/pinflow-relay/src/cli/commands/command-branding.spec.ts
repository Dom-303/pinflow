import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DevCommand } from './dev.command.js';
import { DoctorCommand } from './doctor.command.js';
import { ExternalCommand } from './external.command.js';
import { InitCommand } from './init.command.js';
import { McpCommand } from './mcp.command.js';
import { RunnerCommand } from './runner.command.js';
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
    expect(RunnerCommand.description()).toBe(
      'Run the PinFlow local agent runner',
    );
    expect(ServeCommand.description()).toBe('Start the PinFlow relay server');
    expect(StatusCommand.description()).toBe(
      'Check whether the PinFlow relay is running',
    );
    expect(DoctorCommand.description()).toBe(
      'Diagnose PinFlow setup and relay health',
    );
    expect(DevCommand.description()).toBe(
      'Start PinFlow relay, runner, and app dev command',
    );
    expect(ExternalCommand.description()).toBe(
      'Claim and complete PinFlow tasks from an external visible agent',
    );
    expect(StopCommand.description()).toBe('Stop the running PinFlow relay');
  });

  it('uses pinflow-preferring help text in command output', () => {
    const serveSource = readCommandSource('serve.command.ts');
    const statusSource = readCommandSource('status.command.ts');
    const doctorSource = readCommandSource('doctor.command.ts');
    const stopSource = readCommandSource('stop.command.ts');
    const initSource = readCommandSource('init.command.ts');
    const mcpSource = readCommandSource('mcp.command.ts');
    const runnerSource = readCommandSource('runner.command.ts');
    const devSource = readCommandSource('dev.command.ts');
    const externalSource = readCommandSource('external.command.ts');

    expect(serveSource).toContain('[pinflow-cli] Relay daemon started');
    expect(serveSource).toContain('To check status: pinflow status');
    expect(serveSource).toContain('To stop it: pinflow stop');

    expect(statusSource).toContain('[pinflow-cli] Relay is running');
    expect(statusSource).toContain('Start with: pinflow serve');

    expect(doctorSource).toContain('[pinflow-cli] Doctor failed:');

    expect(stopSource).toContain('[pinflow-cli] Stopping relay daemon...');
    expect(stopSource).toContain('[pinflow-cli] Relay daemon stopped');

    expect(initSource).toContain('[pinflow-cli] Invalid agent:');
    expect(initSource).toContain('[pinflow-cli] Init failed:');

    expect(mcpSource).toContain('[pinflow-cli] Failed to start MCP adapter:');
    expect(mcpSource).toContain(
      '[pinflow-cli] No workspace found, starting in dormant mode',
    );
    expect(mcpSource).toContain('[pinflow-cli] Starting MCP adapter');

    expect(runnerSource).toContain('[pinflow-cli] Runner failed:');
    expect(runnerSource).toContain('[pinflow-cli] Runner connected to relay');

    expect(devSource).toContain('[pinflow-cli] Dev failed:');

    expect(externalSource).toContain('[pinflow-cli] External handoff:');
    expect(externalSource).toContain('[pinflow-cli] External claim failed:');
  });

  it('exposes explicit runner model configuration without making it the default', () => {
    expect(RunnerCommand.options.map((option) => option.long)).toContain(
      '--model',
    );

    const runnerSource = readCommandSource('runner.command.ts');
    expect(runnerSource).toContain('model: options.model');
  });
});
