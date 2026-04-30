import { describe, expect, it } from 'vitest';

import { shouldStartRunner } from './types.js';

describe('runner mode resolution', () => {
  it('prefers explicit mode auto over the legacy autoStart flag', () => {
    expect(shouldStartRunner({ mode: 'auto', autoStart: false })).toBe(true);
  });

  it('treats manual mode as foreground or external ownership', () => {
    expect(shouldStartRunner({ mode: 'manual', autoStart: true })).toBe(false);
  });

  it('keeps external mode owned by another tool or extension', () => {
    expect(shouldStartRunner({ mode: 'external', autoStart: true })).toBe(false);
  });

  it('keeps autoStart true as a backward-compatible alias', () => {
    expect(shouldStartRunner({ autoStart: true })).toBe(true);
  });

  it('does not start a runner by default', () => {
    expect(shouldStartRunner(undefined)).toBe(false);
    expect(shouldStartRunner({})).toBe(false);
  });
});
