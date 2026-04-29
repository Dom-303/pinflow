import {
  API_PATHS,
  HTTP_STATUS,
  PinFlowError,
  PinFlowErrorCode,
  type AnnotationVerification,
} from '@pinflow/core';
import type { ManifestReader } from '@pinflow/manifest';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import {
  AnnotationVerifyRequestParams,
  AnnotationVerifyRequestParamsSchema,
  AnnotationVerifyResponse,
  AnnotationVerifyResponseSchema,
} from '../../../schema.js';
import { AnnotationService } from '../../services/index.js';
import type { WSServer } from '../../ws-server.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

type ComparableDom = NonNullable<AnnotationVerification['before']>;
type Comparison = NonNullable<AnnotationVerification['comparison']>;

export class AnnotationVerifyRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_VERIFY;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(
    private readonly annotationService: AnnotationService,
    private readonly manifestReader: ManifestReader,
    private readonly wsServer: WSServer,
  ) {}

  static register({
    app,
    annotationService,
    manifestReader,
    wsServer,
  }: {
    app: FastifyInstance;
    annotationService: AnnotationService;
    manifestReader: ManifestReader;
    wsServer: WSServer;
  }): void {
    const route = new AnnotationVerifyRoute(
      annotationService,
      manifestReader,
      wsServer,
    );
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Params: AnnotationVerifyRequestParams;
      Reply: AnnotationVerifyResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        params: AnnotationVerifyRequestParamsSchema,
        response: {
          200: AnnotationVerifyResponseSchema,
          404: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Params: AnnotationVerifyRequestParams }>,
    reply: FastifyReply<{
      Reply: AnnotationVerifyResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { id } = request.params;
      const annotation = await this.annotationService.get(id);

      if (!annotation) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          error: 'Annotation not found',
          code: PinFlowErrorCode.DS_ANNOTATION_NOTFOUND,
        });
      }

      const checkedAt = new Date().toISOString();
      const reasons: string[] = [];
      const selectedElement = annotation.interaction.selectedElement;
      const entry =
        annotation.context.manifestSnapshot?.[0] ??
        (selectedElement?.dataDs
          ? this.manifestReader.resolve(selectedElement.dataDs).entry
          : undefined);

      if (!entry) {
        reasons.push('missing_source_snapshot');
        return reply.status(HTTP_STATUS.OK).send(
          await this.persistAndBuildResponse(id, {
            status: 'unable',
            checkedAt,
            reasons,
          }),
        );
      }

      const sourceLocation = {
        file: entry.file,
        start: entry.start,
        end: entry.end,
        tagName: entry.tagName,
        componentName: entry.componentName,
      };
      const before = selectedElement
        ? this.toComparableDom(selectedElement)
        : undefined;

      if (!before) {
        reasons.push('no_comparable_element');
      }

      const clientCount = this.wsServer.getClientCount();
      if (clientCount === 0) {
        reasons.push('browser_not_connected');
        return reply.status(HTTP_STATUS.OK).send(
          await this.persistAndBuildResponse(id, {
            status: 'unable',
            checkedAt,
            reasons,
            sourceLocation,
            before,
          }),
        );
      }

      const wsResult = await this.wsServer.requestContext(entry.id);
      if (!wsResult) {
        reasons.push('runtime_timeout');
        return reply.status(HTTP_STATUS.OK).send(
          await this.persistAndBuildResponse(id, {
            status: 'unable',
            checkedAt,
            reasons,
            sourceLocation,
            before,
          }),
        );
      }

      if (wsResult.error) {
        reasons.push(
          wsResult.success === false ? 'capture_failed' : 'runtime_timeout',
        );
      }
      if (wsResult.rendered === false) {
        reasons.push('element_not_rendered');
      }
      if (wsResult.elementFound === false) {
        reasons.push('element_not_found');
      }

      const after = wsResult.elementInfo
        ? this.toComparableDom(wsResult.elementInfo)
        : undefined;
      const comparison =
        before && after ? this.compareDom(before, after) : undefined;
      if (!comparison) {
        reasons.push('no_comparable_dom');
      }

      const status =
        wsResult.rendered !== false &&
        wsResult.elementFound !== false &&
        comparison
          ? 'verified'
          : reasons.length > 0
            ? 'unable'
            : 'uncertain';

      const response = await this.persistAndBuildResponse(
        id,
        {
          status,
          checkedAt,
          reasons,
          sourceLocation,
          before,
          after,
          comparison,
        },
        {
          rendered: wsResult.rendered ?? false,
          elementFound: wsResult.elementFound,
          contextCaptured: wsResult.contextCaptured,
          domSnapshot: after,
        },
      );

      return reply.status(HTTP_STATUS.OK).send(response);
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

  private async persistAndBuildResponse(
    annotationId: string,
    verification: AnnotationVerification,
    runtime?: AnnotationVerifyResponse['runtime'],
  ): Promise<AnnotationVerifyResponse> {
    const annotation = await this.annotationService.recordVerification(
      annotationId,
      verification,
    );

    return {
      annotationId,
      ...verification,
      runtime,
      annotation,
    };
  }

  private toComparableDom(input: {
    tagName?: string;
    innerText?: string;
    attributes?: Record<string, string>;
  }): ComparableDom {
    return {
      tagName: input.tagName,
      innerText: input.innerText,
      attributes: input.attributes,
    };
  }

  private compareDom(before: ComparableDom, after: ComparableDom): Comparison {
    const beforeAttributes = before.attributes ?? {};
    const afterAttributes = after.attributes ?? {};
    const changedKeys = [
      ...new Set([
        ...Object.keys(beforeAttributes),
        ...Object.keys(afterAttributes),
      ]),
    ]
      .filter((key) => beforeAttributes[key] !== afterAttributes[key])
      .sort();

    return {
      tagName: {
        before: before.tagName,
        after: after.tagName,
        changed: before.tagName !== after.tagName,
      },
      innerText: {
        before: before.innerText,
        after: after.innerText,
        changed: before.innerText !== after.innerText,
      },
      attributes: {
        before: before.attributes,
        after: after.attributes,
        changed: changedKeys.length > 0,
        changedKeys,
      },
    };
  }
}
