import { describe, it, expect } from 'vitest';

import { generatePinflowConfigJson } from './snippets.js';

describe('generatePinflowConfigJson', () => {
  it('writes appRoot as "." regardless of input.appRoot', () => {
    // Arrange
    const input = {
      agent: 'codex' as const,
      framework: 'vite' as const,
      appRoot: '/anything/can/be/here',
    };

    // Act
    const result = generatePinflowConfigJson(input);
    const parsed = JSON.parse(result);

    // Assert
    expect(parsed.appRoot).toBe('.');
  });

  it('maps agent="claude-code" to runner.provider="claude"', () => {
    // Arrange
    const input = {
      agent: 'claude-code' as const,
      framework: 'next' as const,
      appRoot: '/repo',
    };

    // Act
    const result = JSON.parse(generatePinflowConfigJson(input));

    // Assert
    expect(result.runner.provider).toBe('claude');
  });

  it('maps agent="codex" to runner.provider="codex"', () => {
    // Arrange
    const input = {
      agent: 'codex' as const,
      framework: 'vite' as const,
      appRoot: '/repo',
    };

    // Act
    const result = JSON.parse(generatePinflowConfigJson(input));

    // Assert
    expect(result.runner.provider).toBe('codex');
  });

  it('writes framework verbatim', () => {
    // Arrange
    const frameworks = ['vite', 'webpack', 'next', 'nuxt'] as const;

    // Act + Assert
    for (const framework of frameworks) {
      const result = JSON.parse(
        generatePinflowConfigJson({
          agent: 'codex',
          framework,
          appRoot: '/repo',
        }),
      );
      expect(result.framework).toBe(framework);
    }
  });
});
