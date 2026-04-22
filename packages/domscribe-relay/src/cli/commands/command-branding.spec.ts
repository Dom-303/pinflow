import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ServeCommand } from './serve.command.js';
import { StatusCommand } from './status.command.js';
import { StopCommand } from './stop.command.js';

function readCommandSource(filename: string): string {
  return readFileSync(resolve(import.meta.dirname, filename), 'utf8');
}

describe('relay cli command branding', () => {
  it('uses PinFlow wording in command descriptions', () => {
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

    expect(serveSource).toContain('[pinflow-cli] Relay daemon started');
    expect(serveSource).toContain('To check status: pinflow status');
    expect(serveSource).toContain('To stop it: pinflow stop');

    expect(statusSource).toContain('[pinflow-cli] Relay is running');
    expect(statusSource).toContain('Start with: pinflow serve');

    expect(stopSource).toContain('[pinflow-cli] Stopping relay daemon...');
    expect(stopSource).toContain('[pinflow-cli] Relay daemon stopped');
  });
});
