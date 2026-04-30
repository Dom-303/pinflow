/**
 * Integration tests for GET /status
 *
 * Uses real AnnotationService and ManifestReader backed by temp directories.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createManifestEntry,
  expectStatus,
  type TestServer,
} from '../__test-utils__/setup.js';

import { RELAY_VERSION } from '../../version.js';

describe('GET /status', () => {
  let server: TestServer;

  beforeAll(async () => {
    const entries = [
      createManifestEntry({ id: 'cccccccc', file: 'src/C.tsx' }),
    ];
    server = await createTestServer({
      manifestEntries: entries,
      port: 9999,
      startTime: Date.now() - 5000, // 5 seconds ago
    });
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should return 200 with relay info and real stats', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/status',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.relay.version).toBe(RELAY_VERSION);
    expect(body.relay.port).toBe(9999);
    expect(body.relay.uptime).toBeGreaterThanOrEqual(0);
    expect(body.manifest.entryCount).toBe(1);
    expect(body.manifest.fileCount).toBe(1);
    expect(body.annotations).toBeDefined();
    expect(body.annotations.queued).toBe(0);
    expect(body.browser).toEqual({
      connected: false,
      clientCount: 0,
      sessions: [],
    });
  });

  it('should include connected browser session diagnostics', async () => {
    const sessionServer = await createTestServer({
      wsServer: {
        broadcast: vi.fn(),
        getClientCount: () => 1,
        getSessions: () => [
          {
            sessionId: 'tab-web',
            route: '/dashboard',
            pageTitle: 'Dashboard',
          },
        ],
        requestContext: vi.fn(),
        close: vi.fn(),
      },
    });

    try {
      const response = await sessionServer.app.inject({
        method: 'GET',
        url: '/status',
      });

      expectStatus(response, 200);

      const body = response.json();
      expect(body.browser).toEqual({
        connected: true,
        clientCount: 1,
        sessions: [
          {
            sessionId: 'tab-web',
            route: '/dashboard',
            pageTitle: 'Dashboard',
          },
        ],
      });
    } finally {
      cleanupTestServer(sessionServer);
    }
  });

  it('should include active runner diagnostics after a heartbeat', async () => {
    const runnerServer = await createTestServer();

    try {
      const heartbeat = await runnerServer.app.inject({
        method: 'POST',
        url: '/api/v1/runners/heartbeat',
        payload: {
          runnerId: 'runner-test-1',
          provider: 'codex',
          label: 'Local Runner',
          status: 'idle',
          surface: 'terminal',
          currentRunId: '010203-ann_abc',
          currentRunDir: '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc',
          pid: 1234,
        },
      });

      expectStatus(heartbeat, 200);

      const response = await runnerServer.app.inject({
        method: 'GET',
        url: '/status',
      });

      expectStatus(response, 200);

      const body = response.json();
      expect(body.runner).toMatchObject({
        connected: true,
        activeCount: 1,
        sessions: [
          {
            runnerId: 'runner-test-1',
            provider: 'codex',
            label: 'Local Runner',
            status: 'idle',
            surface: 'terminal',
            currentRunId: '010203-ann_abc',
            currentRunDir:
              '/repo/.pinflow/runs/2026-04/2026-04-30/010203-ann_abc',
            pid: 1234,
          },
        ],
      });
    } finally {
      cleanupTestServer(runnerServer);
    }
  });
});
