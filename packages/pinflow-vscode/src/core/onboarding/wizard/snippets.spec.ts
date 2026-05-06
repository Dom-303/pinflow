import { describe, it, expect } from 'vitest';

import { generatePinflowConfigJson, type SnippetInput } from './snippets.js';

describe('generatePinflowConfigJson', () => {
  it('vite + codex produces correct JSON shape', () => {
    // Arrange
    const input: SnippetInput = { agent: 'codex', framework: 'vite', appRoot: '.' };

    // Act
    const result = generatePinflowConfigJson(input);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    // Assert
    expect(parsed).toMatchObject({
      appRoot: '.',
      framework: 'vite',
      runner: { provider: 'codex' },
    });
  });

  it('webpack + claude-code produces runner.provider "claude"', () => {
    // Arrange
    const input: SnippetInput = { agent: 'claude-code', framework: 'webpack', appRoot: 'app' };

    // Act
    const result = generatePinflowConfigJson(input);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    // Assert
    expect((parsed as { runner: { provider: string } }).runner.provider).toBe('claude');
  });

  it('next + claude-code returns valid parseable JSON', () => {
    // Arrange
    const input: SnippetInput = { agent: 'claude-code', framework: 'next', appRoot: 'frontend' };

    // Act
    const result = generatePinflowConfigJson(input);

    // Assert
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed).toHaveProperty('framework', 'next');
  });

  it('preserves relative appRoot value verbatim', () => {
    // Arrange
    const input: SnippetInput = { agent: 'other', framework: 'vite', appRoot: 'packages/web' };

    // Act
    const result = generatePinflowConfigJson(input);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    // Assert
    expect(parsed).toHaveProperty('appRoot', 'packages/web');
  });
});
