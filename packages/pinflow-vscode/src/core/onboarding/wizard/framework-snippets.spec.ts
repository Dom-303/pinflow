import { describe, it, expect } from 'vitest';

import { FRAMEWORKS } from './app-detection.js';
import { getFrameworkSnippet } from './framework-snippets.js';

describe('getFrameworkSnippet', () => {
  it('returns a non-empty string for every FrameworkId', () => {
    // Arrange
    const ids = FRAMEWORKS.map((f) => f.id);

    // Act + Assert
    for (const id of ids) {
      const snippet = getFrameworkSnippet(id);
      expect(snippet, `snippet for ${id}`).toBeTruthy();
      expect(snippet.trim().length, `snippet for ${id} must have content`).toBeGreaterThan(0);
    }
  });

  it('next snippet contains withPinFlow', () => {
    // Arrange + Act
    const snippet = getFrameworkSnippet('next');

    // Assert
    expect(snippet).toContain('withPinFlow');
  });

  it("nuxt snippet contains modules: ['@pinflow/nuxt']", () => {
    // Arrange + Act
    const snippet = getFrameworkSnippet('nuxt');

    // Assert
    expect(snippet).toContain("modules: ['@pinflow/nuxt']");
  });

  it('react-webpack snippet contains @pinflow/transform/webpack-loader', () => {
    // Arrange + Act
    const snippet = getFrameworkSnippet('react-webpack');

    // Assert
    expect(snippet).toContain('@pinflow/transform/webpack-loader');
  });
});
