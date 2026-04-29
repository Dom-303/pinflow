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
});
