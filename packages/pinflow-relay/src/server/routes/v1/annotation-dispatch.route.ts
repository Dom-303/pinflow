import {
  API_PATHS,
  HTTP_STATUS,
  PinFlowError,
  PinFlowErrorCode,
} from '@pinflow/core';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import {
  AnnotationDispatchRequestBody,
  AnnotationDispatchRequestBodySchema,
  AnnotationDispatchResponse,
  AnnotationDispatchResponseSchema,
} from '../../../schema.js';
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class AnnotationDispatchRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_DISPATCH;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(private readonly annotationService: AnnotationService) {}

  static register({
    app,
    annotationService,
  }: {
    app: FastifyInstance;
    annotationService: AnnotationService;
  }): void {
    const route = new AnnotationDispatchRoute(annotationService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Body: AnnotationDispatchRequestBody;
      Reply: AnnotationDispatchResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: AnnotationDispatchRequestBodySchema,
        response: {
          200: AnnotationDispatchResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Body: AnnotationDispatchRequestBody }>,
    reply: FastifyReply<{
      Reply: AnnotationDispatchResponse | RelayErrorResponse;
    }>,
  ): Promise<AnnotationDispatchResponse> {
    try {
      const result = await this.annotationService.releaseByIds({
        annotationIds: request.body.annotationIds,
        dispatchTarget: request.body.dispatchTarget,
      });

      return reply.status(HTTP_STATUS.OK).send({
        dispatchedIds: result.released.map(
          (annotation) => annotation.metadata.id,
        ),
        skippedIds: result.skippedIds,
        annotations: result.released,
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
