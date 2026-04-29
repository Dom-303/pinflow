import { describe, expect, it } from 'vitest';

import { buildRunnerPrompt } from './prompt.js';

describe('buildRunnerPrompt', () => {
  it('builds a source-focused local agent prompt without API handoff language', () => {
    const prompt = buildRunnerPrompt(
      {
        found: true,
        annotationId: 'ann_abc12345_123',
        userIntent: 'Make the heading smaller.',
        element: {
          tagName: 'h1',
          dataDs: 'abc12345',
          selector: 'main h1',
          attributes: { class: 'hero-title' },
          innerText: 'Welcome',
        },
        sourceLocation: {
          file: 'src/App.tsx',
          line: 42,
          column: 7,
          componentName: 'App',
          tagName: 'h1',
        },
        runtimeContext: {
          componentProps: { tone: 'calm' },
          componentState: {},
        },
        fullAnnotation: {},
      },
      { workspaceRoot: '/repo' },
    );

    expect(prompt).toContain('Make the heading smaller.');
    expect(prompt).toContain('src/App.tsx');
    expect(prompt).toContain('Line: 42');
    expect(prompt).toContain('data-ds: abc12345');
    expect(prompt).toContain('Do not use external APIs');
  });
});
