import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createAnnotationInput,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

describe('GET /api/v1/annotations/:id/evidence', () => {
  let server: TestServer;
  let createdId: string;

  beforeAll(async () => {
    server = await createTestServer();

    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput({ userMessage: 'Evidence test' }),
    });
    createdId = response.json().metadata.id;

    const runDir = path.join(
      server.tempDir,
      '.pinflow',
      'runs',
      '2026-04',
      '2026-04-30',
      `120000-${createdId}`,
    );
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, 'summary.json'),
      JSON.stringify(
        {
          annotationId: createdId,
          provider: 'codex',
          label: 'PinFlow Runner (codex)',
          workspaceRoot: server.tempDir,
          command: {
            command: 'codex',
            args: ['exec', '-m', 'gpt-5.5', '-'],
            promptMode: 'stdin',
          },
          runId: `120000-${createdId}`,
          runDir: path.relative(server.tempDir, runDir),
          status: 'processed',
          startedAt: '2026-04-30T12:00:00.000Z',
          finishedAt: '2026-04-30T12:00:10.000Z',
          promptPath: path.join(
            path.relative(server.tempDir, runDir),
            'prompt.md',
          ),
          contextPath: path.join(
            path.relative(server.tempDir, runDir),
            'context.json',
          ),
          transcriptPath: path.join(
            path.relative(server.tempDir, runDir),
            'transcript.log',
          ),
          diffPath: path.join(
            path.relative(server.tempDir, runDir),
            'diff.patch',
          ),
        },
        null,
        2,
      ),
      'utf8',
    );
    await writeFile(
      path.join(runDir, 'diff.patch'),
      [
        'diff --git a/src/App.tsx b/src/App.tsx',
        '--- a/src/App.tsx',
        '+++ b/src/App.tsx',
        '@@ -1 +1 @@',
        '-old',
        '+new',
        '',
      ].join('\n'),
      'utf8',
    );
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('returns latest run evidence for an annotation', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: `/api/v1/annotations/${createdId}/evidence`,
    });

    expectStatus(response, 200);
    const body = response.json();
    expect(body.found).toBe(true);
    expect(body.evidence.model).toBe('gpt-5.5');
    expect(body.evidence.contextPath).toContain('context.json');
    expect(body.evidence.hasDiff).toBe(true);
    expect(body.evidence.changedFiles).toEqual([{ path: 'src/App.tsx' }]);
    expect(body.evidence.additions).toBe(1);
    expect(body.evidence.deletions).toBe(1);
  });

  it('returns found false when no run evidence exists', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations/ann_xxxxxxxx_0000000000000/evidence',
    });

    expectStatus(response, 200);
    expect(response.json()).toEqual({
      found: false,
      annotationId: 'ann_xxxxxxxx_0000000000000',
    });
  });
});
