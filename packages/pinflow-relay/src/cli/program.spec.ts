import { describe, expect, it } from 'vitest';

import { program } from './program.js';

describe('relay cli program', () => {
  it('brands the primary cli surface as PinFlow', () => {
    expect(program.name()).toBe('pinflow');
    expect(program.description()).toContain('PinFlow Relay');
  });

  it('registers the doctor command', () => {
    expect(program.commands.map((command) => command.name())).toContain(
      'doctor',
    );
  });

  it('registers the runner command', () => {
    expect(program.commands.map((command) => command.name())).toContain(
      'runner',
    );
  });
});
