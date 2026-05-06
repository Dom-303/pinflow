/**
 * Tests for agent-detection — which agent CLI binaries are on PATH.
 * @module
 */
import { describe, expect, it, vi } from 'vitest';

import { detectInstalledAgents } from './agent-detection.js';
import type { AgentDetectionDeps } from './agent-detection.js';

describe('detectInstalledAgents', () => {
  it('returns codex=true when only codex binary resolves', async () => {
    // Arrange
    const execFileFn = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'codex') return Promise.resolve({ stdout: '/usr/bin/codex' });
      return Promise.reject(new Error('not found'));
    });
    const deps: AgentDetectionDeps = { execFileFn };

    // Act
    const result = await detectInstalledAgents(deps);

    // Assert
    expect(result).toEqual({ codex: true, 'claude-code': false, copilot: false });
  });

  it('returns claude-code=true when only claude binary resolves', async () => {
    // Arrange
    const execFileFn = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'claude') return Promise.resolve({ stdout: '/usr/local/bin/claude' });
      return Promise.reject(new Error('not found'));
    });
    const deps: AgentDetectionDeps = { execFileFn };

    // Act
    const result = await detectInstalledAgents(deps);

    // Assert
    expect(result).toEqual({ codex: false, 'claude-code': true, copilot: false });
  });

  it('returns copilot=true when only copilot binary resolves', async () => {
    // Arrange
    const execFileFn = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'copilot') return Promise.resolve({ stdout: '/usr/local/bin/copilot' });
      return Promise.reject(new Error('not found'));
    });
    const deps: AgentDetectionDeps = { execFileFn };

    // Act
    const result = await detectInstalledAgents(deps);

    // Assert
    expect(result).toEqual({ codex: false, 'claude-code': false, copilot: true });
  });

  it('returns all false when no binaries are found', async () => {
    // Arrange
    const execFileFn = vi.fn().mockRejectedValue(new Error('not found'));
    const deps: AgentDetectionDeps = { execFileFn };

    // Act
    const result = await detectInstalledAgents(deps);

    // Assert
    expect(result).toEqual({ codex: false, 'claude-code': false, copilot: false });
  });
});
