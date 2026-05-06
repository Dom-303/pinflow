import { describe, it, expect } from 'vitest';

import { generatePinflowConfigJson } from './snippets.js';

describe('generatePinflowConfigJson', () => {
  it('writes appRoot as "." regardless of input.appRoot', () => {
    // Arrange
    const input = {
      agent: 'codex' as const,
      framework: 'react-vite' as const,
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
      framework: 'react-vite' as const,
      appRoot: '/repo',
    };

    // Act
    const result = JSON.parse(generatePinflowConfigJson(input));

    // Assert
    expect(result.runner.provider).toBe('codex');
  });

  it('react-vite is bucketed to framework="vite"', () => {
    // Arrange + Act
    const result = JSON.parse(
      generatePinflowConfigJson({ agent: 'codex', framework: 'react-vite', appRoot: '/repo' }),
    );

    // Assert
    expect(result.framework).toBe('vite');
  });

  it('vue-webpack is bucketed to framework="webpack"', () => {
    // Arrange + Act
    const result = JSON.parse(
      generatePinflowConfigJson({ agent: 'codex', framework: 'vue-webpack', appRoot: '/repo' }),
    );

    // Assert
    expect(result.framework).toBe('webpack');
  });

  it('next is bucketed to framework="next"', () => {
    // Arrange + Act
    const result = JSON.parse(
      generatePinflowConfigJson({ agent: 'codex', framework: 'next', appRoot: '/repo' }),
    );

    // Assert
    expect(result.framework).toBe('next');
  });

  it('nuxt is bucketed to framework="nuxt"', () => {
    // Arrange + Act
    const result = JSON.parse(
      generatePinflowConfigJson({ agent: 'codex', framework: 'nuxt', appRoot: '/repo' }),
    );

    // Assert
    expect(result.framework).toBe('nuxt');
  });

  it('other-vite is bucketed to framework="vite"', () => {
    // Arrange + Act
    const result = JSON.parse(
      generatePinflowConfigJson({ agent: 'codex', framework: 'other-vite', appRoot: '/repo' }),
    );

    // Assert
    expect(result.framework).toBe('vite');
  });

  it('vue-vite is bucketed to framework="vite"', () => {
    // Arrange + Act
    const result = JSON.parse(
      generatePinflowConfigJson({ agent: 'codex', framework: 'vue-vite', appRoot: '/repo' }),
    );

    // Assert
    expect(result.framework).toBe('vite');
  });

  it('react-webpack is bucketed to framework="webpack"', () => {
    // Arrange + Act
    const result = JSON.parse(
      generatePinflowConfigJson({ agent: 'codex', framework: 'react-webpack', appRoot: '/repo' }),
    );

    // Assert
    expect(result.framework).toBe('webpack');
  });

  it('other-webpack is bucketed to framework="webpack"', () => {
    // Arrange + Act
    const result = JSON.parse(
      generatePinflowConfigJson({ agent: 'codex', framework: 'other-webpack', appRoot: '/repo' }),
    );

    // Assert
    expect(result.framework).toBe('webpack');
  });
});
