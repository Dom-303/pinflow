import {
  API_PATHS,
  HTTP_STATUS,
  PinFlowError,
  PinFlowErrorCode,
} from '@pinflow/core';
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'node:path';
import {
  AnnotationRunEvidenceRequestParams,
  AnnotationRunEvidenceRequestParamsSchema,
  AnnotationRunEvidenceResponse,
  AnnotationRunEvidenceResponseSchema,
} from '../../../schema.js';
import { findLatestRunEvidence } from '../../../runner/evidence-store.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class AnnotationRunEvidenceRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_EVIDENCE;
  method: HTTPMethods = 'GET';
  version: ApiVersion = 'v1';

  constructor(private readonly workspaceRoot: string) {}

  static register({
    app,
    workspaceRoot,
  }: {
    app: FastifyInstance;
    workspaceRoot: string;
  }): void {
    const route = new AnnotationRunEvidenceRoute(workspaceRoot);
    const { apiPath, method, version, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Params: AnnotationRunEvidenceRequestParams;
      Reply: AnnotationRunEvidenceResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        params: AnnotationRunEvidenceRequestParamsSchema,
        response: {
          200: AnnotationRunEvidenceResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Params: AnnotationRunEvidenceRequestParams }>,
    reply: FastifyReply<{
      Reply: AnnotationRunEvidenceResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { id } = request.params;
      const evidence = await findLatestRunEvidence(this.workspaceRoot, id);
      return reply.status(HTTP_STATUS.OK).send({
        found: Boolean(evidence),
        annotationId: id,
        evidence: evidence ?? undefined,
      });
    } catch (error: unknown) {
      if (error instanceof PinFlowError) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          ...error.toProblemDetails(),
          error: error.message,
        });
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: errorMessage,
        code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      });
    }
  }
}
