/**
 * Integration tests for POST /api/v1/annotations/:id/verify
 *
 * Uses real AnnotationService and ManifestReader backed by temp directories.
 * WSServer is mocked because the test harness does not bind sockets.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import {
  AnnotationStatusEnum,
  HTTP_STATUS,
  InteractionModeEnum,
  InteractionTypeEnum,
  PATHS,
  PinFlowErrorCode,
  type ManifestEntry,
} from '@pinflow/core';
import { ManifestReader } from '@pinflow/manifest';
import { registerRoute } from '../route.interface.js';
import { AnnotationService } from '../../services/annotation-service.js';
import { FileAnnotationStorage } from '../../services/storage/index.js';
import { AnnotationVerifyRoute } from './annotation-verify.route.js';
import type { WSServer } from '../../ws-server.js';
import type { AnnotationVerifyResponse } from '../../../schema.js';

function createMockWSServer(overrides?: Partial<WSServer>): WSServer {
  return {
    broadcast: vi.fn(),
    getClientCount: vi.fn().mockReturnValue(1),
    getSessions: vi.fn().mockReturnValue([]),
    requestContext: vi.fn().mockResolvedValue({
      success: true,
      rendered: true,
      elementFound: true,
      contextCaptured: true,
      elementInfo: {
        tagName: 'button',
        innerText: 'Send',
        attributes: {
          class: 'btn-primary active',
          'aria-label': 'Send',
        },
      },
    }),
    close: vi.fn(),
    ...overrides,
  };
}

describe('POST /api/v1/annotations/:id/verify', () => {
  let app: FastifyInstance;
  let tempDir: string;
  let manifestReader: ManifestReader;
  let annotationService: AnnotationService;
  let wsServer: WSServer;
  let annotationId: string;

  const entry: ManifestEntry = {
    id: 'vErFy001',
    file: 'src/components/Button.tsx',
    start: { line: 12, column: 4 },
    end: { line: 12, column: 28 },
    tagName: 'button',
    componentName: 'Button',
  };

  beforeAll(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'relay-verify-test-'));
    const manifestDir = path.dirname(path.join(tempDir, PATHS.MANIFEST_FILE));
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(
      path.join(tempDir, PATHS.MANIFEST_FILE),
      JSON.stringify(entry) + '\n',
    );

    manifestReader = new ManifestReader(tempDir);
    manifestReader.initialize();
    annotationService = new AnnotationService(
      new FileAnnotationStorage(path.join(tempDir, PATHS.ANNOTATIONS_DIR)),
    );
    await annotationService.initialize();
    wsServer = createMockWSServer();

    const annotation = await annotationService.create(
      {
        mode: InteractionModeEnum.ELEMENT_CLICK,
        interaction: {
          type: InteractionTypeEnum.ELEMENT_ANNOTATION,
          selectedElement: {
            tagName: 'button',
            selector: 'button.primary',
            dataDs: entry.id,
            innerText: 'Click me',
            attributes: { class: 'btn-primary' },
          },
        },
        context: {
          pageUrl: 'http://localhost:3000',
          pageTitle: 'Test Page',
          viewport: { width: 1280, height: 720 },
          userAgent: 'vitest',
          userMessage: 'Change the button label',
        },
      },
      [entry],
    );
    annotationId = annotation.metadata.id;
    await annotationService.updateStatus(
      annotationId,
      AnnotationStatusEnum.CLAIMED,
    );

    app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(cors, { origin: true });
    app.setErrorHandler((error: FastifyError, _request, reply) => {
      const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
      reply.status(statusCode).send({
        error: error.message,
        code: PinFlowErrorCode.DS_INTERNAL_ERROR,
        statusCode,
      });
    });

    registerRoute(AnnotationVerifyRoute, {
      app,
      annotationService,
      manifestReader,
      wsServer,
    });

    await app.ready();
  });

  afterAll(() => {
    manifestReader.close();
    app.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('re-captures runtime DOM and persists a minimal comparison', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${annotationId}/verify`,
    });

    expect(response.statusCode, response.body).toBe(200);

    const body = response.json();
    expect(body.annotationId).toBe(annotationId);
    expect(body.status).toBe('verified');
    expect(body.sourceLocation.file).toBe('src/components/Button.tsx');
    expect(body.comparison.innerText).toEqual({
      before: 'Click me',
      after: 'Send',
      changed: true,
    });
    expect(body.comparison.attributes.changedKeys).toEqual([
      'aria-label',
      'class',
    ]);
    expect(wsServer.requestContext).toHaveBeenCalledWith(entry.id);

    const annotation = await annotationService.get(annotationId);
    expect(annotation?.verification?.status).toBe('verified');
    expect(annotation?.verification?.comparison?.innerText.changed).toBe(true);
  });

  it('returns unable when no browser is connected', async () => {
    const offlineWs = createMockWSServer({
      getClientCount: vi.fn().mockReturnValue(0),
      requestContext: vi.fn(),
    });
    const route = new AnnotationVerifyRoute(
      annotationService,
      manifestReader,
      offlineWs,
    );

    const directReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn((payload) => payload),
    };
    const body = (await route.handler(
      {
        params: { id: annotationId },
      } as never,
      directReply as never,
    )) as AnnotationVerifyResponse;

    expect(body.status).toBe('unable');
    expect(body.reasons).toContain('browser_not_connected');
  });
});
