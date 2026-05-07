import { describe, it, expect, vi } from 'vitest';

import { pickAgent } from './agent-step.js';

describe('pickAgent', () => {
  it('shows title and placeholder with step label', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue({ label: 'Codex', value: 'codex' });

    // Act
    const result = await pickAgent({
      showQuickPick,
      stepLabel: 'Step 1/2',
    });

    // Assert
    expect(result).toBe('codex');
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Step 1/2 — Choose agent');
    expect(options.placeHolder).toBe('Choose the coding agent for this project');
  });

  it('omits step prefix when stepLabel is undefined', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    await pickAgent({ showQuickPick });

    // Assert
    const [, options] = showQuickPick.mock.calls[0];
    expect(options.title).toBe('PinFlow Setup · Choose agent');
  });

  it('reorders installed agents to the top with installed badge', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    await pickAgent({
      showQuickPick,
      installedAgents: { codex: false, 'claude-code': true, copilot: false },
      stepLabel: 'Step 1/3',
    });

    // Assert
    const [items] = showQuickPick.mock.calls[0];
    const claudeItem = items.find((i: { value: string }) => i.value === 'claude-code');
    expect(claudeItem.description).toBe('✓ installed');
    // Claude is reordered to the top
    expect(items[0].value).toBe('claude-code');
  });

  it('returns undefined when user cancels', async () => {
    // Arrange
    const showQuickPick = vi.fn().mockResolvedValue(undefined);

    // Act
    const result = await pickAgent({ showQuickPick });

    // Assert
    expect(result).toBeUndefined();
  });
});
