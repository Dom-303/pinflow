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
  RunnerHeartbeatRequestBody,
  RunnerHeartbeatRequestBodySchema,
  RunnerHeartbeatResponse,
  RunnerHeartbeatResponseSchema,
} from '../../../schema.js';
import { RunnerSessionService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class RunnerHeartbeatRoute implements RelayRoute {
  apiPath = API_PATHS.RUNNER_HEARTBEAT;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(private readonly runnerSessionService: RunnerSessionService) {}

  static register({
    app,
    runnerSessionService,
  }: {
    app: FastifyInstance;
    runnerSessionService: RunnerSessionService;
  }): void {
    const route = new RunnerHeartbeatRoute(runnerSessionService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Body: RunnerHeartbeatRequestBody;
      Reply: RunnerHeartbeatResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: RunnerHeartbeatRequestBodySchema,
        response: {
          200: RunnerHeartbeatResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Body: RunnerHeartbeatRequestBody }>,
    reply: FastifyReply<{
      Reply: RunnerHeartbeatResponse | RelayErrorResponse;
    }>,
  ): Promise<RunnerHeartbeatResponse | RelayErrorResponse> {
    try {
      const runner = this.runnerSessionService.heartbeat(request.body);

      return reply.status(HTTP_STATUS.OK).send({
        ok: true,
        runner,
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
