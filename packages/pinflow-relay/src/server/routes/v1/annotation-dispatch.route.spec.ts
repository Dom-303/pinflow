/**
 * Integration tests for POST /api/v1/annotations/dispatch
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createAnnotationInput,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

describe('POST /api/v1/annotations/dispatch', () => {
  let server: TestServer;

  beforeEach(async () => {
    server = await createTestServer();
  });

  afterEach(() => {
    cleanupTestServer(server);
  });

  it('releases selected queued annotations for agent pickup without claiming them', async () => {
    const firstResponse = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput({ userMessage: 'First request' }),
    });
    const secondResponse = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput({ userMessage: 'Second request' }),
    });

    const first = firstResponse.json();
    const second = secondResponse.json();

    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations/dispatch',
      payload: {
        annotationIds: [second.metadata.id, first.metadata.id],
        dispatchTarget: {
          provider: 'other',
          label: 'Aktueller Agent',
        },
      },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.dispatchedIds).toEqual([second.metadata.id, first.metadata.id]);
    expect(body.skippedIds).toEqual([]);
    expect(body.annotations).toHaveLength(2);
    expect(body.annotations[0].metadata.status).toBe('queued');
    expect(body.annotations[0].metadata.claim).toBeUndefined();
    expect(body.annotations[0].dispatch.target).toMatchObject({
      provider: 'other',
      label: 'Aktueller Agent',
    });
  });

  it('rejects empty dispatch requests', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations/dispatch',
      payload: {
        annotationIds: [],
      },
    });

    expectStatus(response, 400);
  });
});
