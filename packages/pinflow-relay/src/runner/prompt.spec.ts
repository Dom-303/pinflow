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
      {
        workspaceRoot: '/repo',
        contextPath: '.pinflow/runs/2026-04/2026-04-30/test/context.json',
      },
    );

    expect(prompt).toContain('Make the heading smaller.');
    expect(prompt).toContain('src/App.tsx');
    expect(prompt).toContain('Line: 42');
    expect(prompt).toContain('data-ds: abc12345');
    expect(prompt).toContain('Do not use external APIs');
    expect(prompt).toContain('Props keys: tone');
    expect(prompt).toContain('Full context file: .pinflow/runs/');
    expect(prompt).not.toContain(JSON.stringify({ tone: 'calm' }, null, 2));
  });
});
