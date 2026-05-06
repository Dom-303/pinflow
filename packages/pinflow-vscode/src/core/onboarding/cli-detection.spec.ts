import { describe, it, expect, vi, beforeEach } from 'vitest';

import { detectPinFlowCli, type CliDetectionDeps } from './cli-detection.js';

function makeDeps(overrides?: Partial<CliDetectionDeps>): CliDetectionDeps {
  return {
    runWhich: vi.fn(),
    checkExecutable: vi.fn(),
    ...overrides,
  };
}

describe('detectPinFlowCli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns available when which/where resolves and binary is executable', async () => {
    // Arrange
    const resolvedPath = '/usr/local/bin/pinflow';
    const deps = makeDeps({
      runWhich: vi.fn().mockResolvedValue(resolvedPath + '\n'),
      checkExecutable: vi.fn().mockResolvedValue(undefined),
    });

    // Act
    const result = await detectPinFlowCli(deps);

    // Assert
    expect(result.available).toBe(true);
    expect(result.path).toBe(resolvedPath);
    expect(result.reason).toBeUndefined();
  });

  it('returns not-on-path when which/where exits non-zero', async () => {
    // Arrange
    const error = Object.assign(new Error('not found'), { code: 1 });
    const deps = makeDeps({
      runWhich: vi.fn().mockRejectedValue(error),
    });

    // Act
    const result = await detectPinFlowCli(deps);

    // Assert
    expect(result.available).toBe(false);
    expect(result.reason).toBe('not-on-path');
  });

  it('returns not-executable when binary exists but lacks +x', async () => {
    // Arrange
    const resolvedPath = '/usr/local/bin/pinflow';
    const deps = makeDeps({
      runWhich: vi.fn().mockResolvedValue(resolvedPath + '\n'),
      checkExecutable: vi.fn().mockRejectedValue(new Error('EACCES: permission denied')),
    });

    // Act
    const result = await detectPinFlowCli(deps);

    // Assert
    expect(result.available).toBe(false);
    expect(result.reason).toBe('not-executable');
    expect(result.path).toBe(resolvedPath);
  });

  it('returns unknown reason on unexpected errors without throwing', async () => {
    // Arrange
    const unexpectedError = new TypeError('unexpected internal failure');
    const deps = makeDeps({
      runWhich: vi.fn().mockRejectedValue(unexpectedError),
    });

    // Act
    const result = await detectPinFlowCli(deps);

    // Assert
    expect(result.available).toBe(false);
    expect(result.reason).toBe('unknown');
    expect(result.detail).toContain('unexpected internal failure');
  });
});
