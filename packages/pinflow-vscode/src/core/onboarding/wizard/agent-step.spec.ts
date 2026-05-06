import { describe, expect, it, vi } from 'vitest';

import { pickAgent } from './agent-step.js';
import type { AgentStepDeps } from './agent-step.js';
import type { InstalledAgents } from './agent-detection.js';

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

  it('title contains "Schritt 1/3"', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const deps: AgentStepDeps = { showQuickPick };

    // Act
    await pickAgent(deps);

    // Assert
    expect(showQuickPick).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: expect.stringContaining('Schritt 1/3') }),
    );
  });

  it('installed agent appears first with "✓ installiert" description', async () => {
    // Arrange
    const installedAgents: InstalledAgents = { codex: false, 'claude-code': true, copilot: false };
    const showQuickPick = vi.fn().mockResolvedValue(undefined);
    const deps: AgentStepDeps = { showQuickPick, installedAgents };

    // Act
    await pickAgent(deps);

    // Assert
    const [items] = showQuickPick.mock.calls[0] as [readonly { label: string; description?: string; value: string }[], unknown];
    expect(items[0].value).toBe('claude-code');
    expect(items[0].description).toBe('✓ installiert');
    // Non-installed items follow after
    const restValues = items.slice(1).map((i) => i.value);
    expect(restValues).not.toContain('claude-code');
  });
});
