import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildRunContextPayload } from './context-payload.js';

describe('buildRunContextPayload', () => {
  it('adds a bounded source snippet without expanding the runner prompt', async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pinflow-context-'));

    try {
      await mkdir(path.join(workspaceRoot, 'src'));
      await writeFile(
        path.join(workspaceRoot, 'src', 'App.tsx'),
        Array.from(
          { length: 120 },
          (_, index) => `export const line${index + 1} = ${index + 1};`,
        ).join('\n'),
        'utf8',
      );

      const context = await buildRunContextPayload(
        {
          found: true,
          annotationId: 'ann_abc12345_1',
          userIntent: 'Make it smaller.',
          sourceLocation: {
            file: 'src/App.tsx',
            line: 60,
            column: 1,
          },
        },
        {
          workspaceRoot,
          now: () => new Date('2026-04-30T12:00:00.000Z'),
        },
      );

      expect(context.generatedAt).toBe('2026-04-30T12:00:00.000Z');
      expect(context.sourceSnippet).toMatchObject({
        file: 'src/App.tsx',
        startLine: 30,
        endLine: 90,
        targetLine: 60,
        truncated: false,
      });
      expect(context.sourceSnippet?.text).toContain('60: export const line60');
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('skips source files outside the workspace', async () => {
    const context = await buildRunContextPayload(
      {
        found: true,
        annotationId: 'ann_abc12345_1',
        sourceLocation: {
          file: '../../outside.ts',
          line: 1,
        },
      },
      {
        workspaceRoot: '/repo',
        now: () => new Date('2026-04-30T12:00:00.000Z'),
      },
    );

    expect(context.sourceSnippet).toBeUndefined();
  });
});
