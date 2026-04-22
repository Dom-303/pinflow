import { program } from './program.js';

describe('relay cli program', () => {
  it('brands the primary cli surface as PinFlow', () => {
    expect(program.name()).toBe('pinflow');
    expect(program.description()).toContain('PinFlow Relay');
  });
});
