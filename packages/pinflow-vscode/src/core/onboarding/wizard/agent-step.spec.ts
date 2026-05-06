import { describe, expect, it, vi } from 'vitest';

import { pickAgent } from './agent-step.js';
import type { AgentStepDeps } from './agent-step.js';

describe('pickAgent', () => {
  it('returns "codex" when user picks the Codex item', async () => {
    // Arrange
    const deps: AgentStepDeps = {
      showQuickPick: vi.fn().mockResolvedValue({ value: 'codex' }),
    };

    // Act
    const result = await pickAgent(deps);

    // Assert
    expect(result).toBe('codex');
  });

  it('returns "claude-code" when user picks the Claude Code item', async () => {
    // Arrange
    const deps: AgentStepDeps = {
      showQuickPick: vi.fn().mockResolvedValue({ value: 'claude-code' }),
    };

    // Act
    const result = await pickAgent(deps);

    // Assert
    expect(result).toBe('claude-code');
  });

  it('returns undefined when user cancels (showQuickPick returns undefined)', async () => {
    // Arrange
    const deps: AgentStepDeps = {
      showQuickPick: vi.fn().mockResolvedValue(undefined),
    };

    // Act
    const result = await pickAgent(deps);

    // Assert
    expect(result).toBeUndefined();
  });
});
