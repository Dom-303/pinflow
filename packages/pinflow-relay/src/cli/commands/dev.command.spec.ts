import { describe, expect, it } from 'vitest';

import { DevCommand } from './dev.command.js';

describe('DevCommand', () => {
  it('describes the one-command local development workflow', () => {
    expect(DevCommand.name()).toBe('dev');
    expect(DevCommand.description()).toBe(
      'Start PinFlow relay, runner, and app dev command',
    );
  });

  it('accepts an explicit app root for monorepo or demo usage', () => {
    expect(DevCommand.options.map((option) => option.long)).toContain(
      '--app-root',
    );
  });

  it('supports raw provider output when the user needs full details', () => {
    expect(DevCommand.options.map((option) => option.long)).toContain('--raw');
  });

  it('can open the detected app URL in the browser', () => {
    expect(DevCommand.options.map((option) => option.long)).toContain('--open');
  });
});
